/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            Vendor Bill Split-Screen (split_screen_su.js)
*
* Version:         1.0.0   -   06-May-2025 -  RS               Initial Development
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script is used to show various supported file types and Vendor bill in split-screen.
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
define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/url', 'N/search', 'N/runtime'], function (serverWidget, record, file, url, search, runtime) {
    function onRequest(context) {
        var request = context.request;
        var response = context.response;
        var accountId = runtime.accountId;

        if (context.request.method === 'POST') {
            try {
                log.debug("Inside the POST method");
                var recordId = context.request.parameters.recordId;
                var requestData = {
                    transactionType: context.request.parameters.transactionType,
                    subsidiary: context.request.parameters.subsidiary,
                    vendor: context.request.parameters.vendor,
                    amount: context.request.parameters.amount,
                    memo: context.request.parameters.memo
                };

                if (!recordId) {
                    throw new Error("🚨 ERROR: Record ID is missing in POST request.");
                }

                log.debug("POST Request Data:", requestData);
                log.debug("Received Record ID:", recordId);

                var savedRecordId = saveTransaction(requestData, recordId);

                if (!savedRecordId) {
                    throw new Error("Record ID is undefined after save.");
                }

                log.debug("Redirecting to saved record with ID:", savedRecordId);

                var redirectUrl = `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_vendor_bill_process&deploy=customdeploy_lstcptr_vendor_bill_process`;

                context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
                context.response.write(JSON.stringify({
                    success: true,
                    redirectUrl: redirectUrl
                }));
            } catch (error) {
                log.error("Error Saving Transaction", error);
                context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
                context.response.write(JSON.stringify({ success: false, message: error.message }));
            }
            return;
        }

        var recordId = request.parameters.internalId;
        log.debug("Record ID: ", recordId);

        if (!recordId) {
            response.write('No record ID provided');
            return;
        }

        var vendorBillRecord = record.load({
            type: 'customrecord_lstcptr_vendor_bill_process',
            id: recordId
        });

        var fileId = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_pdf_file' });
        log.debug("FileId: ", fileId);

        var fileUrl = '';
        var fileType = '';
        var fileName = '';
        var fileDisplayHtml = '';
        var mimeType = '';

        // Supported MIME types
        const supportedTypes = [
            'text/cache-manifest', // appcache
            'application/octet-stream', // pat, config, ftl, sms, gs
            'image/bmp', // bmp
            'application/pkix-cert', // csr
            'text/csv', // csv
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'application/x-shockwave-flash', // flash
            'image/gif', // gif
            'text/html', // html, htm
            'image/x-icon', // icon
            'application/javascript', // js
            'image/jpeg', // jpg
            'image/tiff', // tiff, tif
            'application/json', // json
            'message/rfc822', // eml
            'audio/mpeg', // mp3
            'audio/mp4', // m4a
            'application/vnd.ms-project', // mpp
            'application/pdf', // pdf
            'image/pjpeg', // pjpg
            'text/plain', // txt
            'image/png', // png
            'application/postscript', // ps
            'application/vnd.ms-powerpoint', // ppt
            'video/quicktime', // mov
            'application/rtf', // rtf
            'text/css', // css
            'image/svg+xml', // svg
            'application/x-tar', // tar
            'application/vnd.visio', // vsdx
            'application/msword', // doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/xml', // xml, xsd
            'application/zip' // zip
        ];

        // Function to infer MIME type from file extension
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

        // Function to parse CSV content and generate HTML table
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
                        // Escape HTML to prevent XSS
                        const escapedCol = col.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        html += index === 0 ? `<th style="padding: 5px; background-color: #f2f2f2;">${escapedCol}</th>` : `<td style="padding: 5px;">${escapedCol}</td>`;
                    });
                    html += index === 0 ? '</tr></thead><tbody>' : '</tr>';
                });
                html += '</tbody></table>';
                return html;
            } catch (e) {
                log.error("Error parsing CSV", e.message);
                return '<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">Error parsing CSV file</p>';
            }
        }

        if (fileId) {
            try {
                var fileObj = file.load({ id: fileId });
                fileUrl = fileObj.url;
                fileType = fileObj.fileType;
                fileName = fileObj.name;
                log.debug("File Details:", { url: fileUrl, type: fileType, name: fileName });

                // Map NetSuite file.Type to MIME type
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

                mimeType = mimeTypeMap[fileType] || 'application/octet-stream';
                log.debug("Initial MIME Type:", mimeType);

                // If MIME type is application/octet-stream, infer from file extension
                if (mimeType === 'application/octet-stream') {
                    mimeType = getMimeTypeFromExtension(fileName);
                    log.debug("Inferred MIME Type from Extension:", mimeType);
                }

                // Determine how to display the file
                if (!supportedTypes.includes(mimeType)) {
                    fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">File type (${mimeType}) not supported for display</p>`;
                    log.debug("Unsupported MIME Type", `MIME type ${mimeType} is not in supportedTypes.`);
                } else if (mimeType === 'text/csv') {
                    // Special handling for CSV: display as HTML table
                    try {
                        var csvContent = fileObj.getContents();
                        fileDisplayHtml = `<div style="overflow: auto; max-height: 100%;">${generateCsvTable(csvContent)}</div>`;
                        log.debug("CSV Display", `Displaying CSV content as HTML table for file: ${fileName}`);
                    } catch (e) {
                        log.error("Error fetching CSV content", e.message);
                        fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">Error reading CSV file</p>`;
                    }
                } else if (['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/tiff', 'image/x-icon', 'image/svg+xml', 'image/pjpeg', 'text/html', 'video/quicktime', 'audio/mpeg', 'audio/mp4'].includes(mimeType)) {
                    // Use iframe for natively displayable file types
                    fileDisplayHtml = `<iframe src="${fileUrl}" width="100%" height="100%" style="border: none;"></iframe>`;
                    log.debug("File Display", `Using iframe for MIME type ${mimeType} with URL ${fileUrl}`);
                } else {
                    // For other supported but non-displayable types (e.g., XLSX, ZIP)
                    fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">File type (${mimeType}) cannot be displayed</p>`;
                    log.debug("Non-displayable MIME Type", `MIME type ${mimeType} is supported but not displayable in browser.`);
                }
            } catch (error) {
                log.error("Error Loading File", "File ID: " + fileId + " - " + error.message);
                fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">Error loading file</p>`;
            }
        } else {
            fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">No file available</p>`;
        }

        // Fetch values from the NetSuite record
        var transactionType = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_transaction_type' }) || '';
        log.debug("Transaction Type: ", transactionType);

        var subsidiary = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_subsidiary' }) || '';
        log.debug("Subsidiary: ", subsidiary);

        var vendor = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_vendor' }) || '';
        log.debug("Vendor: ", vendor);

        var memo = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_memo' }) || '';
        log.debug("Memo: ", memo);

        var emailHtmlBody = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_email_body_html_text' }) || '';
        log.debug("Email HTML Body: ", emailHtmlBody);

        var amount = vendorBillRecord.getValue({ fieldId: 'custrecord_lstcptr_tran_amount_inc_tax' }) || 0;
        log.debug("Amount: ", amount);

        // Generate Transaction Type Dropdown
        var transactionTypes = getTransactionTypes();
        var transactionTypeOptionsList = `<option value="">Select Transaction Type...</option>`;
        transactionTypes.forEach(function (type) {
            var isSelected = type.id == transactionType ? 'selected' : '';
            transactionTypeOptionsList += `<option value="${type.id}" ${isSelected}>${type.name}</option>`;
        });

        // Generate Subsidiary Dropdown with Pre-selection
        var subsidiaries = getSubsidiaries();
        var subsidiaryOptions = `<option value="">Select Subsidiary...</option>`;
        subsidiaries.forEach(function (subs) {
            var isSelected = subs.id == subsidiary ? 'selected' : '';
            subsidiaryOptions += `<option value="${subs.id}" ${isSelected}>${subs.name}</option>`;
        });

        // Generate Vendor Dropdown with Pre-selection
        var vendors = getVendors();
        var vendorOptions = `<option value="">Select Vendor...</option>`;
        vendors.forEach(function (vend) {
            var isSelected = vend.id == vendor ? 'selected' : '';
            vendorOptions += `<option value="${vend.id}" ${isSelected}>${vend.name}</option>`;
        });

        var form = serverWidget.createForm({ title: 'Bill To Process' });

        var formHtml = `
        <html>
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
                    margin-top:10px;
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
                .button-secondary {
                    background-color: gray;
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
                        <input type="hidden" id="recordId" name="recordId" value="${recordId}">
                    </div>
                    <div class="form-field">
                        <label>Transaction Type</label>
                        <select id="transactionType" name="transactionType">${transactionTypeOptionsList}</select>
                    </div>
                    <div class="form-field">
                        <label>Subsidiary</label>
                        <select id="subsidiary" name="subsidiary">${subsidiaryOptions}</select>
                    </div>
                    <div class="form-field">
                        <label>Vendor</label>
                        <select id="vendor" name="vendor">${vendorOptions}</select>
                    </div>
                    <div class="form-field" style="display:none;">
                        <label>Amount</label>
                        <input type="number" id="amount" name="amount" value="${amount}" step="0.01" min="0">
                    </div>
                    <div class="form-field" style="display:none;">
                        <label>Document Origin</label>
                        <select id="documentOrigin" name="documentOrigin">
                            <option value="">Select document origin...</option>
                            <option value="Nanonet">Nanonet</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label>Memo</label>
                        <textarea id="memo" name="memo">${memo || ''}</textarea>
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
            <script>
                function submitForm() {
                    console.log("submitForm called");
                    var formData = new URLSearchParams();
                    formData.append("recordId", document.getElementById('recordId').value);
                    formData.append("transactionType", document.getElementById('transactionType').value);
                    formData.append("subsidiary", document.getElementById('subsidiary').value);
                    formData.append("vendor", document.getElementById('vendor').value);
                    formData.append("amount", document.getElementById('amount').value);
                    formData.append("memo", document.getElementById('memo').value);
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
                        var data = JSON.parse(text);
                        console.log("Parsed Data:", data);
                        if (data.success) {
                            alert("Record saved successfully!");
                            window.location.href = data.redirectUrl;
                        } else {
                            alert("Error: " + data.message);
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

                    var elements = document.querySelectorAll('.uir-record-type, .uir-page-title');
                    elements.forEach(el => el.style.display = 'none');
                });
            </script>
        </html>
        `;

        form.addField({ id: 'custpage_html_content', type: serverWidget.FieldType.INLINEHTML, label: 'UI Layout' }).defaultValue = formHtml;
        response.writePage(form);
    }

    function getSubsidiaries() {
        var results = [];
        search.create({ type: 'subsidiary', columns: ['internalid', 'name'] }).run().each(res => {
            results.push({ id: res.getValue('internalid'), name: res.getValue('name') });
            return true;
        });
        return results;
    }

    function getVendors() {
        var results = [];
        try {
            var vendorSearch = search.create({
                type: search.Type.VENDOR,
                columns: ['internalid', 'entityid', 'companyname']
            });

            vendorSearch.run().each(res => {
                var id = res.getValue({ name: 'internalid' });
                var entityId = res.getValue({ name: 'entityid' });
                var companyName = res.getValue({ name: 'companyname' }) || 'No Company Name';
                var displayName = entityId + ' - ' + companyName;
                results.push({ id: id, name: displayName });
                return true;
            });
        } catch (error) {
            log.error('Error fetching vendors', error);
        }
        return results;
    }

    function getTransactionTypes() {
        var results = [];
        search.create({
            type: 'customlist_lst_transaction_type',
            columns: ['internalid', 'name']
        }).run().each(function(res) {
            results.push({
                id: res.getValue('internalid'),
                name: res.getValue('name')
            });
            return true;
        });
        log.debug("Results: ", results);
        return results;
    }

    function saveTransaction(data, recordId) {
        var vendorBillRecord = record.load({
            type: 'customrecord_lstcptr_vendor_bill_process',
            id: recordId
        });

        vendorBillRecord.setValue({ fieldId: 'custrecord_lstcptr_transaction_type', value: data.transactionType });
        log.debug("Transaction Type: ", data.transactionType);
        vendorBillRecord.setValue({ fieldId: 'custrecord_lstcptr_subsidiary', value: data.subsidiary });
        log.debug("Subsidiary: ", data.subsidiary);
        vendorBillRecord.setValue({ fieldId: 'custrecord_lstcptr_vendor', value: data.vendor });
        log.debug("Vendor: ", data.vendor);
        vendorBillRecord.setValue({ fieldId: 'custrecord_lstcptr_tran_amount_inc_tax', value: data.amount });
        log.debug("Amount: ", data.amount);
        vendorBillRecord.setValue({ fieldId: 'custrecord_lstcptr_memo', value: data.memo });
        log.debug("Memo: ", data.memo);

        var savedRecordId = vendorBillRecord.save();
        log.debug("Saved Record ID:", savedRecordId);

        return savedRecordId;
    }

    return { onRequest };
});