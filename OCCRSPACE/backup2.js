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
                var accountId = runtime.accountId || "tstdrv1423092";
    
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
    
                // Handle POST request from client-side AJAX to save extracted data
                if (request.method === 'POST') {
                    var body = JSON.parse(request.body);
                    log.debug('Received Extracted Data from Client', body);
    
                    var extractedData = body.extractedData || {};
                    var vendorBillRecord = record.load({
                        type: 'customrecord_lst_vendor_bill_to_process',
                        id: recordId,
                        isDynamic: true
                    });
                    
                    var jsonDataString = JSON.stringify(extractedData);
                    log.debug("Extracted Data: ", jsonDataString);
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lst_extracted_json',
                        value: jsonDataString
                    });
                    
                    var subsidiary = getSubsidiary(extractedData.Subsidiary); // Corrected to lowercase 'subsidiary'
                    log.debug("Subsidiary: ", subsidiary);
                    vendorBillRecord.setValue({
                        fieldId: 'custrecord_lst_subsidiary',
                        value: subsidiary
                    });
                    
                    var vendor = getVendor(extractedData.vendor_name); // Corrected to lowercase 'vendor'
                    log.debug("Vendor: ", vendor);
                    vendorBillRecord.setValue({ // Added .setValue
                        fieldId: 'custrecord_lst_vendor',
                        value: vendor
                    });

                    var amount = extractedData.Line_amount;
                    vendorBillRecord.setValue({
                        fieldId:'custrecord_lst_tran_amount_inc_tax',
                        value: amount
                    });
                    log.debug("Amount: ", amount);

                    var billNumber = extractedData.billnumber;
                    vendorBillRecord.setValue({
                        fieldId:'custrecord_st_bill_number',
                        value:billNumber
                    });
                    log.debug("Bill Number: ", billNumber);

                    var status = getStatus(extractedData.status);
                    vendorBillRecord.setValue({
                        fieldId:'custrecord_lst_process_status',
                        value:status
                    });
                    log.debug("Status: ", status);
                    
                    var updatedRecordId = vendorBillRecord.save();
                    log.debug("Updated Record ID: ", updatedRecordId);
    
                    var billRecord = record.create({
                        type: record.Type.VENDOR_BILL, // Use standard NetSuite type
                        isDynamic: true 
                    });
                    billRecord.setValue({
                        fieldId:'entity',
                        value:vendor
                    });
                    billRecord.setValue({
                        fieldId:'subsidiary',
                        value:subsidiary
                    });
                    billRecord.setValue({
                        fieldId:'tranid',
                        value:billNumber
                    })
                    billRecord.setValue({
                        fieldId:'usertotal',
                        value:amount
                    });
                    billRecord.setValue({
                        fieldId:'location',
                        value:25
                    });
                    var billId = billRecord.save();
                    log.debug("Bill Record Created Successfullly ", billId);
                   // response.write(JSON.stringify({ success: true, recordId: updatedRecordId }));
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
                             .hidden {display: none; }
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
                                    console.log('Nanonets Full Response:', JSON.stringify(responseData, null, 2)); // Log full response
    
                                    if (!response.ok) {
                                        throw new Error(responseData.message || 'Upload failed to Nanonets');
                                    }
    
                                    if (response.status === 200) {
                                        console.log('Upload to Nanonets successful, processing JSON');
                                        const ocrData = responseData;
    
                                        // Extract values from the JSON
                                        let extractedData = {
                                            transactiontype: '',
                                            Vendor: '',
                                            Subsidiary: '',
                                            status: '',
                                            billnumber: '',
                                            Line_amount: '',
                                            dueDate: ''
                                        };
    
                                        // Log predictions array specifically
                                        if (ocrData.result && ocrData.result.length > 0) {
                                            const predictions = ocrData.result[0].prediction;
                                            console.log('Predictions Array:', JSON.stringify(predictions, null, 2));
                                            predictions.forEach(field => {
                                                console.log('Processing field:', field); // Log each field
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
    
                                        console.log('Extracted Data:', extractedData); // Log final extracted data
    
                                        // Display extracted values in the UI
                                        //document.getElementById('uploadStatus').innerHTML = 'Upload successful!';
                                        document.getElementById('extractedData').innerHTML = 
                                            'Extracted Data:\\n' +
                                            'Transaction Type: ' + extractedData.transactiontype + '\\n' +
                                            'Vendor: ' + extractedData.vendor_name + '\\n' +
                                            'subsidiary: ' + extractedData.Subsidiary + '\\n' +
                                            'Status: ' + extractedData.status + '\\n' +
                                            'BillNumber: ' + extractedData.billnumber + '\\n' +
                                            'Amount: ' + extractedData.Line_amount + '\\n' +
                                            'DueDate: ' + extractedData.dueDate;
    
                                        // Send extracted data back to the Suitelet
                                        await $.ajax({
                                            url: "${url.resolveScript({ scriptId: runtime.getCurrentScript().id, deploymentId: runtime.getCurrentScript().deploymentId })}",
                                            type: 'POST',
                                            contentType: 'application/json',
                                            data: JSON.stringify({ extractedData: extractedData, recordId: ${recordId} }),
                                            success: function(response) {
                                                // console.log('Data saved to record:', response);
                                                //document.getElementById('uploadStatus').innerHTML += ' Data saved to record!';
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
                               <div id="uploadStatus" class="hidden"></div>
                               <div id="extractedData" class="hidden extracted-data"></div>
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
            if (!name) return null; // Return null if no name is provided
        
            var subsidiarySearch = search.create({
                type: 'subsidiary',
                filters: [['name', 'is', name]], // Use 'name' instead of 'entityid'
                columns: ['internalid'] // Correct column name
            });
        
            var result = subsidiarySearch.run().getRange({ start: 0, end: 1 });
            if (result.length > 0) {
                return result[0].getValue('internalid'); // Return the internal ID
            }
            return null; // Return null if no subsidiary is found
        }
        
        function getVendor(name) {
            if (!name) return null; // Return null if no name is provided
        
            var vendorSearch = search.create({
                type: 'vendor', // Corrected from 'subsidiary' to 'vendor'
                filters: [['entityid', 'is', name]], // Correct filter syntax for vendors
                columns: ['internalid'] // Correct column name
            });
        
            var result = vendorSearch.run().getRange({ start: 0, end: 1 });
            if (result.length > 0) {
                return result[0].getValue('internalid'); // Return the internal ID
            }
            return null; // Return null if no vendor is found
        }
        function getStatus(name) {
            if (!name) return null; // Return null if no name is provided
        
            try {
                var statusSearch = search.create({
                    type: 'customlist_lst_process_status', // Custom list type
                    filters: [['name', 'is', name]], // Filter by name
                    columns: ['internalid'] // Retrieve internal ID
                });
        
                var result = statusSearch.run().getRange({ start: 0, end: 1 });
                if (result && result.length > 0) {
                    return result[0].getValue('internalid'); // Return the internal ID
                }
            } catch (error) {
                log.error({ title: 'Error in getStatus', details: error });
            }
            return null; // Return null if no match is found or an error occurs
        }
    
        return {
            onRequest: onRequest
        };
    });