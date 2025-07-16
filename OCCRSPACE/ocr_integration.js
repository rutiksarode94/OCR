/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCPTR Nanonet Integration(lst_vendor_bill_to_process.js)
*
* Version:         2.1.0   -   12-March-2025 -        
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script purpose is to integrate with nanonet and extract the pdf data 
                   into json format
*
* Script:          customscript_lstcptr_nanonet_integration
* Deploy:          customdeploy_lstcptr_nanonet_integration
*
*********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/file', 'N/https', 'N/log', 'N/record', 'N/search', 'N/encode', 'N/url', 'N/runtime'], 
    function(serverWidget, file, https, log, record, search, encode, url, runtime) {
        function onRequest(context) {
            try {
                var request = context.request;
                var response = context.response;
                var fileId = request.parameters.fileid || 17266;
                var recordId = request.parameters.recordid || 10;
                var accountId = runtime.accountId ;
    
                // Load the PDF file from NetSuite
                var pdfFile = file.load({ id: fileId });
                if (pdfFile.fileType !== file.Type.PDF) {
                    response.write(JSON.stringify({ error: "Invalid file type. Only PDFs are allowed." }));
                    return;
                }
                var fileName = pdfFile.name;
                var fileBase64 = pdfFile.getContents();
                var recordUrl = `https://${accountId}.app.netsuite.com/app/accounting/transactions/vendbill.nl?whence=`;
    
                var apiKey = 'f65974d2-0a0e-11f0-9c0d-fa4e7f320381';
                var modelId = '48b494dd-8aa0-4e83-934e-9a4405f7ad9f';
                var authenticationToken = getAuthenticationToken(apiKey);
    
                var NANONETS_API = {
                    KEY: apiKey,
                    MODEL_ID: modelId,
                    BASE_URL: 'https://app.nanonets.com/api/v2/OCR/Model',
                    AUTH_TOKEN: 'Basic ' + authenticationToken
                };
    
                // Handle POST request from client-side AJAX to save extracted data and JSON file
                if (request.method === 'POST') {
                    var body = JSON.parse(request.body);
                    log.debug('Received Data from Client', body);
    
                    var extractedData = body.extractedData || {};
                    var nanonetsJson = body.nanonetsJson || {}; // Full JSON response from Nanonets

                    // Save the Nanonets JSON response as a file in the File Cabinet
                    if (Object.keys(nanonetsJson).length > 0) {
                        var jsonFileName = fileName.replace('.pdf', '_nanonets_response.json');
                        var jsonFile = file.create({
                            name: jsonFileName,
                            fileType: file.Type.JSON,
                            contents: JSON.stringify(nanonetsJson, null, 2), // Pretty print JSON
                            folder: 8897 // Folder ID where the file will be saved
                        });
                        var jsonFileId = jsonFile.save();
                        log.debug('Nanonets JSON File Saved', 'File ID: ' + jsonFileId);
                    }

                    // Load and update the custom record
                    var vendorBillRecord = record.load({
                        type: 'customrecord_lstcptr_vendor_bill_process',
                        id: recordId,
                        isDynamic: true
                    });
                    
                    var jsonDataString = JSON.stringify(extractedData);
                    log.debug("Extracted Data: ", jsonDataString);
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lstcptr_extracted_json',
                        value: jsonDataString
                    });
                    
                    var subsidiary = getSubsidiary(extractedData.Subsidiary);
                    log.debug("Subsidiary: ", subsidiary);
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lstcptr_subsidiary',
                        value: subsidiary
                    });
                    
                    var vendor = getVendor(extractedData.vendor_name);
                    log.debug("Vendor: ", vendor);
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lstcptr_vendor',
                        value: vendor
                    });

                    var amount = extractedData.Line_amount;
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lstcptr_tran_amount_inc_tax',
                        value: amount
                    });
                    log.debug("Amount: ", amount);

                    var billNumber = extractedData.billnumber;
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lstcptr_bill_number',
                        value: billNumber
                    });
                    log.debug("Bill Number: ", billNumber);

                    var status = getStatus(extractedData.status);
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lstcptr_process_status',
                        value: status
                    });
                    log.debug("Status: ", status);
                    if (jsonFileId) {
                        // Load the file from the File Cabinet to get its details
                        var jsonFile = file.load({
                            id: jsonFileId
                        });
                        log.debug('Loaded JSON File', 'Name: ' + jsonFile.name + ', Size: ' + jsonFile.size + ' bytes');
                
                        // Attach the file to the record (this populates the mediaitem sublist)
                        record.attach({
                            record: {
                                type: 'file',
                                id: jsonFile.id // Use the file ID from the loaded file
                            },
                            to: {
                                type: 'customrecord_lstcptr_vendor_bill_process',
                                id: recordId
                            }
                        });
                        log.debug('File Attached to Record', 'File: ' + jsonFile.name + ' attached to Record ID: ' + recordId);
                    }
                    
                    var updatedRecordId = vendorBillRecord.save();
                    log.debug("Updated Record ID: ", updatedRecordId);
    
                    // Create Vendor Bill record
                    var billRecord = record.create({
                        type: record.Type.VENDOR_BILL,
                        isDynamic: true 
                    });
                    billRecord.setValue({ fieldId: 'entity', value: vendor });
                    billRecord.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    billRecord.setValue({ fieldId: 'tranid', value: billNumber });
                    billRecord.setValue({ fieldId: 'usertotal', value: amount });
                    billRecord.setValue({ fieldId: 'location', value: 25 });
                    var billId = billRecord.save();
                    log.debug("Bill Record Created Successfully ", billId);

                    response.write(JSON.stringify({ success: true, recordId: updatedRecordId, jsonFileId: jsonFileId }));
                    return;
                }
    
                // Render the page with client-side upload
                response.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Vendor Bill</title>
                        <style>
                            .split-container { display: flex; height: 100vh; }
                            .left-panel, .right-panel { width: 50%; padding: 10px; box-sizing: border-box; }
                            .left-panel { border-right: 1px solid #ccc; }
                            iframe { width: 100%; height: 100%; border: none; }
                            #uploadStatus { margin-top: 10px; }
                            .extracted-data { margin-top: 10px; font-family: monospace; }
                            .hidden { display: none; }
                        </style>
                        <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
                        <script>
                            document.addEventListener('DOMContentLoaded', function() {
                                uploadFile();
                            });
    
                            async function uploadFile() {
                                try {
                                    console.log('Starting uploadFile');
                                    document.getElementById('uploadStatus').innerHTML = 'Uploading file to Nanonets...';
    
                                    const base64File = "data:application/pdf;base64,${fileBase64}";
                                    const fileName = "${fileName}";
    
                                    // Convert Base64 to Blob
                                    const byteCharacters = atob(base64File.split(',')[1]);
                                    const byteNumbers = new Array(byteCharacters.length);
                                    for (let i = 0; i < byteCharacters.length; i++) {
                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
                                    // Prepare form data
                                    var formData = new FormData();
                                    formData.append('file', blob, fileName);
    
                                    console.log('Sending request to Nanonets');
                                    const response = await fetch("${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile", {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': "${NANONETS_API.AUTH_TOKEN}"
                                        },
                                        body: formData
                                    });
    
                                    const responseData = await response.json();
                                    console.log('Nanonets Full Response:', JSON.stringify(responseData, null, 2));
    
                                    if (!response.ok) {
                                        throw new Error(responseData.message || 'Upload failed to Nanonets');
                                    }
    
                                    if (response.status === 200) {
                                        console.log('Upload to Nanonets successful, processing JSON');
                                        const ocrData = responseData;
    
                                        // Extract values from the JSON
                                        let extractedData = {
                                            transactiontype: '',
                                            vendor_name: '',
                                            Subsidiary: '',
                                            status: '',
                                            billnumber: '',
                                            Line_amount: '',
                                            dueDate: ''
                                        };
    
                                        if (ocrData.result && ocrData.result.length > 0) {
                                            const predictions = ocrData.result[0].prediction;
                                            console.log('Predictions Array:', JSON.stringify(predictions, null, 2));
                                            predictions.forEach(field => {
                                                console.log('Processing field:', field);
                                                if (field.label === 'Transaction Type') extractedData.transactiontype = field.ocr_text || '';
                                                if (field.label === 'Vendor') extractedData.vendor_name = field.ocr_text || '';
                                                if (field.label === 'Subsidiary') extractedData.Subsidiary = field.ocr_text || '';
                                                if (field.label === 'Status') extractedData.status = field.ocr_text || '';
                                                if (field.label === 'BillNumber') extractedData.billnumber = field.ocr_text || '';
                                                if (field.label === 'Amount') extractedData.Line_amount = field.ocr_text || '';
                                                if (field.label === 'DueDate') extractedData.dueDate = field.ocr_text || '';
                                            });
                                        } else {
                                            console.log('No predictions found in response');
                                        }
    
                                        console.log('Extracted Data:', extractedData);
    
                                        document.getElementById('extractedData').innerHTML = 
                                            'Extracted Data:\\n' +
                                            'Transaction Type: ' + extractedData.transactiontype + '\\n' +
                                            'Vendor: ' + extractedData.vendor_name + '\\n' +
                                            'Subsidiary: ' + extractedData.Subsidiary + '\\n' +
                                            'Status: ' + extractedData.status + '\\n' +
                                            'BillNumber: ' + extractedData.billnumber + '\\n' +
                                            'Amount: ' + extractedData.Line_amount + '\\n' +
                                            'DueDate: ' + extractedData.dueDate;
    
                                        // Send extracted data and full Nanonets JSON to the Suitelet
                                        await $.ajax({
                                            url: "${url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId })}",
                                            type: 'POST',
                                            contentType: 'application/json',
                                            data: JSON.stringify({ 
                                                extractedData: extractedData, 
                                                nanonetsJson: responseData, // Send full JSON response
                                                recordId: ${recordId} 
                                            }),
                                            success: function(response) {
                                                console.log('Data and JSON saved:', response);
                                                document.getElementById('uploadStatus').innerHTML = 'Upload and save successful!';
                                            },
                                            error: function(xhr, status, error) {
                                                console.error('Error saving data:', error);
                                                document.getElementById('uploadStatus').innerHTML = '<div style="color: red;">Failed to save data: ' + error + '</div>';
                                            }
                                        });
                                    } else {
                                        throw new Error('Unexpected status: ' + response.status);
                                    }
                                } catch (error) {
                                    console.error('Upload Error:', error);
                                    document.getElementById('uploadStatus').innerHTML = '<div style="color: red;">Upload failed: ' + error.message + '</div>';
                                }
                            }
                        </script>
                    </head>
                    <body>
                        <div class="split-container">
                            <div class="left-panel">
                                <iframe src="${pdfFile.url}"></iframe>
                            </div>
                            <div class="right-panel">
                                <iframe src="${recordUrl}"></iframe>
                                <div id="uploadStatus"></div>
                                <div id="extractedData" class="extracted-data"></div>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
    
            } catch (e) {
                log.error('Error in Suitelet', e);
                context.response.write(JSON.stringify({ error: e.message }));
            }
        }
    
        function getAuthenticationToken(apiKey) {
            try {
                return encode.convert({
                    string: apiKey + ":",
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                });
            } catch (error) {
                log.error('getAuthenticationToken Error', error);
                return '';
            }
        }

        function getSubsidiary(name) {
            if (!name) return null;
            var subsidiarySearch = search.create({
                type: 'subsidiary',
                filters: [['name', 'is', name]],
                columns: ['internalid']
            });
            var result = subsidiarySearch.run().getRange({ start: 0, end: 1 });
            return result.length > 0 ? result[0].getValue('internalid') : null;
        }
        
        function getVendor(name) {
            if (!name) return null;
            var vendorSearch = search.create({
                type: 'vendor',
                filters: [['entityid', 'is', name]],
                columns: ['internalid']
            });
            var result = vendorSearch.run().getRange({ start: 0, end: 1 });
            return result.length > 0 ? result[0].getValue('internalid') : null;
        }

        function getStatus(name) {
            if (!name) return null;
            try {
                var statusSearch = search.create({
                    type: 'customlist_lstcptr_process_status',
                    filters: [['name', 'is', name]],
                    columns: ['internalid']
                });
                var result = statusSearch.run().getRange({ start: 0, end: 1 });
                return result.length > 0 ? result[0].getValue('internalid') : null;
            } catch (error) {
                log.error({ title: 'Error in getStatus', details: error });
                return null;
            }
        }
    
        return {
            onRequest: onRequest
        };
    });