/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LST Email Capture Plugin (emaillcapture_for_record.js)
*
* Version:         2025.1.0   -   25-Apr-2025  -   Added customrecord_lstcptr_vendor_bill_process
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script processes get the fileId at edit mode and ,
*                  sends all attachments to Nanonets for OCR, and attaches files to custrecord_lstcptr_email_pdf_attachment.
*
* Script:          customscript_lstcptr_bill_process_ue
* Deploy:          customdeploy_lstcptr_bill_process_ue
*
* Notes:           Supports all NetSuite file types for Nanonets upload and record attachment.
*
*********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/https', 'N/search', 'N/record', 'N/file', 'N/runtime', 'N/ui/serverWidget', 'N/encode'],
    /**
     * @param {url} url
     * @param {https} https
     * @param {search} search
     * @param {record} record
     * @param {file} file
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     * @param {encode} encode
     */
    function(url, https, search, record, file, runtime, serverWidget, encode) {
        const DEBUG_TITLE = 'nanonets_upload_file_ue';

        /**
         * Executes before the record is loaded, adding an inline HTML field for Nanonets file upload.
         * @param {Object} context
         * @param {string} context.type - The event type (e.g., view, edit)
         * @param {Record} context.newRecord - The current record
         * @param {Form} context.form - The current form
         */
        function beforeLoad(context) {
            const debugTitle = `${DEBUG_TITLE}:beforeLoad`;
            const { type, newRecord, form } = context;
            const recId = newRecord.id;
            const recType = newRecord.type;

            if (!isThereValue(recId) || type !== context.UserEventType.VIEW || runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {

            try {
                log.debug({ title: debugTitle, details: `Record Id: ${recId}, Record Type: ${recType}` });
                const fileId = newRecord.getValue({ fieldId: 'custrecord_lstcptr_pdf_file' });

                // Check if fileId exists
                if (!isThereValue(recId && fileId)) {
                    log.debug({ title: debugTitle, details: 'No Record ID & file ID found, skipping Nanonets upload.' });
                    return;
                }

                // Load the file from NetSuite
                let fileObj;
                try {
                    fileObj = file.load({ id: fileId });
                    log.debug({ title: debugTitle, details: `File loaded: ${fileObj.name}` });
                } catch (e) {
                    log.error({ title: debugTitle, details: `Failed to load file with ID ${fileId}: ${e.message}` });
                    return;
                }

                // Retrieve Nanonets API credentials
                let response;
                try {
                    response = https.requestSuitelet({
                        scriptId: 'customscript_lstcptr_sent_file_sl',
                        deploymentId: 'customdeploy_lstcptr_sent_file_sl',
                        method: https.Method.GET,
                        urlParams: { apiCredentials: 'Yes' },
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    log.error({ title: debugTitle, details: `Suitelet request failed: ${e.message}` });
                    return;
                }

                const responseCode = response.code;
                log.debug({ title: debugTitle, details: `Suitelet responseCode: ${responseCode}` });

                if (responseCode === 200) {
                    let apiCredentials;
                    try {
                        apiCredentials = JSON.parse(response.body);
                        log.debug({ title: debugTitle, details: `apiCredentials: ${JSON.stringify(apiCredentials)}` });
                    } catch (e) {
                        log.error({ title: debugTitle, details: `Failed to parse Suitelet response: ${e.message}` });
                        return;
                    }

                    const apiKey = apiCredentials.apiKey;
                    const modelId = apiCredentials.modelId;

                    if (!isThereValue(apiKey) || !isThereValue(modelId)) {
                        log.error({ title: debugTitle, details: 'Missing API key or model ID in Suitelet response.' });
                        return;
                    }

                    const authToken = 'Basic ' + encode.convert({
                        string: apiKey + ':',
                        inputEncoding: encode.Encoding.UTF_8,
                        outputEncoding: encode.Encoding.BASE_64
                    });

                    // Add inline HTML field for uploading file to Nanonets
                    const nanonetsUploadField = form.addField({
                        id: 'custpage_nanonets_upload',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Nanonets Upload File'
                    });
                    log.debug({ title: debugTitle, details: 'Inline HTML field added.' });

                    const fileName = fileObj.name;
                    const fileContent = fileObj.getContents();

                    const requestSuiteletUrl = url.resolveScript({
                        scriptId: 'customscript_lstcptr_sent_file_sl',
                        deploymentId: 'customdeploy_lstcptr_sent_file_sl'
                    });

                    // Construct HTML for file upload and Nanonets API call
                    const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
                            <script>
                                var contentType = "application/pdf";
                                var b64Data = "${fileContent}";

                                var blobFile = b64toBlob(b64Data, contentType);
                                var formData = new FormData();
                              //  formData.append("file", blobFile, "${fileName}");
                                 nFormData.append("file", blobFile);

                                jQuery.ajax({
                                    url: "https://app.nanonets.com/api/v2/OCR/Model/${modelId}/LabelFile",
                                    type: "POST",
                                    data: formData,
                                    headers: {
                                        "Authorization": "${authToken}"
                                    },
                                    cache: false,
                                    contentType: false,
                                    processData: false,
                                    success: function(data) {
                                        jQuery.ajax({
                                            url: "${requestSuiteletUrl}",
                                            type: "POST",
                                            dataType: "json",
                                            contentType: "application/json",
                                            success: function(response) {
                                                console.log("Suitelet success: " + JSON.stringify(response));
                                            },
                                            error: function(xhr, status, error) {
                                                console.log("Suitelet error: " + JSON.stringify(xhr));
                                            },
                                            data: JSON.stringify({
                                                "recordId": "${recId}",
                                                "recordType": "${recType}",
                                                "success": data
                                            })
                                        });
                                    },
                                    error: function(xhr, status, error) {
                                        jQuery.ajax({
                                            url: "${requestSuiteletUrl}",
                                            type: "POST",
                                            dataType: "json",
                                            contentType: "application/json",
                                            success: function(response) {
                                                console.log("Suitelet success: " + JSON.stringify(response));
                                            },
                                            error: function(xhr, status, error) {
                                                console.log("Suitelet error: " + JSON.stringify(xhr));
                                            },
                                            data: JSON.stringify({
                                                "recordId": "${recId}",
                                                "recordType": "${recType}",
                                                "error": xhr.responseText || "Unknown error"
                                            })
                                        });
                                    }
                                });

                                function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
                                    try {
                                        var byteCharacters = atob(b64Data);
                                        var byteArrays = [];
                                        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                                            var slice = byteCharacters.slice(offset, offset + sliceSize);
                                            var byteNumbers = new Array(slice.length);
                                            for (var i = 0; i < slice.length; i++) {
                                                byteNumbers[i] = slice.charCodeAt(i);
                                            }
                                            var byteArray = new Uint8Array(byteNumbers);
                                            byteArrays.push(byteArray);
                                        }
                                        return new Blob(byteArrays, { type: contentType });
                                    } catch (e) {
                                        console.error("b64toBlob error: " + e.message);
                                        throw e;
                                    }
                                }
                            </script>
                        </head>
                        <body>
                        </body>
                        </html>
                    `;
                    nanonetsUploadField.defaultValue = htmlContent;
                    log.debug({ title: debugTitle, details: 'HTML content set for Nanonets upload.' });
                } else {
                    log.error({
                        title: debugTitle,
                        details: `Failed to retrieve Nanonets API credentials. HTTP Code: ${responseCode}`
                    });
                }
            } catch (err) {
                log.error({
                    title: `${debugTitle} Error`,
                    details: JSON.stringify({ error: { code: err.name, message: err.message } })
                });
            }
        }
        }

        /**
         * Checks if a value exists.
         * @param {any} value - The value to check
         * @returns {boolean} - True if value exists, false otherwise
         */
        function isThereValue(value) {
            return value != null && value !== 'null' && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN' && value !== ' ';
        }

        return {
            beforeLoad: beforeLoad
        };
    });