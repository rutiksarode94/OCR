/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            Vendor Bill Split-Screen (split_screen_su.js)
 *
 * Version:         1.0.0   -   06-May-2025  -  RS      Initial Development
 * Version:         1.0.1   -   16-Jul-2025  -  [Your Name]  Refactored to use lstcptr_constants.js, moved HTML to splitScreenSuitelet.html, fixed typo in copyright
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This script is used to show various supported file types and Vendor bill in split-screen.
 *
 * Script:          customscript_lstcptr_split_screen_su
 * Deploy:          customdeploy_lstcptr_bill_split_screen_su
 *
 * Dependency:      ./lstcptr_constants.js
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/url', 'N/search', 'N/runtime', './lstcptr_constants'], 
    (serverWidget, record, file, url, search, runtime, constants) => {
        const strDebugTitle = constants.SPLIT_SCREEN_SUITELET_DEBUG_TITLE;

        // Validate constants loading
        if (!constants || !constants.VENDOR_BILL_STAGING_FIELDS || !constants.FILE_VIEWER) {
            log.error({ title: strDebugTitle, details: 'Constants module or required fields not loaded properly' });
            throw new Error('Constants module failed to load');
        }

        function onRequest(context) {
            const request = context.request;
            const response = context.response;
            const accountId = runtime.accountId;

            if (request.method === 'POST') {
                try {
                    log.debug({ title: `${strDebugTitle} - POST`, details: 'Starting POST request processing' });
                    const recordId = request.parameters[constants.CUSTOM_FIELDS.RECORD_ID];
                    const requestData = {
                        transactionType: request.parameters[constants.CUSTOM_FIELDS.TRANSACTION_TYPE],
                        subsidiary: request.parameters[constants.CUSTOM_FIELDS.SUBSIDIARY],
                        vendor: request.parameters[constants.CUSTOM_FIELDS.VENDOR],
                        amount: request.parameters[constants.CUSTOM_FIELDS.AMOUNT],
                        memo: request.parameters[constants.CUSTOM_FIELDS.MEMO]
                    };

                    if (!recordId) {
                        throw new Error("🚨 ERROR: Record ID is missing in POST request.");
                    }

                    log.debug({ title: `${strDebugTitle} - POST Request Data`, details: JSON.stringify(requestData) });
                    log.debug({ title: `${strDebugTitle} - Received Record ID`, details: recordId });

                    const savedRecordId = saveTransaction(requestData, recordId);

                    if (!savedRecordId) {
                        throw new Error("Record ID is undefined after save.");
                    }

                    log.debug({ title: `${strDebugTitle} - Redirect`, details: `Redirecting to saved record with ID: ${savedRecordId}` });

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

            let vendorBillRecord;
            try {
                vendorBillRecord = record.load({
                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                    id: recordId
                });
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error Loading Record`, details: `Record ID: ${recordId} - ${error.message}` });
                response.write('Error loading record');
                return;
            }

            const fileId = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE }) || '';
            log.debug({ title: `${strDebugTitle} - File ID`, details: fileId });

            let fileDisplayHtml = '';
            if (fileId) {
                try {
                    const fileObj = file.load({ id: fileId });
                    const fileUrl = fileObj.url;
                    const fileType = fileObj.fileType;
                    const fileName = fileObj.name;
                    log.debug({ title: `${strDebugTitle} - File Details`, details: { url: fileUrl, type: fileType, name: fileName } });

                    const mimeType = getMimeType(fileType, fileName);
                    log.debug({ title: `${strDebugTitle} - MIME Type`, details: mimeType });

                    if (!constants.FILE_VIEWER.SUPPORTED_TYPES.includes(mimeType)) {
                        fileDisplayHtml = `<p style="text-align: center; color: red; font-weight: bold; font-size: 20px;">File type (${mimeType}) not supported for display</p>`;
                        log.debug({ title: `${strDebugTitle} - Unsupported MIME Type`, details: `MIME type ${mimeType} is not in supportedTypes` });
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
                        log.debug({ title: `${strDebugTitle} - Non-displayable MIME Type`, details: `MIME type ${mimeType} is supported but not displayable in browser` });
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

            const amount = vendorBillRecord.getValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX }) || 0;
            log.debug({ title: `${strDebugTitle} - Amount`, details: amount });

            // Generate dropdowns
            const transactionTypes = getTransactionTypes();
            const transactionTypeOptionsList = `<option value="">Select Transaction Type...</option>` +
                transactionTypes.map(type => 
                    `<option value="${type.id}" ${type.id == transactionType ? 'selected' : ''}>${type.name}</option>`
                ).join('');

            const subsidiaries = getSubsidiaries();
            const subsidiaryOptions = `<option value="">Select Subsidiary...</option>` +
                subsidiaries.map(subs => 
                    `<option value="${subs.id}" ${subs.id == subsidiary ? 'selected' : ''}>${subs.name}</option>`
                ).join('');

            const vendors = getVendors();
            const vendorOptions = `<option value="">Select Vendor...</option>` +
                vendors.map(vend => 
                    `<option value="${vend.id}" ${vend.id == vendor ? 'selected' : ''}>${vend.name}</option>`
                ).join('');

            // Load HTML template
            let formHtml;
            try {
                var htmlFile = file.load({ id: `SuiteScripts/LST Capture/${constants.TEMPLATE_FILES.SPLIT_SCREEN}` });
                //const htmlFile = file.load({ id: constants.TEMPLATE_FILES.SPLIT_SCREEN });
                formHtml = htmlFile.getContents()
                    .replace('${fileDisplayHtml}', fileDisplayHtml)
                    .replace(/\${recordIdField}/g, constants.CUSTOM_FIELDS.RECORD_ID)
                    .replace('${recordId}', recordId)
                    .replace('${transactionTypeField}', constants.CUSTOM_FIELDS.TRANSACTION_TYPE)
                    .replace('${transactionTypeOptionsList}', transactionTypeOptionsList)
                    .replace('${subsidiaryField}', constants.CUSTOM_FIELDS.SUBSIDIARY)
                    .replace('${subsidiaryOptions}', subsidiaryOptions)
                    .replace('${vendorField}', constants.CUSTOM_FIELDS.VENDOR)
                    .replace('${vendorOptions}', vendorOptions)
                    .replace('${amountField}', constants.CUSTOM_FIELDS.AMOUNT)
                    .replace('${amount}', amount)
                    .replace('${documentOriginField}', constants.CUSTOM_FIELDS.DOCUMENT_ORIGIN)
                    .replace('${documentOriginNanonet}', constants.DOCUMENT_ORIGIN.NANONET)
                    .replace('${memoField}', constants.CUSTOM_FIELDS.MEMO)
                    .replace('${memo || \'\'}', memo || '')
                    .replace('${emailHtmlBody}', emailHtmlBody);
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error Loading HTML Template`, details: error.message });
                response.write('Error loading HTML template');
                return;
            }

            const form = serverWidget.createForm({ title: 'Bill To Process' });
            form.addField({ 
                id: constants.CUSTOM_FIELDS.INLINE_HTML, 
                type: serverWidget.FieldType.INLINEHTML, 
                label: 'UI Layout' 
            }).defaultValue = formHtml;
            response.writePage(form);
        }

        function getMimeType(fileType, fileName) {
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
            if (mimeType === 'application/octet-stream' && fileName) {
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
                mimeType = extensionMap[extension] || 'application/octet-stream';
                log.debug({ title: `${strDebugTitle} - Inferred MIME Type`, details: `From extension ${extension}: ${mimeType}` });
            }
            return mimeType;
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
            try {
                search.create({ 
                    type: 'subsidiary', 
                    columns: [
                        constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID,
                        constants.STANDARD_FIELDS.SUBSIDIARY.NAME
                    ]
                }).run().each(res => {
                    results.push({ 
                        id: res.getValue(constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID), 
                        name: res.getValue(constants.STANDARD_FIELDS.SUBSIDIARY.NAME) 
                    });
                    return true;
                });
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error fetching subsidiaries`, details: error.message });
            }
            return results;
        }

        function getVendors() {
            const results = [];
            try {
                search.create({
                    type: search.Type.VENDOR,
                    columns: [
                        constants.STANDARD_FIELDS.VENDOR.INTERNAL_ID,
                        constants.STANDARD_FIELDS.VENDOR.ENTITY_ID,
                        constants.STANDARD_FIELDS.VENDOR.COMPANY_NAME
                    ]
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
            return results;
        }

        function getTransactionTypes() {
            const results = [];
            try {
                search.create({
                    type: constants.CUSTOM_LISTS.TRANSACTION_TYPE,
                    columns: [
                        constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID,
                        constants.STANDARD_FIELDS.SUBSIDIARY.NAME
                    ]
                }).run().each(res => {
                    results.push({
                        id: res.getValue(constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID),
                        name: res.getValue(constants.STANDARD_FIELDS.SUBSIDIARY.NAME)
                    });
                    return true;
                });
                log.debug({ title: `${strDebugTitle} - Transaction Types`, details: JSON.stringify(results) });
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error fetching transaction types`, details: error.message });
            }
            return results;
        }

        function saveTransaction(data, recordId) {
            try {
                const vendorBillRecord = record.load({
                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                    id: recordId
                });

                // Validate and set fields
                if (data.transactionType) {
                    vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRANSACTION_TYPE, value: data.transactionType });
                    log.debug({ title: `${strDebugTitle} - Transaction Type`, details: data.transactionType });
                }
                if (data.subsidiary) {
                    vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY, value: data.subsidiary });
                    log.debug({ title: `${strDebugTitle} - Subsidiary`, details: data.subsidiary });
                }
                if (data.vendor) {
                    vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR, value: data.vendor });
                    log.debug({ title: `${strDebugTitle} - Vendor`, details: data.vendor });
                }
                if (data.amount && !isNaN(data.amount)) {
                    vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX, value: parseFloat(data.amount) });
                    log.debug({ title: `${strDebugTitle} - Amount`, details: data.amount });
                }
                if (data.memo) {
                    vendorBillRecord.setValue({ fieldId: constants.VENDOR_BILL_STAGING_FIELDS.MEMO, value: data.memo });
                    log.debug({ title: `${strDebugTitle} - Memo`, details: data.memo });
                }

                const savedRecordId = vendorBillRecord.save();
                log.debug({ title: `${strDebugTitle} - Saved Record ID`, details: savedRecordId });
                return savedRecordId;
            } catch (error) {
                log.error({ title: `${strDebugTitle} - Error saving transaction`, details: error.message });
                throw error;
            }
        }

        return { onRequest };
    });