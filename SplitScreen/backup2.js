/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            Vendor Bill Split-Screen (split_screen_su.js)
 *
 * Version:         1.0.0   -   22-July-2025 - RS   Initial Development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This script displays a split-screen interface for viewing supported file types and vendor bill details.
 *
 * Script:          customscript_lstcptr_split_screen_su
 * Deploy:          customdeploy_lstcptr_split_screen_su
 *
 * Dependency:      ./lstcptr_constants.js
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/url', 'N/search', 'N/runtime', './lstcptr_constants'], 
function (serverWidget, record, file, url, search, runtime, constants) {
    const strDebugTitle = constants.SPLIT_SCREEN_SUITELET_DEBUG_TITLE;

    function onRequest(context) {
        const request = context.request;
        const response = context.response;
        const accountId = runtime.accountId;

        if (request.method === 'POST') {
            try {
                log.debug({ title: `${strDebugTitle} - Inside POST`, details: 'Processing POST request' });
                const recordId = request.parameters.internalId;
                const requestData = {
                    transactionType: request.parameters.custrecord_lstcptr_tran_type,
                    subsidiary: request.parameters.subsidiary,
                    vendor: request.parameters.vendor,
                    amount: request.parameters.custrecord_lstcptr_amount,
                    memo: request.parameters.custrecord_lstcptr_memo
                };

                if (!recordId) {
                    throw new Error('🚨 ERROR: Record ID is missing in POST request.');
                }

                log.debug({ title: `${strDebugTitle} - POST Request Parameters`, details: JSON.stringify(request.parameters) });
                log.debug("Internal ID:", request.parameters.internalId);
                log.debug("Transaction Type:", request.parameters[transactionTypeField]);
                log.debug("Subsidiary:", request.parameters[subsidiaryField]);
                log.debug("Vendor:", request.parameters[vendorField]);
                log.debug("Amount:", request.parameters[amountField]);
                log.debug("Memo:", request.parameters[memoField]);
                log.debug({ title: `${strDebugTitle} - POST Request Data`, details: JSON.stringify(requestData) });
                log.debug({ title: `${strDebugTitle} - Received Record ID`, details: recordId });

                const savedRecordId = saveTransaction(requestData, recordId);

                if (!savedRecordId) {
                    throw new Error('Record ID is undefined after save.');
                }

                log.debug({ title: `${strDebugTitle} - Redirecting to Saved Record`, details: `ID: ${savedRecordId}` });

                const redirectUrl = url.resolveScript({
                    scriptId: constants.VENDOR_BILL_PROCESS_SUITELET.SCRIPT_ID,
                    deploymentId: constants.VENDOR_BILL_PROCESS_SUITELET.DEPLOYMENT_ID
                });

                response.setHeader({ name: 'Content-Type', value: 'application/json' });
                response.write(JSON.stringify({
                    success: true,
                    redirectUrl: redirectUrl
                }));
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error Saving Transaction`, details: error.message });
                response.setHeader({ name: 'Content-Type', value: 'application/json' });
                response.write(JSON.stringify({ success: false, message: error.message }));
            }
            return;
        }

        const recordId = request.parameters.internalId;
        log.debug({ title: `${strDebugTitle} - Record ID`, details: recordId });

        if (!recordId) {
            response.write('No record ID provided');
            return;
        }

        const vendorBillRecord = record.load({
            type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
            id: recordId
        });

        const fileId = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE });
        log.debug({ title: `${strDebugTitle} - File ID`, details: fileId });

        let fileDisplayHtml = '';
        if (fileId) {
            try {
                const fileObj = file.load({ id: fileId });
                const fileUrl = fileObj.url;
                const fileType = fileObj.fileType;
                const fileName = fileObj.name;
                log.debug({ title: `${strDebugTitle} - File Details`, details: { url: fileUrl, type: fileType, name: fileName } });

                const mimeTypeMap = {
                    [file.Type.PDF]: 'application/pdf',
                    [file.Type.PNG]: 'image/png',
                    [file.Type.JPG]: 'image/jpeg',
                    [file.Type.JPEG]: 'image/jpeg',
                    [file.Type.GIF]: 'image/gif',
                    [file.Type.BMP]: 'image/bmp',
                    [file.Type.TIFF]: 'image/tiff',
                    [file.Type.ICON]: 'image/x-icon',
                    [file.Type.SVG]: 'image/svg+xml',
                    [file.Type.HTML]: 'text/html',
                    [file.Type.CSS]: 'text/css',
                    [file.Type.JAVASCRIPT]: 'application/javascript',
                    [file.Type.JSON]: 'application/json',
                    [file.Type.CSV]: 'text/csv',
                    [file.Type.PLAINTEXT]: 'text/plain',
                    [file.Type.RTF]: 'application/rtf',
                    [file.Type.XML]: 'application/xml',
                    [file.Type.MP3]: 'audio/mpeg',
                    [file.Type.MP4]: 'audio/mp4',
                    [file.Type.MOV]: 'video/quicktime',
                    [file.Type.FLASH]: 'application/x-shockwave-flash',
                    [file.Type.WORD]: 'application/msword',
                    [file.Type.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    [file.Type.EXCEL]: 'application/vnd.ms-excel',
                    [file.Type.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    [file.Type.PPT]: 'application/vnd.ms-powerpoint',
                    [file.Type.MPP]: 'application/vnd.ms-project',
                    [file.Type.VSDX]: 'application/vnd.visio',
                    [file.Type.POSTSCRIPT]: 'application/postscript',
                    [file.Type.TAR]: 'application/x-tar',
                    [file.Type.ZIP]: 'application/zip',
                    [file.Type.EMAIL]: 'message/rfc822'
                };

                let mimeType = mimeTypeMap[fileType] || 'application/octet-stream';
                if (mimeType === 'application/octet-stream') {
                    mimeType = getMimeTypeFromExtension(fileName);
                    log.debug({ title: `${strDebugTitle} - Inferred MIME Type`, details: mimeType });
                }

                if (!constants.FILE_VIEWER.SUPPORTED_TYPES.includes(mimeType)) {
                    fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">File type (${mimeType}) not supported for display</p>`;
                    log.debug({ title: `${strDebugTitle} - Unsupported MIME Type`, details: `MIME type ${mimeType} is not supported.` });
                } else if (mimeType === 'text/csv') {
                    try {
                        const csvContent = fileObj.getContents();
                        fileDisplayHtml = `<div style="overflow: auto; max-height: 100%;">${generateCsvTable(csvContent)}</div>`;
                        log.debug({ title: `${strDebugTitle} - CSV Display`, details: `Displaying CSV content as HTML table for file: ${fileName}` });
                    } catch (e) {
                        log.error({ title: `${strDebugTitle} - Error fetching CSV content`, details: e.message });
                        fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">Error reading CSV file</p>`;
                    }
                } else if (['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/tiff', 'image/x-icon', 'image/svg+xml', 'image/pjpeg', 'text/html', 'video/quicktime', 'audio/mpeg', 'audio/mp4'].includes(mimeType)) {
                    fileDisplayHtml = `<iframe src="${fileUrl}" width="100%" height="100%" style="border: none;"></iframe>`;
                    log.debug({ title: `${strDebugTitle} - File Display`, details: `Using iframe for MIME type ${mimeType} with URL ${fileUrl}` });
                } else {
                    fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">File type (${mimeType}) cannot be displayed</p>`;
                    log.debug({ title: `${strDebugTitle} - Non-displayable MIME Type`, details: `MIME type ${mimeType} is supported but not displayable.` });
                }
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error Loading File`, details: `File ID: ${fileId} - ${error.message}` });
                fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">Error loading file</p>`;
            }
        } else {
            fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">No file available</p>`;
        }

        // Fetch values from the NetSuite record
        const transactionType = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRANSACTION_TYPE }) || '';
        log.debug({ title: `${strDebugTitle} - Transaction Type`, details: transactionType });

        const subsidiary = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY }) || '';
        log.debug({ title: `${strDebugTitle} - Subsidiary`, details: subsidiary });

        const vendor = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR }) || '';
        log.debug({ title: `${strDebugTitle} - Vendor`, details: vendor });

        const memo = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.MEMO }) || '';
        log.debug({ title: `${strDebugTitle} - Memo`, details: memo });

        const emailHtmlBody = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.EMAIL_BODY_HTML_TEXT }) || '';
        log.debug({ title: `${strDebugTitle} - Email HTML Body`, details: emailHtmlBody });

        const amount = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX }) || '0';
        log.debug({ title: `${strDebugTitle} - Amount`, details: amount });

        // Generate dropdown options
        const transactionTypes = getTransactionTypes();
        const transactionTypeOptionsList = `<option value="">Select Transaction Type...</option>` +
            transactionTypes.map(type => `<option value="${type.id}" ${type.id == transactionType ? 'selected' : ''}>${type.name}</option>`).join('');

        const subsidiaries = getSubsidiaries();
        const subsidiaryOptions = `<option value="">Select Subsidiary...</option>` +
            subsidiaries.map(subs => `<option value="${subs.id}" ${subs.id == subsidiary ? 'selected' : ''}>${subs.name}</option>`).join('');

        const vendors = getVendors();
        const vendorOptions = `<option value="">Select Vendor...</option>` +
            vendors.map(vend => `<option value="${vend.id}" ${vend.id == vendor ? 'selected' : ''}>${vend.name}</option>`).join('');

        // Load HTML template from File Cabinet or use fallback
        let formHtml;
        try {
            const templatePath = `SuiteScripts/LST Capture/${constants.TEMPLATE_FILES.SPLIT_SCREEN}`;
            log.debug({ title: `${strDebugTitle} - Template File Path`, details: templatePath });

            const htmlFile = file.load({ id: templatePath });
            formHtml = htmlFile.getContents();
            log.debug({ 
                title: `${strDebugTitle} - Raw HTML Template`, 
                details: `Length: ${formHtml.length}, Contains custrecord_lstcptr_tran_type: ${formHtml.includes('${custrecord_lstcptr_tran_type}')}, First 500 chars: ${formHtml.substring(0, 500)}` 
            });
        } catch (fileError) {
            log.error({ title: `${strDebugTitle} - File Load Error`, details: `Path: ${templatePath}, Error: ${fileError.message}` });
            // Fallback HTML content
            formHtml = `
            <html>
            <head>
                <title>Bill To Process</title>
                <style>
                    .container {
                        display: flex;
                        height: 90vh;
                    }
                    .left-panel {
                        width: 40%;
                        padding: 10px;
                        overflow: auto;
                    }
                    .right-panel {
                        width: 60%;
                        margin-top: 10px;
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        justify-content: start;
                    }
                    .form-title {
                        text-align: center;
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        margin-top: 10px;
                    }
                    .form-field {
                        margin-bottom: 10px;
                        margin-top: 10px;
                        font-size: 14px;
                    }
                    label {
                        font-weight: bold;
                        display: block;
                        margin-bottom: 2px;
                        font-size: 14px;
                    }
                    select, input, textarea {
                        width: 50%;
                        padding: 4px;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                    }
                    .button-group {
                        margin-top: 20px;
                        display: flex;
                        gap: 10px;
                    }
                    .button-group button {
                        padding: 10px 15px;
                        border: none;
                        cursor: pointer;
                        font-size: 14px;
                        border-radius: 5px;
                    }
                    .button-primary {
                        background-color: #007bff;
                        color: white;
                    }
                    .email-container {
                        display: none;
                        width: 30%;
                        padding: 10px;
                        border-left: 1px solid #ccc;
                        margin-top: 10px;
                        position: relative;
                    }
                    .toggle-container {
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        margin-bottom: 10px;
                        cursor: pointer;
                    }
                    .toggle-switch {
                        position: relative;
                        width: 50px;
                        height: 25px;
                    }
                    .toggle-switch input {
                        display: none;
                    }
                    .toggle-slider {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        background: #ccc;
                        border-radius: 25px;
                        transition: 0.3s;
                    }
                    .toggle-slider:before {
                        content: "";
                        position: absolute;
                        width: 20px;
                        height: 20px;
                        left: 3px;
                        top: 2.5px;
                        background: white;
                        border-radius: 50%;
                        transition: 0.3s;
                    }
                    input:checked + .toggle-slider {
                        background: #007bff;
                    }
                    input:checked + .toggle-slider:before {
                        transform: translateX(25px);
                    }
                </style>
            </head>
            <body>
                <form id="vendorBillForm">
                    <div class="container">
                        <div class="left-panel" id="pdfContainer">
                            ${fileDisplayHtml}
                        </div>
                        <div class="right-panel" id="right-panel">
                            <div class="form-title">Bill To Process</div>
                            <div class="toggle-container">
                                <label class="toggle-switch">
                                    <input type="checkbox" id="display-email-toggle">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span style="margin-left: 10px; font-weight: bold;">Display Email</span>
                            </div>
                            <div class="form-field">
                                <input type="hidden" id="custrecord_lstcptr_record_id" name="custrecord_lstcptr_record_id" value="${recordId}">
                            </div>
                            <div class="form-field">
                                <label>Transaction Type</label>
                                <select id="custrecord_lstcptr_tran_type" name="custrecord_lstcptr_tran_type">${transactionTypeOptionsList}</select>
                            </div>
                            <div class="form-field">
                                <label>Subsidiary</label>
                                <select id="custrecord_lstcptr_subsidiary" name="custrecord_lstcptr_subsidiary">${subsidiaryOptions}</select>
                            </div>
                            <div class="form-field">
                                <label>Vendor</label>
                                <select id="custrecord_lstcptr_vendor" name="custrecord_lstcptr_vendor">${vendorOptions}</select>
                            </div>
                            <div class="form-field" style="display:none;">
                                <label>Amount</label>
                                <input type="number" id="custrecord_lstcptr_amount" name="custrecord_lstcptr_amount" value="${amount}" step="0.01" min="0">
                            </div>
                            <div class="form-field" style="display:none;">
                                <label>Document Origin</label>
                                <select id="custrecord_lstcptr_doc_origin" name="custrecord_lstcptr_doc_origin">
                                    <option value="">Select document origin...</option>
                                    <option value="${constants.DOCUMENT_ORIGIN.NANONET}">${constants.DOCUMENT_ORIGIN.NANONET}</option>
                                </select>
                            </div>
                            <div class="form-field">
                                <label>Memo</label>
                                <textarea id="custrecord_lstcptr_memo" name="custrecord_lstcptr_memo">${memo || ''}</textarea>
                            </div>
                            <div class="button-group">
                                <button class="button-primary" type="button" id="saveButton">Save</button>
                            </div>
                        </div>
                        <div class="email-container" id="email-container">
                            <div class="form-title"><strong>Email Message</strong></div>
                            ${emailHtmlBody}
                        </div>
                    </div>
                </form>
                <script>
                    function submitForm() {
                        console.log("submitForm called");
                        const fields = [
                            { id: "custrecord_lstcptr_record_id", name: "Record ID" },
                            { id: "custrecord_lstcptr_tran_type", name: "Transaction Type" },
                            { id: "custrecord_lstcptr_subsidiary", name: "Subsidiary" },
                            { id: "custrecord_lstcptr_vendor", name: "Vendor" },
                            { id: "custrecord_lstcptr_amount", name: "Amount" },
                            { id: "custrecord_lstcptr_memo", name: "Memo" }
                        ];

                        const formData = new URLSearchParams();
                        let hasError = false;
                        for (const field of fields) {
                            const element = document.getElementById(field.id);
                            if (!element) {
                                console.error("Element with ID " + field.id + " not found");
                                alert("Error: Field " + field.name + " not found in the form. Please contact support.");
                                return;
                            }
                            const value = element.value || '';
                            if (['custrecord_lstcptr_tran_type', 'custrecord_lstcptr_subsidiary', 'custrecord_lstcptr_vendor'].includes(field.id) && !value) {
                                alert("Please select a " + field.name);
                                hasError = true;
                            }
                            formData.append(field.id, value);
                            console.log("Field " + field.name + ": " + value);
                        }
                        if (hasError) return;

                        console.log("Form Data:", formData.toString());
                        fetch(window.location.href, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: formData.toString()
                        })
                        .then(response => {
                            console.log("Response received:", response);
                            return response.text();
                        })
                        .then(text => {
                            console.log("Raw Response Text:", text);
                            try {
                                var data = JSON.parse(text);
                                console.log("Parsed Data:", data);
                                if (data.success) {
                                    alert("Record saved successfully!");
                                    window.location.href = data.redirectUrl;
                                } else {
                                    alert("Error: " + data.message);
                                }
                            } catch (e) {
                                console.error("Error parsing response:", e);
                                alert("Error: Invalid response from server.");
                            }
                        })
                        .catch(error => {
                            console.error("Error during form submission:", error);
                            alert("An error occurred while saving: " + error.message);
                        });
                    }

                    document.addEventListener('DOMContentLoaded', function() {
                        console.log("DOM fully loaded");
                        var saveButton = document.getElementById('saveButton');
                        if (saveButton) {
                            console.log("Save button found");
                            saveButton.addEventListener('click', function(event) {
                                event.preventDefault();
                                console.log("Save button clicked");
                                submitForm();
                            });
                        } else {
                            console.error("Save button not found");
                        }

                        var pdfContainer = document.getElementById('pdfContainer');
                        var rightPanel = document.getElementById('right-panel');
                        var emailContainer = document.getElementById('email-container');
                        var toggleButton = document.getElementById('display-email-toggle');

                        if (pdfContainer && rightPanel && emailContainer && toggleButton) {
                            if (!toggleButton.checked) {
                                pdfContainer.style.width = '60%';
                                rightPanel.style.width = '40%';
                                emailContainer.style.display = 'none';
                            }

                            toggleButton.addEventListener('change', function() {
                                if (this.checked) {
                                    pdfContainer.style.width = '40%';
                                    rightPanel.style.width = '30%';
                                    emailContainer.style.display = 'block';
                                } else {
                                    pdfContainer.style.width = '60%';
                                    rightPanel.style.width = '40%';
                                    emailContainer.style.display = 'none';
                                }
                            });
                        } else {
                            console.error("One or more panel elements not found");
                        }

                        var elements = document.querySelectorAll('.uir-record-type, .uir-page-title');
                        elements.forEach(el => el.style.display = 'none');
                    });
                </script>
            </body>
            </html>
            `;
            log.debug({ title: `${strDebugTitle} - Using Fallback HTML`, details: `Length: ${formHtml.length}, Contains custrecord_lstcptr_tran_type: ${formHtml.includes('${custrecord_lstcptr_tran_type}')}` });
        }

        // Perform placeholder replacements
        const replacements = {
            '${fileDisplayHtml}': fileDisplayHtml,
            '${recordId}': recordId,
            '${transactionTypeOptionsList}': transactionTypeOptionsList,
            '${subsidiaryOptions}': subsidiaryOptions,
            '${vendorOptions}': vendorOptions,
            '${amount}': amount,
            '${memo || \'\'}': memo || '',
            '${emailHtmlBody}': emailHtmlBody,
            '${custrecord_lstcptr_record_id}': constants.CUSTOM_FIELDS.RECORD_ID,
            '${custrecord_lstcptr_tran_type}': constants.CUSTOM_FIELDS.TRANSACTION_TYPE,
            '${custrecord_lstcptr_subsidiary}': constants.CUSTOM_FIELDS.SUBSIDIARY,
            '${custrecord_lstcptr_vendor}': constants.CUSTOM_FIELDS.VENDOR,
            '${custrecord_lstcptr_amount}': constants.CUSTOM_FIELDS.AMOUNT,
            '${custrecord_lstcptr_memo}': constants.CUSTOM_FIELDS.MEMO,
            '${custrecord_lstcptr_doc_origin}': constants.CUSTOM_FIELDS.DOCUMENT_ORIGIN,
            '${Nanonet}': constants.DOCUMENT_ORIGIN.NANONET
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
            const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            if (formHtml.includes(placeholder)) {
                log.debug({ title: `${strDebugTitle} - Replacing Placeholder`, details: `Replacing ${placeholder} with ${value}` });
                formHtml = formHtml.replace(regex, value);
            } else {
                log.debug({ title: `${strDebugTitle} - Placeholder Not Found`, details: `Placeholder ${placeholder} not found in template` });
            }
        }

        log.debug({ 
            title: `${strDebugTitle} - Rendered HTML`, 
            details: `Length: ${formHtml.length}, Contains custrecord_lstcptr_tran_type: ${formHtml.includes('${custrecord_lstcptr_tran_type}')}, First 500 chars: ${formHtml.substring(0, 500)}` 
        });

        if (formHtml.includes('${custrecord_lstcptr_tran_type}')) {
            log.error({ title: `${strDebugTitle} - Placeholder Error`, details: `Placeholder ${custrecord_lstcptr_tran_type} not replaced` });
            response.write('Error: Failed to replace placeholders in HTML template. Please contact support.');
            return;
        }

        const form = serverWidget.createForm({ title: 'Bill To Process' });
        form.addField({ id: constants.CUSTOM_FIELDS.INLINE_HTML, type: serverWidget.FieldType.INLINEHTML, label: 'UI Layout' }).defaultValue = formHtml;
        response.writePage(form);
    }

    function getMimeTypeFromExtension(fileName) {
        if (!fileName) return 'application/octet-stream';
        const extension = fileName.split('.').pop().toLowerCase();
        const extensionMap = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'tiff': 'image/tiff',
            'tif': 'image/tiff',
            'ico': 'image/x-icon',
            'svg': 'image/svg+xml',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'csv': 'text/csv',
            'txt': 'text/plain',
            'rtf': 'application/rtf',
            'xml': 'application/xml',
            'xsd': 'application/xml',
            'mp3': 'audio/mpeg',
            'm4a': 'audio/mp4',
            'mov': 'video/quicktime',
            'swf': 'application/x-shockwave-flash',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'mpp': 'application/vnd.ms-project',
            'vsdx': 'application/vnd.visio',
            'ps': 'application/postscript',
            'tar': 'application/x-tar',
            'zip': 'application/zip',
            'eml': 'message/rfc822',
            'appcache': 'text/cache-manifest',
            'pat': 'application/octet-stream',
            'config': 'application/octet-stream',
            'ftl': 'application/octet-stream',
            'sms': 'application/octet-stream',
            'gs': 'application/octet-stream',
            'csr': 'application/pkix-cert'
        };
        return extensionMap[extension] || 'application/octet-stream';
    }

    function generateCsvTable(csvContent) {
        try {
            const rows = csvContent.split('\n').filter(row => row.trim() !== '');
            if (rows.length === 0) {
                return '<p>No data in CSV file</p>';
            }

            let html = '<table border="1" style="width: 100%; border-collapse: collapse; font-size: 14px;">';
            rows.forEach((row, index) => {
                const columns = row.split(',').map(col => col.trim());
                html += index === 0 ? '<thead><tr>' : '<tr>';
                columns.forEach(col => {
                    const escapedCol = col.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    html += index === 0 ? `<th style="padding: 5px; background-color: #f2f2f2;">${escapedCol}</th>` : `<td style="padding: 5px;">${escapedCol}</td>`;
                });
                html += index === 0 ? '</tr></thead><tbody>' : '</tr>';
            });
            html += '</tbody></table>';
            return html;
        } catch (e) {
            log.error({ title: `${strDebugTitle} - Error parsing CSV`, details: e.message });
            return '<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">Error parsing CSV file</p>';
        }
    }

    function getSubsidiaries() {
        const results = [];
        search.create({ 
            type: 'subsidiary', 
            columns: [constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID, constants.STANDARD_FIELDS.SUBSIDIARY.NAME] 
        }).run().each(res => {
            results.push({ id: res.getValue(constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID), name: res.getValue(constants.STANDARD_FIELDS.SUBSIDIARY.NAME) });
            return true;
        });
        log.debug({ title: `${strDebugTitle} - Subsidiaries`, details: JSON.stringify(results) });
        return results;
    }

    function getVendors() {
        const results = [];
        try {
            search.create({
                type: search.Type.VENDOR,
                filters: [['isinactive', 'is', false]],
                columns: [constants.STANDARD_FIELDS.VENDOR.INTERNAL_ID, constants.STANDARD_FIELDS.VENDOR.ENTITY_ID, constants.STANDARD_FIELDS.VENDOR.COMPANY_NAME]
            }).run().each(res => {
                const id = res.getValue(constants.STANDARD_FIELDS.VENDOR.INTERNAL_ID);
                const entityId = res.getValue(constants.STANDARD_FIELDS.VENDOR.ENTITY_ID);
                const companyName = res.getValue(constants.STANDARD_FIELDS.VENDOR.COMPANY_NAME) || 'No Company Name';
                results.push({ id, name: `${entityId} - ${companyName}` });
                return true;
            });
        } catch (error) {
            log.error({ title: `${strDebugTitle} - Error fetching vendors`, details: error.message });
        }
        log.debug({ title: `${strDebugTitle} - Vendors`, details: JSON.stringify(results) });
        return results;
    }

    function getTransactionTypes() {
        const results = [];
        search.create({
            type: constants.CUSTOM_LISTS.TRANSACTION_TYPE,
            columns: ['internalid', 'name']
        }).run().each(res => {
            results.push({
                id: res.getValue('internalid'),
                name: res.getValue('name')
            });
            return true;
        });
        log.debug({ title: `${strDebugTitle} - Transaction Types`, details: JSON.stringify(results) });
        return results;
    }

    function saveTransaction(data, recordId) {
        try {
            const vendorBillRecord = record.load({
                type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                id: recordId
            });

            vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRANSACTION_TYPE, value: data.transactionType });
            log.debug({ title: `${strDebugTitle} - Set Transaction Type`, details: data.transactionType });
            vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY, value: data.subsidiary });
            log.debug({ title: `${strDebugTitle} - Set Subsidiary`, details: data.subsidiary });
            vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR, value: data.vendor });
            log.debug({ title: `${strDebugTitle} - Set Vendor`, details: data.vendor });
            vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX, value: data.amount || '0' });
            log.debug({ title: `${strDebugTitle} - Set Amount`, details: data.amount });
            vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.MEMO, value: data.memo || '' });
            log.debug({ title: `${strDebugTitle} - Set Memo`, details: data.memo });

            const savedRecordId = vendorBillRecord.save();
            log.debug({ title: `${strDebugTitle} - Saved Record ID`, details: savedRecordId });

            return savedRecordId;
        } catch (error) {
            log.error({ title: `${strDebugTitle} - Error in saveTransaction`, details: error.message });
            throw error;
        }
    }

    return { onRequest };
});