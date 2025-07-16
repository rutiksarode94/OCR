/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCPTR Manually Upload File (lstcptr_manually_upload_sl.js)
 *
 * Version:         1.1.0   -   12-March-2025 - RS      Initial Development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Suitelet to handle manual file uploads and send to Nanonets for processing.
 *
 * Script:          customscript_lstcptr_manually_uploadfile
 * Deploy:          customdeploy_lstcptr_manually_uploadfile
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/file', 'N/record', './lstcptr_manually_upload_utils'], 
    function (serverWidget, runtime, file, record, utils) {
        var strDebugTitle = "lstcptr_manually_upload_sl";
        var licenseStatus = '';
        var apiKey = '';
        var modelId = '';
        var authenticationToken = '';

        function onRequest(context) {
            var request = context.request;
            var response = context.response;
            var nUserObj = runtime.getCurrentUser();
            var nCurrentUserId = nUserObj.id;
            var nUserRoleId = nUserObj.role;
            var nUserName = nUserObj.name;
            var accountId = runtime.accountId;

            log.debug({ title: strDebugTitle, details: "nCurrentUserId : " + nCurrentUserId + " || nUserRoleId : " + nUserRoleId + " || nUserName : " + nUserName });

            var clientLicenseDetails = utils.checkLicenseStatus(accountId);
            var lstCaptureLicenseDetails = utils.getSTCaptureLicenseDetails();

            if (utils.isValidString(clientLicenseDetails)) {
                licenseStatus = clientLicenseDetails.licenseStatus;
            }

            if (utils.isValidString(lstCaptureLicenseDetails)) {
                apiKey = lstCaptureLicenseDetails.apiKey;
                modelId = lstCaptureLicenseDetails.modelId;
            }

            if (utils.isValidString(apiKey)) {
                authenticationToken = utils.getAuthenticationToken(apiKey);
            }

            var NANONETS_API = {
                KEY: apiKey,
                MODEL_ID: modelId,
                BASE_URL: 'https://app.nanonets.com/api/v2/OCR/Model',
                AUTH_TOKEN: 'Basic ' + authenticationToken
            };

            if (context.request.method === 'GET') {
                let form = serverWidget.createForm({ title: 'Upload Multiple Files to Process' });

                let htmlField = form.addField({
                    id: 'custpage_upload',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Upload Files'
                });

                var subsidiaries = utils.getSubsidiaryOptions();
                var vendors = utils.getAllVendors();

                // Load the HTML content from the File Cabinet (assumes lstcptr_upload_file.html is uploaded to File Cabinet)
                var htmlFile = file.load({ id: 'SuiteScripts/LST Capture/lstcptr_upload_file.html' }); // Adjust file path as needed
                var htmlContent = htmlFile.getContents()
                    .replace('{{subsidiaries}}', JSON.stringify(subsidiaries))
                    .replace('{{vendors}}', JSON.stringify(vendors))
                    .replace('{{nanonetsBaseUrl}}', NANONETS_API.BASE_URL)
                    .replace('{{nanonetsModelId}}', NANONETS_API.MODEL_ID)
                    .replace('{{nanonetsAuthToken}}', NANONETS_API.AUTH_TOKEN)
                    .replace('{{accountId}}', accountId);

                htmlField.defaultValue = htmlContent;

                context.response.writePage(form);
            } else if (context.request.method === 'POST') {
                try {
                    let files = context.request.files;
                    let parameters = context.request.parameters;

                    let uploadedFiles = Object.values(files).filter(file => file && ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'docx'].includes(file.name.split('.').pop().toLowerCase()));
                    let subsidiaryId = parameters['subsidiaryId'] || '';
                    let vendorId = parameters['vendorId'] || '';
                    let extractedData = parameters['extractedData'] ? JSON.parse(parameters['extractedData']) : null;
                    let nanonetsJson = parameters['nanonetsJson'] ? JSON.parse(parameters['nanonetsJson']) : null;

                    if (uploadedFiles.length === 0) {
                        log.error("Missing required field: File");
                        context.response.write(JSON.stringify({ success: false, message: "Please upload at least one file (PDF, PNG, JPG, JPEG, TIFF, DOCX)" }));
                        return;
                    }

                    let recordIds = [];
                    for (let uploadedFile of uploadedFiles) {
                        let newRecord = record.create({ type: 'customrecord_lstcptr_vendor_bill_process' });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_subsidiary', value: subsidiaryId || null });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_vendor', value: vendorId || null });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_provider', value: 1 });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_process_status', value: 4 });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_transaction_type', value: 1 });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_date_sent_to_ocr', value: new Date() });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_tran_amount_inc_tax', value: 0 });

                        let recordId = newRecord.save();
                        log.debug("Record Created Successfully", recordId);
                        recordIds.push(recordId);

                        uploadedFile.folder = 8896;
                        uploadedFile.name = `${recordId}_${uploadedFile.name}`;
                        let fileId = uploadedFile.save();
                        log.debug("File saved to file cabinet", `File ID: ${fileId}, Name: ${uploadedFile.name}`);

                        var fileObj = file.load({ id: fileId });
                        var fileUrl = fileObj.url;
                        log.debug("File URL: ", fileUrl);

                        let updatedRecord = record.load({ type: 'customrecord_lstcptr_vendor_bill_process', id: recordId });
                        updatedRecord.setValue({ fieldId: 'custrecord_lstcptr_pdf_file', value: fileId });
                        updatedRecord.setValue({ fieldId: 'custrecord_lstcptr_file_id', value: fileId });
                        updatedRecord.setValue({ fieldId: 'custrecord_lstcptr_file_url', value: fileUrl || '' });
                        updatedRecord.save();
                        log.debug("Record Updated with File ID and URL", `Record ID: ${recordId}, File ID: ${fileId}`);

                        if (fileId) {
                            uploadedFile = file.load({ id: fileId });
                            log.debug('Loaded File', 'Name: ' + uploadedFile.name + ', Size: ' + uploadedFile.size + ' bytes');

                            record.attach({
                                record: { type: 'file', id: uploadedFile.id },
                                to: { type: 'customrecord_lstcptr_vendor_bill_process', id: recordId }
                            });
                            log.debug('File Attached to Record', 'File: ' + uploadedFile.name + ' attached to Record ID: ' + recordId);
                        }

                        if (nanonetsJson) {
                            log.debug('Raw Nanonets JSON:', JSON.stringify(nanonetsJson, null, 2));

                            let formattedLineItems = [];
                            if (nanonetsJson && nanonetsJson.result && nanonetsJson.result.length > 0) {
                                const predictions = nanonetsJson.result[0].prediction;
                                predictions.forEach(item => {
                                    if (item.label === 'table' && item.cells) {
                                        item.cells.forEach(cell => {
                                            if (cell.label.toLowerCase().includes('description') || cell.label.toLowerCase().includes('item')) {
                                                formattedLineItems.push({
                                                    label: 'description',
                                                    text: cell.text || ''
                                                });
                                            } else if (cell.label.toLowerCase().includes('amount') || cell.label.toLowerCase().includes('line_amount')) {
                                                formattedLineItems.push({
                                                    label: 'amount',
                                                    text: cell.text || ''
                                                });
                                            }
                                        });
                                    }
                                });
                            }

                            let pairedLineItems = utils.pairLineItems(formattedLineItems);
                            log.debug('Paired Line Items:', JSON.stringify(pairedLineItems, null, 2));
                        }
                    }

                    context.response.write(JSON.stringify({
                        success: true,
                        recordIds: recordIds,
                        error: null,
                        redirectUrl: `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_manually_uploadfile&deploy=customdeploy_lstcptr_manually_uploadfile&whence=`
                    }));
                } catch (error) {
                    log.error({ title: 'Error in POST', details: error });
                    context.response.write(JSON.stringify({
                        success: false,
                        recordIds: [],
                        error: error.message
                    }));
                }
            }
        }

        return { onRequest: onRequest };
    });