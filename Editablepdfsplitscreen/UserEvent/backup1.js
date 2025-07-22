/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Bill To Process Split Screen UE (lstcptr_bill_split_screen_ue.js)
*
* Version:         1.0.0   -   07-May-2025  -   Initial Development
*
* Author:          LiveStrong Technologies
*
* Purpose:         Prepopulate a Vendor Bill record with data from a related custom record, display a file viewer for multiple file types, and provide a toggle button for the viewer.
*
* Script:          customscript_lstcptr_bill_split_screen_ue
* Deploy:          customdeploy_lstcptr_bill_split_screen_ue
*
* Notes:           Updated to support multiple file types and fix issue where files fail to load or remain stuck at loading spinner.
*
* Dependencies:
*
* Libraries:
*************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @FileName lstcptr_bill_split_screen_ue.js
 */
define(['N/file', 'N/search', 'N/record', 'N/runtime', 'N/ui/serverWidget'],
    /**
     * @param {file} file 
     * @param {search} search
     * @param {record} record
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     */
    function (file, search, record, runtime, serverWidget) {
        var strDebugTitle = 'lstcptr_bill_split_screen_ue';
        var strDebugMsg = '';
        var vendorToBill = '';

        /**
         * Function triggered before record is loaded.
         */
        function beforeLoad(context) {
            strDebugTitle += ' beforeLoad';
            var strType = context.type;
            var objRecord = context.newRecord;
            var nRecType = objRecord.type;
            var form = context.form;
            var request = context.request;
            var nUserObj = runtime.getCurrentUser();
            var nUserId = nUserObj.id;
            var nUserRoleId = nUserObj.role;
            var accountId = runtime.accountId;

            strDebugMsg = 'Type [' + strType + ']; Rec Type [' + nRecType + ']; User ID [' + nUserId + ']; User Role ID [' + nUserRoleId + ']';
            log.debug({ title: strDebugTitle, details: strDebugMsg });

            try {
                var mainConfigRecordFields = getMainConfigRecordFields();
                var showPdfOnCreate = mainConfigRecordFields.custrecord_lstcptr_bill_split_creation; // Hardcoded default for CREATE
                //  log.audit("Show PDF on Create: ", showPdfOnCreate);
                var showPdfOnEdit = mainConfigRecordFields.custrecord_lstcptr_bill_split_edit;   // Hardcoded default for EDIT
                // log.audit("Show PDF on Edit: ", showPdfOnEdit);
                var showPdfOnView = mainConfigRecordFields.custrecord_lstcptr_bill_split_view;   // Hardcoded default for VIEW
                //log.audit("Show PDF on View: ", showPdfOnView);
                var department = "";
                var className = "";
                var location = "";
                var account = "";
                var apAccount = "";
                var item = "";
                var taxCode = "";
                var category = "";
                var currency = "";
                var lineItems = "";

                vendorToBill = request.parameters.vendorToBill;
                log.debug("Record Id: ", vendorToBill);
                var jsonFileId = request.parameters.jsonFileId;
                log.debug("JSON File Id: ", jsonFileId);
                var encodedLineItems = request.parameters.jsonLineItems;
                log.debug("Encoded Line Items from URL", encodedLineItems);

                // No customrecord_ab_ocr_custom_configuration dependency; fetch defaults from subsidiary if needed
                var lstvendorId = request.parameters.vendor;
                log.debug("VendorID: ", lstvendorId);
                var subsidiaryId = request.parameters.subsidiary;
                log.debug("Subsidiary ID: ", subsidiaryId);
                var vendorName = getVendorNameById(lstvendorId);
                log.debug("Vendor Name:", vendorName);

                objRecord.setValue({ fieldId: 'entity', value: lstvendorId });
                objRecord.setValue({ fieldId: 'subsidiary', value: subsidiaryId });
                if (isThereValue(lstvendorId)) {
                    var VendorConfigResults = getVendorConfigRecord(lstvendorId);
                }

                if (VendorConfigResults && VendorConfigResults.length > 0) {
                    var vendorConfigRecord = VendorConfigResults[0];
                    department = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendor_con_department' });
                    log.debug("VendorConfig department: ", department);
                    className = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendorr_config_class' });
                    log.debug("VendorConfig Class: ", className);
                    location = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendor_con_location' });
                    log.debug("VendorConfig Location: ", location);
                    apAccount = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_ap_account' });
                    log.debug("Account: ", apAccount);
                    currency = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendor_con_currency' });
                    log.debug("Currency: ", currency);
                    item = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendor_con_item' });
                    log.debug("Item: ", item);
                    taxCode = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendor_con_tax_code' });
                    log.debug("Tax Code: ", taxCode);
                    category = vendorConfigRecord.getValue({ name: 'custrecord_lstcptr_vendor_con_category' });
                    log.debug("Category: ", category);
                }

                var subsidiary = objRecord.getValue({ fieldId: 'subsidiary' });
                log.debug("Subsidiary: ", subsidiary);

                var subsidiaryConfigRecords = getSubsidiaryConfigRecords();
                var subsidiaryToFormMap = createSubsidiaryToFormMap(subsidiaryConfigRecords);
                var subsidiaryConfig = subsidiaryToFormMap[subsidiary];

                if (subsidiaryConfig) {
                    var subsidiaryDepartment = subsidiaryConfig.department;
                    var subsidiaryClassName = subsidiaryConfig.className;
                    var subsidiaryLocation = subsidiaryConfig.location;
                    log.debug(strDebugTitle, '; Subsidiary Department: ' + subsidiaryDepartment + '; Subsidiary Class: ' + subsidiaryClassName + '; Subsidiary Location: ' + subsidiaryLocation);

                    // Use subsidiary values if customer values are not present
                    department = department || subsidiaryDepartment;
                    className = className || subsidiaryClassName;
                    location = location || subsidiaryLocation;
                }

                // Handle JSON data
                var formattedJsonData = [];
                if (isThereValue(jsonFileId)) {
                    var jsonFile = file.load({ id: jsonFileId });
                    var jsonContent = jsonFile.getContents();
                    var jsonData = JSON.parse(jsonContent);

                    formattedJsonData = formatJsonData(jsonData);
                    log.debug(strDebugTitle, 'Formatted JSON Data: ' + JSON.stringify(formattedJsonData));

                    var jsonDataField = form.addField({
                        id: 'custpage_lstcptr_json_data',
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Formatted JSON Data'
                    });
                    jsonDataField.defaultValue = JSON.stringify(formattedJsonData);
                    jsonDataField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                    var vendorToBillField = form.addField({
                        id: 'custpage_hidden_vendor_to_bill',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Hidden Vendor Bill ID'
                    });
                    vendorToBillField.defaultValue = vendorToBill;
                    vendorToBillField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                    formattedJsonData.forEach(function (item) {
                        switch (item.label.toLowerCase()) {
                            case 'vendor':
                                objRecord.setValue({ fieldId: 'entity', value: item.ocr_text });
                                break;
                            case 'billnumber':
                                objRecord.setValue({ fieldId: 'tranid', value: item.ocr_text });
                                break;
                            case 'po_date':
                                objRecord.setValue({ fieldId: 'trandate', value: new Date(item.ocr_text) });
                                break;
                            case 'subsidiary':
                                objRecord.setValue({ fieldId: 'subsidiary', value: item.ocr_text });
                                break;
                            case 'total_amount':
                                objRecord.setValue({ fieldId: 'usertotal', value: parseFloat(item.ocr_text.replace(/,/g, '')) });
                                break;
                        }
                    });
                }

                if ((strType == context.UserEventType.CREATE || strType == context.UserEventType.COPY && showPdfOnCreate === true) &&
                    (runtime.executionContext == runtime.ContextType.USER_INTERFACE ||
                        runtime.executionContext == runtime.ContextType.WEBAPPLICATION ||
                        runtime.executionContext == runtime.ContextType.SUITELET)) {
                    log.debug("Context Type: ", strType);
                    log.debug("Execution Context: ", runtime.executionContext);
                    if (isThereValue(vendorToBill)) {
                        objRecord.setValue({ fieldId: 'department', value: department });
                        objRecord.setValue({ fieldId: 'class', value: className });
                        objRecord.setValue({ fieldId: 'location', value: location });
                        objRecord.setValue({ fieldId: 'account', value: apAccount });
                        objRecord.setValue({ fieldId: 'currency', value: currency });
                        objRecord.setValue({ fieldId: 'custbody_lstcptr_vendor_bill_process', value: vendorToBill });

                        var lstCaptureRecord = record.load({
                            type: 'customrecord_lstcptr_vendor_bill_process',
                            id: vendorToBill
                        });
                        var fileId = lstCaptureRecord.getValue({ fieldId: 'custrecord_lstcptr_pdf_file' });
                        log.debug("File ID: ", fileId);
                        var fileUrl = '';
                        var fileObj;
                        if (isThereValue(fileId)) {
                            try {
                                fileObj = file.load({ id: fileId });
                                fileObjUrl = fileObj.url;
                                fileUrl = `https://${accountId}.app.netsuite.com${fileObjUrl}`; // Adjust the URL as needed
                                log.debug("File URL: ", fileUrl);
                            } catch (e) {
                                log.error("Error loading file: ", e.message);
                                fileUrl = '';
                            }
                        } else {
                            log.debug("No file ID found for vendor bill process record: ", vendorToBill);
                        }

                        // Add hidden fields for file URL, type, and extension
                        var fileUrlField = form.addField({
                            id: 'custpage_lstcptr_file_url',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File URL'
                        });
                        fileUrlField.defaultValue = fileUrl;
                        fileUrlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var showFileField = form.addField({
                            id: 'custpage_lstcptr_show_file',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Show PDF'
                        });
                        showFileField.defaultValue = showPdfOnCreate;
                        showFileField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var fileTypeField = form.addField({
                            id: 'custpage_file_type',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File Type'
                        });
                        var fileType = fileObj ? fileObj.fileType : 'application/pdf';
                        var fileExtension = fileUrl ? fileUrl.split('.').pop().toLowerCase() : 'pdf';
                        log.debug("File Type: ", fileType);
                        fileTypeField.defaultValue = fileType;
                        fileTypeField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var fileExtensionField = form.addField({
                            id: 'custpage_file_extension',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File Extension'
                        });
                        fileExtensionField.defaultValue = fileExtension;
                        fileExtensionField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var supportedTypesField = form.addField({
                            id: 'custpage_supported_types',
                            type: serverWidget.FieldType.LONGTEXT,
                            label: 'Supported Types'
                        });
                        var supportedTypes = [
                            'text/cache-manifest',
                            'application/octet-stream',
                            'image/bmp',
                            'application/pkix-cert',
                            'text/csv',
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'application/vnd.ms-excel',
                            'application/x-shockwave-flash',
                            'image/gif',
                            'text/html',
                            'image/x-icon',
                            'application/javascript',
                            'image/jpeg',
                            'image/tiff',
                            'application/json',
                            'message/rfc822',
                            'audio/mpeg',
                            'audio/mp4',
                            'application/vnd.ms-project',
                            'application/pdf',
                            'image/pjpeg',
                            'text/plain',
                            'image/png',
                            'application/postscript',
                            'application/vnd.ms-powerpoint',
                            'video/quicktime',
                            'application/rtf',
                            'text/css',
                            'image/svg+xml',
                            'application/x-tar',
                            'application/vnd.visio',
                            'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'application/xml',
                            'application/zip'
                        ];
                        supportedTypesField.defaultValue = JSON.stringify(supportedTypes);
                        supportedTypesField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var vendorBillStagingResult = getVendorBillStagingRecord(vendorToBill);
                        log.debug(strDebugTitle, 'Vendor Bill Staging Result: ' + JSON.stringify(vendorBillStagingResult));

                        if (vendorBillStagingResult.length > 0) {
                            var billNumber = vendorBillStagingResult[0].getValue('custrecord_lstcptr_bill_number');
                            var billDate = vendorBillStagingResult[0].getValue('custrecord_lstcptr_bill_date');
                            var amount = vendorBillStagingResult[0].getValue('custrecord_lstcptr_tran_amount_inc_tax');
                            var vendorId = vendorBillStagingResult[0].getValue('custrecord_lstcptr_vendor');
                            log.debug("Vendor: ", vendorId);
                            var lineItems = vendorBillStagingResult[0].getValue('custrecord_lstcptr_json_item_data');
                            log.debug("******Line Items (Raw) ********", lineItems);

                            objRecord.setValue({ fieldId: 'tranid', value: billNumber });
                            log.debug("TranId Set as: ", billNumber);
                            objRecord.setValue({ fieldId: 'trandate', value: billDate });
                            objRecord.setValue({ fieldId: 'usertotal', value: amount });
                            log.debug("Bill Date Set as: ", amount);
                            objRecord.setValue({ fieldId: 'entity', value: vendorId });
                            log.debug("Vendor Set as: ", vendorId);

                            if (lineItems) {
                                var parsedLineItems = JSON.parse(lineItems);
                                log.debug({ title: strDebugTitle, details: "Parsed Line Items: " + JSON.stringify(parsedLineItems) });

                                var expenseLineIndex = objRecord.getLineCount({ sublistId: 'expense' }) || 0;
                                var itemLineIndex = objRecord.getLineCount({ sublistId: 'item' }) || 0;

                                for (var i = 0; i < parsedLineItems.length; i++) {
                                    var currentItem = parsedLineItems[i];
                                    var description = currentItem.Description || '';
                                    log.debug("LineItem Name: ", description);
                                    var quantity = parseFloat(currentItem.Quantity) || 1;
                                    log.debug("Quantity: ", quantity);
                                    var unitPrice = parseFloat(currentItem.Unit_price) || 1;
                                    log.debug("Unit_price: ", unitPrice);
                                    var lineAmount = parseFloat(currentItem.Line_amount) || unitPrice * quantity || 0;
                                    log.debug("Line Amount: ", lineAmount);

                                    log.debug({ title: strDebugTitle, details: "Line " + i + ": Description=" + description + ", Amount=" + lineAmount + ", Quantity=" + quantity });

                                    var categoryIds = getExpenseCategoryIds(description);
                                    var lineItemId = getLineItemIds(description);

                                    try {
                                        if (categoryIds && categoryIds.length > 0) {
                                            var cId = categoryIds[0];
                                            var accId = getExpenseAccountIds(cId);

                                            if (accId) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'account',
                                                    line: expenseLineIndex,
                                                    value: accId
                                                });
                                            }

                                            if (cId) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'category',
                                                    line: expenseLineIndex,
                                                    value: cId
                                                });
                                            }

                                            objRecord.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'amount',
                                                line: expenseLineIndex,
                                                value: lineAmount
                                            });

                                            if (department) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'department',
                                                    line: expenseLineIndex,
                                                    value: department
                                                });
                                            }
                                            if (className) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'class',
                                                    line: expenseLineIndex,
                                                    value: className
                                                });
                                            }
                                            if (location) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'location',
                                                    line: expenseLineIndex,
                                                    value: location
                                                });
                                            }

                                            objRecord.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'memo',
                                                line: expenseLineIndex,
                                                value: 'Expense Item Added : ' + description
                                            });

                                            expenseLineIndex++;
                                        } else if (lineItemId) {
                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'item',
                                                line: itemLineIndex,
                                                value: lineItemId
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                line: itemLineIndex,
                                                value: quantity
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'price',
                                                line: itemLineIndex,
                                                value: -1
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'rate',
                                                line: itemLineIndex,
                                                value: unitPrice
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'amount',
                                                line: itemLineIndex,
                                                value: lineAmount
                                            });

                                            if (department) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'department',
                                                    line: itemLineIndex,
                                                    value: department
                                                });
                                            }

                                            if (className) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'class',
                                                    line: itemLineIndex,
                                                    value: className
                                                });
                                            }

                                            if (location) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'location',
                                                    line: itemLineIndex,
                                                    value: location
                                                });
                                            }

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'description',
                                                line: itemLineIndex,
                                                value: description
                                            });

                                            itemLineIndex++;
                                        }
                                    } catch (error) {
                                        log.error("Error while processing line item " + i, error);
                                    }
                                }
                            } else {
                                log.debug({ title: strDebugTitle, details: "No line items found in custrecord_lstcptr_json_item_data" });
                            }
                        }

                        var inlineHTMLField = form.addField({
                            id: 'custpage_lstcptr_inline_html',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Inline HTML'
                        });

                        log.debug("InlineHtmlField", inlineHTMLField);
                        form.addButton({
                            id: 'custpage_lstcptr_toggle_file_button',
                            label: 'Hide/Show File',
                            functionName: 'togglePdfVisibility'
                        });

                        var leftSideContent = `
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8" />
                            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <title>PDF Viewer</title>
                            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.7.2/font/bootstrap-icons.min.css" integrity="sha512-1fPmaHba3v4A7PaUsComSM4TBsrrRGs+/fv0vrzafQ+Rw+siILTiJa0NtFfvGeyY5E182SDTaF5PqP+XOHgJag==" crossorigin="anonymous" referrerpolicy="no-referrer" />
                            <style>
                                #leftSideContent {
                                    width: 100%;
                                    height: 100%;
                                    position: relative;
                                }
                                #container {
                                    position: relative;
                                    display: inline-block;
                                }
                                canvas {
                                    max-width: 100%;
                                    height: auto;
                                }
                                #output {
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    white-space: pre-wrap;
                                    background-color: #f4f4f4;
                                }
                                #selectionBox {
                                    position: absolute;
                                    border: 2px solid #00BFFF;
                                    display: none;
                                    pointer-events: none;
                                    z-index: 1000;
                                }
                                .highlight-box {
                                    position: absolute;
                                    border: 2px solid yellow;
                                    pointer-events: none;
                                    z-index: 1000;
                                }
                                .hover-box {
                                    position: absolute;
                                    border: 2px solid red;
                                    pointer-events: none;
                                    z-index: 1000;
                                }
                                .hiddenFields {
                                    display: none;
                                }
                                .pagination-container {
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    background-color: #333;
                                    padding: 10px;
                                    color: white;
                                    font-size: 14px;
                                    font-weight: bold;
                                }
                                .pagination-controls {
                                    display: flex;
                                    align-items: center;
                                    justify-content: flex-start;
                                }
                                .zoom-controls {
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    flex-grow: 1;
                                    transform: translateX(-10px);
                                }
                                .action-controls {
                                    display: flex;
                                    align-items: center;
                                    justify-content: flex-end;
                                    transform: translateX(-10px);
                                }
                                .pagination-button,
                                .zoom-button, 
                                .download-btn {
                                    color: white;
                                    margin: 10px;
                                    cursor: pointer;
                                }
                                .large-icon {
                                    font-size: 18px;
                                }
                                .zoom-container {
                                    transform-origin: 50% 0;
                                    transition: transform 0.3s ease;
                                }
                                #pdfWrapper {
                                    position: relative;
                                    width: 100%;
                                    height: 100%;
                                    overflow: scroll;
                                }
                                #pdfCanvas {
                                    display: block;
                                    max-width: none;
                                    max-height: none;
                                }
                                #spinner {
                                    position: absolute;
                                    top: 40%;
                                    left: 50%;
                                    transform: translate(-50%, -50%);
                                    z-index: 9999;
                                    background-color: rgba(255, 255, 255, 0.8);
                                    padding: 20px;
                                    border-radius: 5px;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                }
                                .spinner {
                                    border: 4px solid #f3f3f3;
                                    border-top: 4px solid #3498db;
                                    border-radius: 50%;
                                    width: 50px;
                                    height: 50px;
                                    animation: spin 1s linear infinite;
                                }
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                                #pdfContent {
                                    display: none;
                                }
                                #fileContent {
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    background-color: #f4f4f4;
                                    white-space: pre-wrap;
                                    overflow: auto;
                                    max-height: 80vh;
                                    display: none;
                                }
                                .error-message, .unsupported-message {
                                    padding: 10px;
                                    text-align: center;
                                    color: #333;
                                }
                                .error-message {
                                    color: #d32f2f;
                                }
                            </style>
                            <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@2.15.349/build/pdf.min.js" onerror="console.error('Failed to load pdf.js'); "></script>
                            <script src="https://${accountId}.app.netsuite.com/core/media/media.nl?id=17852&c=${accountId}&h=_d4TpHE1o_ZrrC2zZiu2c-IdBxb8QPcW5OFTtCU7zRMmCOWW&_xt=.js" onerror="console.error('Failed to load NetSuite script'); "></script>
                        </head>
                        <body>
                            <style>
                                body, html {
                                    margin: 0;
                                    padding: 0;
                                    overflow: hidden;
                                }
                                #inlineContent {
                                    position: fixed;
                                    top: 96px;
                                    left: 0;
                                    width: 45%;
                                    height: calc(100vh - 96px);
                                    background-color: #f0f0f0;
                                    overflow-y: auto;
                                    z-index: 1000;
                                }
                                #div__body {
                                    position: absolute;
                                    left: 45%;
                                    width: 55%;
                                    height: calc(100vh - 96px);
                                    background-color: #ffffff;
                                }
                                #main_form {
                                    margin: 0 !important;
                                }
                            </style>
                            <div id="inlineContent">
                                <div id="leftSideContent">
                                    <div id="errorMessage" class="error-message" style="display: none;"></div>
                                    <div id="spinner">
                                        <div class="spinner"></div>
                                        <p>Loading File...</p>
                                    </div>
                                    <div id="pdfContent" class="container mt-4">
                                        <div id="nav">
                                            <div class="pagination-container">
                                                <div class="pagination-controls">
                                                    <a class="pagination-button" id="first-page" title="First Page">
                                                        <i class="bi bi-chevron-bar-left large-icon"></i>
                                                    </a>
                                                    <a class="pagination-button" id="prev_page" title="Previous Page">
                                                        <i class="bi bi-chevron-left large-icon"></i>
                                                    </a>
                                                    <span id="page_num"> </span> / <span id="page_count"></span>
                                                    <a class="pagination-button" id="next_page" title="Next Page">
                                                        <i class="bi bi-chevron-right large-icon"></i>
                                                    </a>
                                                    <a class="pagination-button" id="last-page" title="Last Page">
                                                        <i class="bi bi-chevron-bar-right large-icon"></i>
                                                    </a>
                                                </div>
                                                <div class="zoom-controls">
                                                    <span class="zoom-button" id="zoom_in" title="Zoom In">
                                                        <i class="bi bi-zoom-in large-icon"></i>
                                                    </span>
                                                    <span class="zoom-button" id="zoom_out" title="Zoom Out">
                                                        <i class="bi bi-zoom-out large-icon"></i>
                                                    </span>
                                                    <span class="zoom-button" id="reset_zoom" title="Reset Zoom">
                                                        <i class="bi bi-arrow-counterclockwise large-icon"></i>
                                                    </span>
                                                </div>
                                                <div class="action-controls">
                                                    <a href="${fileUrl}" download="document" class="download-btn" title="Download">
                                                        <i class="bi bi-download large-icon"></i>
                                                    </a>
                                                    <a id="printButton" title="Print" style="background: none; border: none; color: white; font-size: 14px; cursor: pointer;">
                                                        <i class="bi bi-printer large-icon"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="d-flex justify-content-center">
                                            <div class="zoom-container" id="zoomable_content">
                                                <div id="pdfWrapper" style="flex: 1; overflow: auto; position: relative; display: none;">
                                                    <div id="container">
                                                        <canvas id="pdfCanvas"></canvas>
                                                        <div id="selectionBox"></div>
                                                        <div id="hoverBox" class="hover-box" style="display: none;"></div>
                                                        <iframe id="printIframe" style="display: none;"></iframe>
                                                    </div>
                                                </div>
                                                <img id="imageViewer" style="display: none; max-width: 100%; height: auto;" />
                                                <div id="fileContent" style="display: none;"></div>
                                                <div id="unsupportedMessage" class="unsupported-message" style="display: none;">
                                                    <p>This file type cannot be previewed in the browser.</p>
                                                    <a href="${fileUrl}" download="document">Download File</a>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="text" id="searchInput" class="hiddenFields" placeholder="Enter text to search..." />
                                        <h3 class="hiddenFields">Extracted Text from Selected Area:</h3>
                                        <div id="output" class="hiddenFields">No text extracted yet.</div>
                                        <input type="hidden" id="hiddenTextField" class="hiddenFields" name="custpage_hidden_text" value="" />
                                    </div>
                                </div>
                            </div>
                            <script>
                                (function () {
                                    document.addEventListener('DOMContentLoaded', function () {
                                       // const showPdfByDefault = document.getElementById('custpage_lstcptr_show_file')?.value === 'true';
                                        var showFileByDefault = document.getElementById('custpage_lstcptr_show_file').value === 'true';
                                        const inlineContent = document.getElementById('inlineContent');
                                        const bodyElement = document.getElementById('div__body');

                                        if (!inlineContent || !bodyElement) {
                                            console.error('Layout elements missing');
                                            return;
                                        }

                                        // Always show split-screen by default
                                        inlineContent.style.display = 'block';
                                        bodyElement.style.left = '45%';
                                        bodyElement.style.width = '55%';
                                    });
                                })();

                                function showErrorMessage(message) {
                                    console.error(message);
                                    const errorMessage = document.getElementById('errorMessage');
                                    const pdfContent = document.getElementById('pdfContent');
                                    const spinner = document.getElementById('spinner');
                                    if (errorMessage && pdfContent && spinner) {
                                        spinner.style.display = 'none';
                                        pdfContent.style.display = 'block';
                                        errorMessage.textContent = message;
                                        errorMessage.style.display = 'block';
                                    }
                                }

                                function togglePdfVisibility() {
                                    const inlineContent = document.getElementById('inlineContent');
                                    const bodyElement = document.getElementById('div__body');

                                    if (!inlineContent || !bodyElement) {
                                        console.error('Cannot toggle visibility. Layout elements missing.');
                                        return;
                                    }

                                    const isHidden = window.getComputedStyle(inlineContent).display === 'none';
                                    if (isHidden) {
                                        inlineContent.style.display = 'block';
                                        bodyElement.style.left = '45%';
                                        bodyElement.style.width = '55%';
                                    } else {
                                        inlineContent.style.display = 'none';
                                        bodyElement.style.left = '0';
                                        bodyElement.style.width = '100%';
                                    }
                                }

                                const fileUrl = '${fileUrl}';
                                const fileType = '${fileType}';
                                const fileExtension = '${fileExtension}';
                                const supportedTypes = ${JSON.stringify(supportedTypes)};
                                const pdfCanvas = document.getElementById('pdfCanvas');
                                const ctx = pdfCanvas.getContext('2d');
                                const outputDiv = document.getElementById('output');
                                const hiddenTextField = document.getElementById('hiddenTextField');
                                const searchInput = document.getElementById('searchInput');
                                const hoverBox = document.getElementById('hoverBox');
                                const zoomableContent = document.getElementById('zoomable_content');
                                const zoomInButton = document.getElementById('zoom_in');
                                const zoomOutButton = document.getElementById('zoom_out');
                                const resetZoomButton = document.getElementById('reset_zoom');
                                const pdfContent = document.getElementById('pdfContent');
                                const pdfWrapper = document.getElementById('pdfWrapper');
                                const imageViewer = document.getElementById('imageViewer');
                                const fileContent = document.getElementById('fileContent');
                                const errorMessage = document.getElementById('errorMessage');
                                const unsupportedMessage = document.getElementById('unsupportedMessage');
                                const spinner = document.getElementById('spinner');

                                function calculateZoom() {
                                    const width = window.innerWidth;
                                    const desiredWidth = 2050;
                                    let zoom;
                                    if (width < 600) {
                                        zoom = 0.7;
                                    } else if (width < 1200) {
                                        zoom = 1;
                                    } else {
                                        zoom = 1.5;
                                    }
                                    return zoom * (width / desiredWidth);
                                }

                                let pdfTextContent = [];
                                let pdfPageViewport;
                                const initialState = {
                                    pdfDoc: null,
                                    currentPage: 1,
                                    pageCount: 0,
                                    zoom: calculateZoom(),
                                    minZoom: 0.5,
                                    maxZoom: 3
                                };

                                function renderPage() {
                                    console.log('Rendering PDF page:', initialState.currentPage);
                                    if (!initialState.pdfDoc) {
                                        console.error('PDF document not loaded');
                                        return;
                                    }
                                    initialState.pdfDoc.getPage(initialState.currentPage).then(page => {
                                        clearHighlights();
                                        pdfPageViewport = page.getViewport({ scale: initialState.zoom });
                                        pdfCanvas.width = pdfPageViewport.width;
                                        pdfCanvas.height = pdfPageViewport.height;
                                        const renderContext = {
                                            canvasContext: ctx,
                                            viewport: pdfPageViewport
                                        };
                                        page.render(renderContext).promise.then(() => {
                                            document.getElementById('page_num').textContent = initialState.currentPage;
                                            page.getTextContent().then(textContent => {
                                                pdfTextContent = textContent.items;
                                                spinner.style.display = 'none';
                                                pdfContent.style.display = 'block';
                                                console.log('PDF page rendered successfully');
                                                if (initialState.currentPage === 1) {
                                                    document.getElementById('first-page').style.opacity = '0.5';
                                                    document.getElementById('prev_page').style.opacity = '0.5';
                                                } else {
                                                    document.getElementById('first-page').style.opacity = '1';
                                                    document.getElementById('prev_page').style.opacity = '1';
                                                }
                                                if (initialState.currentPage === initialState.pdfDoc.numPages) {
                                                    document.getElementById('next_page').style.opacity = '0.5';
                                                    document.getElementById('last-page').style.opacity = '0.5';
                                                } else {
                                                    document.getElementById('next_page').style.opacity = '1';
                                                    document.getElementById('last-page').style.opacity = '1';
                                                }
                                            }).catch(err => {
                                                console.error('Error getting text content:', err);
                                                showErrorMessage('Failed to extract PDF text: ' + err.message);
                                            });
                                        }).catch(err => {
                                            console.error('Error rendering PDF page:', err);
                                            showErrorMessage('Failed to render PDF page: ' + err.message);
                                        });
                                    }).catch(err => {
                                        console.error('Error loading PDF page:', err);
                                        showErrorMessage('Failed to load PDF page: ' + err.message);
                                    });
                                }

                                function clearHighlights() {
                                    const existingHighlights = document.querySelectorAll('.highlight-box');
                                    existingHighlights.forEach(highlight => highlight.remove());
                                }

                                function initializeViewer() {
                                    console.log('Initializing viewer for file:', fileUrl);
                                    console.log('File type:', fileType, 'Extension:', fileExtension);

                                    // Always show pdfContent to maintain split-screen
                                    pdfContent.style.display = 'block';
                                    spinner.style.display = 'none';

                                    if (!fileUrl) {
                                        console.error('Invalid or missing file URL');
                                        showErrorMessage('No valid file URL provided. Please check the file configuration.');
                                        return;
                                    }

                                    if (!supportedTypes || supportedTypes.length === 0) {
                                        console.error('Supported types not defined');
                                        showErrorMessage('Supported file types not defined.');
                                        return;
                                    }

                                    const isSupported = supportedTypes.includes(fileType) || 
                                                    supportedTypes.includes('application/octet-stream') || 
                                                    (fileExtension && supportedTypes.some(type => fileExtension.toLowerCase().match(type.split('/')[1])));
                                    console.log('Is file supported?', isSupported);

                                    if (!isSupported) {
                                        console.log('Unsupported file type');
                                        unsupportedMessage.style.display = 'block';
                                        return;
                                    }

                                    const imageTypes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon'];
                                    const textTypes = ['text/plain', 'text/csv', 'text/html', 'text/css', 'application/javascript', 'application/json', 'application/xml', 'text/cache-manifest', 'application/rtf', 'message/rfc822'];
                                    const pdfType = ['application/pdf'];
                                    const unsupportedPreviewTypes = [
                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                        'application/vnd.ms-excel',
                                        'application/x-shockwave-flash',
                                        'application/vnd.ms-project',
                                        'application/vnd.ms-powerpoint',
                                        'application/msword',
                                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                        'application/zip',
                                        'application/x-tar',
                                        'application/vnd.visio',
                                        'application/postscript',
                                        'video/quicktime',
                                        'audio/mpeg',
                                        'audio/mp4',
                                        'application/pkix-cert'
                                    ];

                                    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'ico'];
                                    const textExtensions = ['txt', 'csv', 'html', 'htm', 'css', 'js', 'json', 'xml', 'rtf', 'eml', 'appcache'];
                                    const unsupportedExtensions = ['xlsx', 'xls', 'swf', 'mpp', 'ppt', 'doc', 'docx', 'zip', 'tar', 'vsdx', 'ps', 'mov', 'mp3', 'm4a', 'csr'];

                                    if (pdfType.includes(fileType) || (fileExtension && fileExtension.toLowerCase() === 'pdf')) {
                                        console.log('Loading PDF file');
                                        document.getElementById('nav').style.display = 'flex';
                                        pdfWrapper.style.display = 'block';
                                        pdfjsLib.getDocument({ url: fileUrl }).promise.then(data => {
                                            initialState.pdfDoc = data;
                                            document.getElementById('page_count').textContent = initialState.pdfDoc.numPages;
                                            console.log('PDF loaded, rendering first page');
                                            renderPage();
                                        }).catch(err => {
                                            console.error('Error loading PDF:', err);
                                            showErrorMessage('Failed to load PDF: ' + err.message);
                                        });
                                    } else if (imageTypes.includes(fileType) || (fileExtension && imageExtensions.includes(fileExtension.toLowerCase()))) {
                                        console.log('Loading image file');
                                        imageViewer.src = fileUrl;
                                        imageViewer.onload = () => {
                                            console.log('Image loaded successfully');
                                            spinner.style.display = 'none';
                                            pdfContent.style.display = 'block';
                                            imageViewer.style.display = 'block';
                                        };
                                        imageViewer.onerror = () => {
                                            console.error('Error loading image');
                                            showErrorMessage('Failed to load image: Unable to access the file.');
                                        };
                                    } else if (textTypes.includes(fileType) || (fileExtension && textExtensions.includes(fileExtension.toLowerCase()))) {
                                        console.log('Loading text file');
                                        fetch(fileUrl)
                                            .then(response => {
                                                console.log('Text fetch response:', response);
                                                if (!response.ok) {
                                                    throw new Error('Network response was not ok');
                                                }
                                                return response.text();
                                            })
                                            .then(text => {
                                                console.log('Text file loaded successfully');
                                                spinner.style.display = 'none';
                                                pdfContent.style.display = 'block';
                                                fileContent.style.display = 'block';
                                                fileContent.textContent = text;
                                                if (fileType === 'application/json' || (fileExtension && fileExtension.toLowerCase() === 'json')) {
                                                    try {
                                                        const json = JSON.parse(text);
                                                        fileContent.textContent = JSON.stringify(json, null, 2);
                                                        console.log('JSON parsed and formatted');
                                                    } catch (e) {
                                                        console.error('Invalid JSON:', e);
                                                        fileContent.textContent = text;
                                                    }
                                                }
                                                if (fileType === 'text/html' || (fileExtension && ['html', 'htm'].includes(fileExtension.toLowerCase()))) {
                                                    fileContent.innerHTML = text;
                                                    console.log('HTML content rendered');
                                                }
                                            })
                                            .catch(err => {
                                                console.error('Error loading text file:', err);
                                                showErrorMessage('Failed to load text file: ' + err.message);
                                            });
                                    } else if (unsupportedPreviewTypes.includes(fileType) || (fileExtension && unsupportedExtensions.includes(fileExtension.toLowerCase()))) {
                                        console.log('File type not previewable');
                                        spinner.style.display = 'none';
                                        pdfContent.style.display = 'block';
                                        unsupportedMessage.style.display = 'block';
                                    } else {
                                        console.log('Fallback to unsupported file type');
                                        spinner.style.display = 'none';
                                        pdfContent.style.display = 'block';
                                        unsupportedMessage.style.display = 'block';
                                    }
                                }

                                console.log('Starting viewer initialization');
                                initializeViewer();

                                document.getElementById('first-page').addEventListener('click', () => {
                                    if (initialState.currentPage !== 1) {
                                        initialState.currentPage = 1;
                                        renderPage();
                                    }
                                });

                                document.getElementById('prev_page').addEventListener('click', () => {
                                    if (initialState.currentPage > 1) {
                                        initialState.currentPage--;
                                        renderPage();
                                    }
                                });

                                document.getElementById('next_page').addEventListener('click', () => {
                                    if (initialState.currentPage < initialState.pdfDoc?.numPages) {
                                        initialState.currentPage++;
                                        renderPage();
                                    }
                                });

                                document.getElementById('last-page').addEventListener('click', () => {
                                    if (initialState.currentPage !== initialState.pdfDoc?.numPages) {
                                        initialState.currentPage = initialState.pdfDoc.numPages;
                                        renderPage();
                                    }
                                });

                                zoomInButton.addEventListener('click', () => {
                                    if (initialState.zoom < initialState.maxZoom) {
                                        initialState.zoom += 0.1;
                                        renderPage();
                                        updateHorizontalScroll();
                                    }
                                });

                                zoomOutButton.addEventListener('click', () => {
                                    if (initialState.zoom > initialState.minZoom) {
                                        initialState.zoom -= 0.1;
                                        renderPage();
                                        updateHorizontalScroll();
                                    }
                                });

                                resetZoomButton.addEventListener('click', () => {
                                    initialState.zoom = calculateZoom();
                                    renderPage();
                                    updateHorizontalScroll();
                                });

                                document.getElementById('printButton').addEventListener('click', () => {
                                    const printIframe = document.getElementById('printIframe');
                                    printIframe.src = fileUrl;
                                    printIframe.onload = () => {
                                        printIframe.contentWindow.print();
                                    };
                                    printIframe.onerror = () => {
                                        showErrorMessage('Failed to load file for printing.');
                                    };
                                });

                                function updateHorizontalScroll() {
                                    const canvasWidth = pdfCanvas.width;
                                    const wrapperWidth = pdfWrapper.offsetWidth;
                                    if (canvasWidth > wrapperWidth) {
                                        pdfWrapper.scrollLeft = (canvasWidth - wrapperWidth) / 2;
                                    }
                                }

                                let startX = 0, startY = 0, isSelecting = false;
                                let lastHoveredItem = null;

                                pdfCanvas.addEventListener('mousedown', e => {
                                    startX = e.offsetX;
                                    startY = e.offsetY;
                                    isSelecting = true;
                                    selectionBox.style.left = startX + 'px';
                                    selectionBox.style.top = startY + 'px';
                                    selectionBox.style.width = '0';
                                    selectionBox.style.height = '0';
                                    selectionBox.style.display = 'block';
                                });

                                pdfCanvas.addEventListener('mousemove', e => {
                                    if (isSelecting) {
                                        const width = e.offsetX - startX;
                                        const height = e.offsetY - startY;
                                        selectionBox.style.width = width + 'px';
                                        selectionBox.style.height = height + 'px';
                                    }
                                    const rect = pdfCanvas.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    let hoveredItem = null;

                                    for (let item of pdfTextContent) {
                                        const scale = initialState.zoom;
                                        const left = item.transform[4] * scale;
                                        const top = pdfPageViewport?.height - (item.transform[5] * scale);
                                        const width = item.width * scale;
                                        const height = item.height * scale;

                                        if (x >= left && x <= left + width && y >= top - height && y <= top) {
                                            hoveredItem = item;
                                            break;
                                        }
                                    }

                                    if (hoveredItem !== lastHoveredItem) {
                                        lastHoveredItem = hoveredItem;
                                        if (hoveredItem) {
                                            const scale = initialState.zoom;
                                            const left = hoveredItem.transform[4] * scale;
                                            const top = pdfPageViewport?.height - (hoveredItem.transform[5] * scale);
                                            const width = hoveredItem.width * scale;
                                            const height = hoveredItem.height * scale;
                                            hoverBox.style.left = left + 'px';
                                            hoverBox.style.top = (top - height) + 'px';
                                            hoverBox.style.width = width + 'px';
                                            hoverBox.style.height = height + 'px';
                                            hoverBox.style.display = 'block';
                                        } else {
                                            hoverBox.style.display = 'none';
                                        }
                                    }
                                });

                                pdfCanvas.addEventListener('mouseup', e => {
                                    if (isSelecting) {
                                        isSelecting = false;
                                        selectionBox.style.display = 'none';
                                        const endX = e.offsetX;
                                        const endY = e.offsetY;
                                        const selectedText = [];
                                        const selectedItems = [];

                                        for (let item of pdfTextContent) {
                                            const scale = initialState.zoom;
                                            const left = item.transform[4] * scale;
                                            const top = pdfPageViewport?.height - (item.transform[5] * scale);
                                            const width = item.width * scale;
                                            const height = item.height * scale;

                                            const selectionLeft = Math.min(startX, endX);
                                            const selectionRight = Math.max(startX, endX);
                                            const selectionTop = Math.min(startY, endY);
                                            const selectionBottom = Math.max(startY, endY);

                                            if (
                                                left + width >= selectionLeft &&
                                                left <= selectionRight &&
                                                top >= selectionTop &&
                                                top - height <= selectionBottom
                                            ) {
                                                selectedText.push(item.str);
                                                selectedItems.push({
                                                    text: item.str,
                                                    left: left,
                                                    top: top - height,
                                                    width: width,
                                                    height: height
                                                });
                                            }
                                        }

                                        const extractedText = selectedText.join(' ');
                                        outputDiv.textContent = extractedText || 'No text extracted yet.';
                                        hiddenTextField.value = extractedText;

                                        selectedItems.forEach(item => {
                                            const highlight = document.createElement('div');
                                            highlight.className = 'highlight-box';
                                            highlight.style.left = item.left + 'px';
                                            highlight.style.top = item.top + 'px';
                                            highlight.style.width = item.width + 'px';
                                            highlight.style.height = item.height + 'px';
                                            document.getElementById('container').appendChild(highlight);
                                        });
                                    }
                                });

                                searchInput.addEventListener('input', () => {
                                    const searchTerm = searchInput.value.toLowerCase();
                                    clearHighlights();

                                    if (searchTerm) {
                                        pdfTextContent.forEach(item => {
                                            if (item.str.toLowerCase().includes(searchTerm)) {
                                                const scale = initialState.zoom;
                                                const left = item.transform[4] * scale;
                                                const top = pdfPageViewport?.height - (item.transform[5] * scale);
                                                const width = item.width * scale;
                                                const height = item.height * scale;

                                                const highlight = document.createElement('div');
                                                highlight.className = 'highlight-box';
                                                highlight.style.left = left + 'px';
                                                highlight.style.top = (top - height) + 'px';
                                                highlight.style.width = width + 'px';
                                                highlight.style.height = height + 'px';
                                                document.getElementById('container').appendChild(highlight);
                                            }
                                        });
                                    }
                                });
                            </script>
                        </body>
                        </html>
                        `;
                        inlineHTMLField.defaultValue = leftSideContent;
                    }
                }
                else if ((strType == context.UserEventType.EDIT && showPdfOnEdit === true) &&
                    (runtime.executionContext == runtime.ContextType.USER_INTERFACE ||
                        runtime.executionContext == runtime.ContextType.WEBAPPLICATION ||
                        runtime.executionContext == runtime.ContextType.SUITELET)) {
                    log.debug("Context Type: ", strType);
                    log.audit("Show PDF on Edit: ", showPdfOnEdit);
                    log.debug("Execution Context: ", runtime.executionContext);
                    var billProcessId = context.newRecord.getValue({ fieldId: 'custbody_lst_vendor_bill_process' });
                    log.debug("Bill Process ID: ", billProcessId);
                    // get the file id by lookup field
                    if (isThereValue(billProcessId)) {
                        try {
                            var billProcessRecord = record.load({
                                type: 'customrecord_lstcptr_vendor_bill_process',
                                id: billProcessId,
                                isDynamic: false
                            });

                            var fileId = billProcessRecord.getValue({ fieldId: 'custrecord_lstcptr_pdf_file' });
                            log.audit(strDebugTitle, 'File ID from Vendor Bill Process Record: ' + fileId);

                            if (fileId) {
                                try {
                                    var fileObj = file.load({ id: fileId });
                                    var nsfileUrl = fileObj.url;
                                    var accountId = runtime.accountId;
                                    fileUrl = `https://${accountId}.app.netsuite.com${nsfileUrl}`;
                                    log.audit(strDebugTitle, 'File URL: ' + fileUrl);
                                } catch (e) {
                                    log.error('Error loading file', e.message);
                                }
                            }
                        } catch (e) {
                            log.error('Error loading Vendor Bill Process record', e.message);
                        }
                    } else {
                        log.debug("No Vendor Bill Process record found for billProcessId: ", billProcessId);
                    }
                    if (isThereValue(billProcessId)) {
                        objRecord.setValue({ fieldId: 'department', value: department });
                        objRecord.setValue({ fieldId: 'class', value: className });
                        objRecord.setValue({ fieldId: 'location', value: location });
                        objRecord.setValue({ fieldId: 'account', value: apAccount });
                        objRecord.setValue({ fieldId: 'currency', value: currency });

                        // Add hidden fields for file URL, type, and extension
                        var fileUrlField = form.addField({
                            id: 'custpage_lstcptr_file_url',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File URL'
                        });
                        fileUrlField.defaultValue = fileUrl;
                        fileUrlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var showFileField = form.addField({
                            id: 'custpage_lstcptr_show_file',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Show PDF'
                        });
                        showFileField.defaultValue = showPdfOnEdit;
                        showFileField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var fileTypeField = form.addField({
                            id: 'custpage_file_type',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File Type'
                        });
                        var fileType = fileObj ? fileObj.fileType : 'application/pdf';
                        var fileExtension = fileUrl ? fileUrl.split('.').pop().toLowerCase() : 'pdf';
                        log.debug("File Type: ", fileType);
                        fileTypeField.defaultValue = fileType;
                        fileTypeField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var fileExtensionField = form.addField({
                            id: 'custpage_file_extension',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File Extension'
                        });
                        fileExtensionField.defaultValue = fileExtension;
                        fileExtensionField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var supportedTypesField = form.addField({
                            id: 'custpage_supported_types',
                            type: serverWidget.FieldType.LONGTEXT,
                            label: 'Supported Types'
                        });
                        var supportedTypes = [
                            'text/cache-manifest',
                            'application/octet-stream',
                            'image/bmp',
                            'application/pkix-cert',
                            'text/csv',
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'application/vnd.ms-excel',
                            'application/x-shockwave-flash',
                            'image/gif',
                            'text/html',
                            'image/x-icon',
                            'application/javascript',
                            'image/jpeg',
                            'image/tiff',
                            'application/json',
                            'message/rfc822',
                            'audio/mpeg',
                            'audio/mp4',
                            'application/vnd.ms-project',
                            'application/pdf',
                            'image/pjpeg',
                            'text/plain',
                            'image/png',
                            'application/postscript',
                            'application/vnd.ms-powerpoint',
                            'video/quicktime',
                            'application/rtf',
                            'text/css',
                            'image/svg+xml',
                            'application/x-tar',
                            'application/vnd.visio',
                            'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'application/xml',
                            'application/zip'
                        ];
                        supportedTypesField.defaultValue = JSON.stringify(supportedTypes);
                        supportedTypesField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var vendorBillStagingResult = getVendorBillStagingRecord(billProcessId);
                        log.debug(strDebugTitle, 'Vendor Bill Staging Result: ' + JSON.stringify(vendorBillStagingResult));

                        if (vendorBillStagingResult.length > 0) {
                            var billNumber = vendorBillStagingResult[0].getValue('custrecord_lstcptr_bill_number');
                            var billDate = vendorBillStagingResult[0].getValue('custrecord_lstcptr_bill_date');
                            var amount = vendorBillStagingResult[0].getValue('custrecord_lstcptr_tran_amount_inc_tax');
                            var vendorId = vendorBillStagingResult[0].getValue('custrecord_lstcptr_vendor');
                            log.debug("Vendor: ", vendorId);
                            var lineItems = vendorBillStagingResult[0].getValue('custrecord_lstcptr_json_item_data');
                            log.debug("******Line Items (Raw) ********", lineItems);

                            objRecord.setValue({ fieldId: 'tranid', value: billNumber });
                            log.debug("TranId Set as: ", billNumber);
                            objRecord.setValue({ fieldId: 'trandate', value: billDate });
                            objRecord.setValue({ fieldId: 'usertotal', value: amount });
                            log.debug("Bill Date Set as: ", amount);
                            objRecord.setValue({ fieldId: 'entity', value: vendorId });
                            log.debug("Vendor Set as: ", vendorId);

                            if (lineItems) {
                                var parsedLineItems = JSON.parse(lineItems);
                                log.debug({ title: strDebugTitle, details: "Parsed Line Items: " + JSON.stringify(parsedLineItems) });

                                var expenseLineIndex = objRecord.getLineCount({ sublistId: 'expense' }) || 0;
                                var itemLineIndex = objRecord.getLineCount({ sublistId: 'item' }) || 0;

                                for (var i = 0; i < parsedLineItems.length; i++) {
                                    var currentItem = parsedLineItems[i];
                                    var description = currentItem.Description || '';
                                    log.debug("LineItem Name: ", description);
                                    var quantity = parseFloat(currentItem.Quantity) || 1;
                                    log.debug("Quantity: ", quantity);
                                    var unitPrice = parseFloat(currentItem.Unit_price) || 1;
                                    log.debug("Unit_price: ", unitPrice);
                                    var lineAmount = parseFloat(currentItem.Line_amount) || unitPrice * quantity || 0;
                                    log.debug("Line Amount: ", lineAmount);

                                    log.debug({ title: strDebugTitle, details: "Line " + i + ": Description=" + description + ", Amount=" + lineAmount + ", Quantity=" + quantity });

                                    var categoryIds = getExpenseCategoryIds(description);
                                    var lineItemId = getLineItemIds(description);

                                    try {
                                        if (categoryIds && categoryIds.length > 0) {
                                            var cId = categoryIds[0];
                                            var accId = getExpenseAccountIds(cId);

                                            if (accId) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'account',
                                                    line: expenseLineIndex,
                                                    value: accId
                                                });
                                            }

                                            if (cId) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'category',
                                                    line: expenseLineIndex,
                                                    value: cId
                                                });
                                            }

                                            objRecord.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'amount',
                                                line: expenseLineIndex,
                                                value: lineAmount
                                            });

                                            if (department) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'department',
                                                    line: expenseLineIndex,
                                                    value: department
                                                });
                                            }
                                            if (className) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'class',
                                                    line: expenseLineIndex,
                                                    value: className
                                                });
                                            }
                                            if (location) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'expense',
                                                    fieldId: 'location',
                                                    line: expenseLineIndex,
                                                    value: location
                                                });
                                            }

                                            objRecord.setSublistValue({
                                                sublistId: 'expense',
                                                fieldId: 'memo',
                                                line: expenseLineIndex,
                                                value: 'Expense Item Added : ' + description
                                            });

                                            expenseLineIndex++;
                                        } else if (lineItemId) {
                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'item',
                                                line: itemLineIndex,
                                                value: lineItemId
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                line: itemLineIndex,
                                                value: quantity
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'price',
                                                line: itemLineIndex,
                                                value: -1
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'rate',
                                                line: itemLineIndex,
                                                value: unitPrice
                                            });

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'amount',
                                                line: itemLineIndex,
                                                value: lineAmount
                                            });

                                            if (department) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'department',
                                                    line: itemLineIndex,
                                                    value: department
                                                });
                                            }

                                            if (className) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'class',
                                                    line: itemLineIndex,
                                                    value: className
                                                });
                                            }

                                            if (location) {
                                                objRecord.setSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'location',
                                                    line: itemLineIndex,
                                                    value: location
                                                });
                                            }

                                            objRecord.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'description',
                                                line: itemLineIndex,
                                                value: description
                                            });

                                            itemLineIndex++;
                                        }
                                    } catch (error) {
                                        log.error("Error while processing line item " + i, error);
                                    }
                                }
                            } else {
                                log.debug({ title: strDebugTitle, details: "No line items found in custrecord_lstcptr_json_item_data" });
                            }
                        }

                        var inlineHTMLField = form.addField({
                            id: 'custpage_lstcptr_inline_html',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Inline HTML'
                        });

                        log.debug("InlineHtmlField", inlineHTMLField);
                        form.addButton({
                            id: 'custpage_lstcptr_toggle_file_button',
                            label: 'Hide/Show File',
                            functionName: 'togglePdfVisibility'
                        });

                        var leftSideContent = `
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8" />
                            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                            <title>PDF Viewer</title>
                            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.7.2/font/bootstrap-icons.min.css" integrity="sha512-1fPmaHba3v4A7PaUsComSM4TBsrrRGs+/fv0vrzafQ+Rw+siILTiJa0NtFfvGeyY5E182SDTaF5PqP+XOHgJag==" crossorigin="anonymous" referrerpolicy="no-referrer" />
                            <style>
                                #leftSideContent {
                                    width: 100%;
                                    height: 100%;
                                    position: relative;
                                }
                                #container {
                                    position: relative;
                                    display: inline-block;
                                }
                                canvas {
                                    max-width: 100%;
                                    height: auto;
                                }
                                #output {
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    white-space: pre-wrap;
                                    background-color: #f4f4f4;
                                }
                                #selectionBox {
                                    position: absolute;
                                    border: 2px solid #00BFFF;
                                    display: none;
                                    pointer-events: none;
                                    z-index: 1000;
                                }
                                .highlight-box {
                                    position: absolute;
                                    border: 2px solid yellow;
                                    pointer-events: none;
                                    z-index: 1000;
                                }
                                .hover-box {
                                    position: absolute;
                                    border: 2px solid red;
                                    pointer-events: none;
                                    z-index: 1000;
                                }
                                .hiddenFields {
                                    display: none;
                                }
                                .pagination-container {
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    background-color: #333;
                                    padding: 10px;
                                    color: white;
                                    font-size: 14px;
                                    font-weight: bold;
                                }
                                .pagination-controls {
                                    display: flex;
                                    align-items: center;
                                    justify-content: flex-start;
                                }
                                .zoom-controls {
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    flex-grow: 1;
                                    transform: translateX(-10px);
                                }
                                .action-controls {
                                    display: flex;
                                    align-items: center;
                                    justify-content: flex-end;
                                    transform: translateX(-10px);
                                }
                                .pagination-button,
                                .zoom-button, 
                                .download-btn {
                                    color: white;
                                    margin: 10px;
                                    cursor: pointer;
                                }
                                .large-icon {
                                    font-size: 18px;
                                }
                                .zoom-container {
                                    transform-origin: 50% 0;
                                    transition: transform 0.3s ease;
                                }
                                #pdfWrapper {
                                    position: relative;
                                    width: 100%;
                                    height: 100%;
                                    overflow: scroll;
                                }
                                #pdfCanvas {
                                    display: block;
                                    max-width: none;
                                    max-height: none;
                                }
                                #spinner {
                                    position: absolute;
                                    top: 40%;
                                    left: 50%;
                                    transform: translate(-50%, -50%);
                                    z-index: 9999;
                                    background-color: rgba(255, 255, 255, 0.8);
                                    padding: 20px;
                                    border-radius: 5px;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                }
                                .spinner {
                                    border: 4px solid #f3f3f3;
                                    border-top: 4px solid #3498db;
                                    border-radius: 50%;
                                    width: 50px;
                                    height: 50px;
                                    animation: spin 1s linear infinite;
                                }
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                                #pdfContent {
                                    display: none;
                                }
                                #fileContent {
                                    padding: 10px;
                                    border: 1px solid #ddd;
                                    background-color: #f4f4f4;
                                    white-space: pre-wrap;
                                    overflow: auto;
                                    max-height: 80vh;
                                    display: none;
                                }
                                .error-message, .unsupported-message {
                                    padding: 10px;
                                    text-align: center;
                                    color: #333;
                                }
                                .error-message {
                                    color: #d32f2f;
                                }
                            </style>
                            <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@2.15.349/build/pdf.min.js" onerror="console.error('Failed to load pdf.js'); "></script>
                            <script src="https://${accountId}.app.netsuite.com/core/media/media.nl?id=17852&c=${accountId}&h=_d4TpHE1o_ZrrC2zZiu2c-IdBxb8QPcW5OFTtCU7zRMmCOWW&_xt=.js" onerror="console.error('Failed to load NetSuite script'); "></script>
                        </head>
                        <body>
                            <style>
                                body, html {
                                    margin: 0;
                                    padding: 0;
                                    overflow: hidden;
                                }
                                #inlineContent {
                                    position: fixed;
                                    top: 96px;
                                    left: 0;
                                    width: 45%;
                                    height: calc(100vh - 96px);
                                    background-color: #f0f0f0;
                                    overflow-y: auto;
                                    z-index: 1000;
                                }
                                #div__body {
                                    position: absolute;
                                    left: 45%;
                                    width: 55%;
                                    height: calc(100vh - 96px);
                                    background-color: #ffffff;
                                }
                                #main_form {
                                    margin: 0 !important;
                                }
                            </style>
                            <div id="inlineContent">
                                <div id="leftSideContent">
                                    <div id="errorMessage" class="error-message" style="display: none;"></div>
                                    <div id="spinner">
                                        <div class="spinner"></div>
                                        <p>Loading File...</p>
                                    </div>
                                    <div id="pdfContent" class="container mt-4">
                                        <div id="nav">
                                            <div class="pagination-container">
                                                <div class="pagination-controls">
                                                    <a class="pagination-button" id="first-page" title="First Page">
                                                        <i class="bi bi-chevron-bar-left large-icon"></i>
                                                    </a>
                                                    <a class="pagination-button" id="prev_page" title="Previous Page">
                                                        <i class="bi bi-chevron-left large-icon"></i>
                                                    </a>
                                                    <span id="page_num"> </span> / <span id="page_count"></span>
                                                    <a class="pagination-button" id="next_page" title="Next Page">
                                                        <i class="bi bi-chevron-right large-icon"></i>
                                                    </a>
                                                    <a class="pagination-button" id="last-page" title="Last Page">
                                                        <i class="bi bi-chevron-bar-right large-icon"></i>
                                                    </a>
                                                </div>
                                                <div class="zoom-controls">
                                                    <span class="zoom-button" id="zoom_in" title="Zoom In">
                                                        <i class="bi bi-zoom-in large-icon"></i>
                                                    </span>
                                                    <span class="zoom-button" id="zoom_out" title="Zoom Out">
                                                        <i class="bi bi-zoom-out large-icon"></i>
                                                    </span>
                                                    <span class="zoom-button" id="reset_zoom" title="Reset Zoom">
                                                        <i class="bi bi-arrow-counterclockwise large-icon"></i>
                                                    </span>
                                                </div>
                                                <div class="action-controls">
                                                    <a href="${fileUrl}" download="document" class="download-btn" title="Download">
                                                        <i class="bi bi-download large-icon"></i>
                                                    </a>
                                                    <a id="printButton" title="Print" style="background: none; border: none; color: white; font-size: 14px; cursor: pointer;">
                                                        <i class="bi bi-printer large-icon"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="d-flex justify-content-center">
                                            <div class="zoom-container" id="zoomable_content">
                                                <div id="pdfWrapper" style="flex: 1; overflow: auto; position: relative; display: none;">
                                                    <div id="container">
                                                        <canvas id="pdfCanvas"></canvas>
                                                        <div id="selectionBox"></div>
                                                        <div id="hoverBox" class="hover-box" style="display: none;"></div>
                                                        <iframe id="printIframe" style="display: none;"></iframe>
                                                    </div>
                                                </div>
                                                <img id="imageViewer" style="display: none; max-width: 100%; height: auto;" />
                                                <div id="fileContent" style="display: none;"></div>
                                                <div id="unsupportedMessage" class="unsupported-message" style="display: none;">
                                                    <p>This file type cannot be previewed in the browser.</p>
                                                    <a href="${fileUrl}" download="document">Download File</a>
                                                </div>
                                            </div>
                                        </div>
                                        <input type="text" id="searchInput" class="hiddenFields" placeholder="Enter text to search..." />
                                        <h3 class="hiddenFields">Extracted Text from Selected Area:</h3>
                                        <div id="output" class="hiddenFields">No text extracted yet.</div>
                                        <input type="hidden" id="hiddenTextField" class="hiddenFields" name="custpage_hidden_text" value="" />
                                    </div>
                                </div>
                            </div>
                            <script>
                                (function () {
                                    document.addEventListener('DOMContentLoaded', function () {
                                        var showFileByDefault = document.getElementById('custpage_lstcptr_show_file').value === 'true';
                                        const inlineContent = document.getElementById('inlineContent');
                                        const bodyElement = document.getElementById('div__body');

                                        if (!inlineContent || !bodyElement) {
                                            console.error('Layout elements missing');
                                            return;
                                        }

                                        // Always show split-screen by default
                                        inlineContent.style.display = 'block';
                                        bodyElement.style.left = '45%';
                                        bodyElement.style.width = '55%';
                                    });
                                })();

                                function showErrorMessage(message) {
                                    console.error(message);
                                    const errorMessage = document.getElementById('errorMessage');
                                    const pdfContent = document.getElementById('pdfContent');
                                    const spinner = document.getElementById('spinner');
                                    if (errorMessage && pdfContent && spinner) {
                                        spinner.style.display = 'none';
                                        pdfContent.style.display = 'block';
                                        errorMessage.textContent = message;
                                        errorMessage.style.display = 'block';
                                    }
                                }

                                function togglePdfVisibility() {
                                    const inlineContent = document.getElementById('inlineContent');
                                    const bodyElement = document.getElementById('div__body');

                                    if (!inlineContent || !bodyElement) {
                                        console.error('Cannot toggle visibility. Layout elements missing.');
                                        return;
                                    }

                                    const isHidden = window.getComputedStyle(inlineContent).display === 'none';
                                    if (isHidden) {
                                        inlineContent.style.display = 'block';
                                        bodyElement.style.left = '45%';
                                        bodyElement.style.width = '55%';
                                    } else {
                                        inlineContent.style.display = 'none';
                                        bodyElement.style.left = '0';
                                        bodyElement.style.width = '100%';
                                    }
                                }

                                const fileUrl = '${fileUrl}';
                                const fileType = '${fileType}';
                                const fileExtension = '${fileExtension}';
                                const supportedTypes = ${JSON.stringify(supportedTypes)};
                                const pdfCanvas = document.getElementById('pdfCanvas');
                                const ctx = pdfCanvas.getContext('2d');
                                const outputDiv = document.getElementById('output');
                                const hiddenTextField = document.getElementById('hiddenTextField');
                                const searchInput = document.getElementById('searchInput');
                                const hoverBox = document.getElementById('hoverBox');
                                const zoomableContent = document.getElementById('zoomable_content');
                                const zoomInButton = document.getElementById('zoom_in');
                                const zoomOutButton = document.getElementById('zoom_out');
                                const resetZoomButton = document.getElementById('reset_zoom');
                                const pdfContent = document.getElementById('pdfContent');
                                const pdfWrapper = document.getElementById('pdfWrapper');
                                const imageViewer = document.getElementById('imageViewer');
                                const fileContent = document.getElementById('fileContent');
                                const errorMessage = document.getElementById('errorMessage');
                                const unsupportedMessage = document.getElementById('unsupportedMessage');
                                const spinner = document.getElementById('spinner');

                                function calculateZoom() {
                                    const width = window.innerWidth;
                                    const desiredWidth = 2050;
                                    let zoom;
                                    if (width < 600) {
                                        zoom = 0.7;
                                    } else if (width < 1200) {
                                        zoom = 1;
                                    } else {
                                        zoom = 1.5;
                                    }
                                    return zoom * (width / desiredWidth);
                                }

                                let pdfTextContent = [];
                                let pdfPageViewport;
                                const initialState = {
                                    pdfDoc: null,
                                    currentPage: 1,
                                    pageCount: 0,
                                    zoom: calculateZoom(),
                                    minZoom: 0.5,
                                    maxZoom: 3
                                };

                                function renderPage() {
                                    console.log('Rendering PDF page:', initialState.currentPage);
                                    if (!initialState.pdfDoc) {
                                        console.error('PDF document not loaded');
                                        return;
                                    }
                                    initialState.pdfDoc.getPage(initialState.currentPage).then(page => {
                                        clearHighlights();
                                        pdfPageViewport = page.getViewport({ scale: initialState.zoom });
                                        pdfCanvas.width = pdfPageViewport.width;
                                        pdfCanvas.height = pdfPageViewport.height;
                                        const renderContext = {
                                            canvasContext: ctx,
                                            viewport: pdfPageViewport
                                        };
                                        page.render(renderContext).promise.then(() => {
                                            document.getElementById('page_num').textContent = initialState.currentPage;
                                            page.getTextContent().then(textContent => {
                                                pdfTextContent = textContent.items;
                                                spinner.style.display = 'none';
                                                pdfContent.style.display = 'block';
                                                console.log('PDF page rendered successfully');
                                                if (initialState.currentPage === 1) {
                                                    document.getElementById('first-page').style.opacity = '0.5';
                                                    document.getElementById('prev_page').style.opacity = '0.5';
                                                } else {
                                                    document.getElementById('first-page').style.opacity = '1';
                                                    document.getElementById('prev_page').style.opacity = '1';
                                                }
                                                if (initialState.currentPage === initialState.pdfDoc.numPages) {
                                                    document.getElementById('next_page').style.opacity = '0.5';
                                                    document.getElementById('last-page').style.opacity = '0.5';
                                                } else {
                                                    document.getElementById('next_page').style.opacity = '1';
                                                    document.getElementById('last-page').style.opacity = '1';
                                                }
                                            }).catch(err => {
                                                console.error('Error getting text content:', err);
                                                showErrorMessage('Failed to extract PDF text: ' + err.message);
                                            });
                                        }).catch(err => {
                                            console.error('Error rendering PDF page:', err);
                                            showErrorMessage('Failed to render PDF page: ' + err.message);
                                        });
                                    }).catch(err => {
                                        console.error('Error loading PDF page:', err);
                                        showErrorMessage('Failed to load PDF page: ' + err.message);
                                    });
                                }

                                function clearHighlights() {
                                    const existingHighlights = document.querySelectorAll('.highlight-box');
                                    existingHighlights.forEach(highlight => highlight.remove());
                                }

                                function initializeViewer() {
                                    console.log('Initializing viewer for file:', fileUrl);
                                    console.log('File type:', fileType, 'Extension:', fileExtension);

                                    // Always show pdfContent to maintain split-screen
                                    pdfContent.style.display = 'block';
                                    spinner.style.display = 'none';

                                    if (!fileUrl) {
                                        console.error('Invalid or missing file URL');
                                        showErrorMessage('No valid file URL provided. Please check the file configuration.');
                                        return;
                                    }

                                    if (!supportedTypes || supportedTypes.length === 0) {
                                        console.error('Supported types not defined');
                                        showErrorMessage('Supported file types not defined.');
                                        return;
                                    }

                                    const isSupported = supportedTypes.includes(fileType) || 
                                                    supportedTypes.includes('application/octet-stream') || 
                                                    (fileExtension && supportedTypes.some(type => fileExtension.toLowerCase().match(type.split('/')[1])));
                                    console.log('Is file supported?', isSupported);

                                    if (!isSupported) {
                                        console.log('Unsupported file type');
                                        unsupportedMessage.style.display = 'block';
                                        return;
                                    }

                                    const imageTypes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon'];
                                    const textTypes = ['text/plain', 'text/csv', 'text/html', 'text/css', 'application/javascript', 'application/json', 'application/xml', 'text/cache-manifest', 'application/rtf', 'message/rfc822'];
                                    const pdfType = ['application/pdf'];
                                    const unsupportedPreviewTypes = [
                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                        'application/vnd.ms-excel',
                                        'application/x-shockwave-flash',
                                        'application/vnd.ms-project',
                                        'application/vnd.ms-powerpoint',
                                        'application/msword',
                                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                        'application/zip',
                                        'application/x-tar',
                                        'application/vnd.visio',
                                        'application/postscript',
                                        'video/quicktime',
                                        'audio/mpeg',
                                        'audio/mp4',
                                        'application/pkix-cert'
                                    ];

                                    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'ico'];
                                    const textExtensions = ['txt', 'csv', 'html', 'htm', 'css', 'js', 'json', 'xml', 'rtf', 'eml', 'appcache'];
                                    const unsupportedExtensions = ['xlsx', 'xls', 'swf', 'mpp', 'ppt', 'doc', 'docx', 'zip', 'tar', 'vsdx', 'ps', 'mov', 'mp3', 'm4a', 'csr'];

                                    if (pdfType.includes(fileType) || (fileExtension && fileExtension.toLowerCase() === 'pdf')) {
                                        console.log('Loading PDF file');
                                        document.getElementById('nav').style.display = 'flex';
                                        pdfWrapper.style.display = 'block';
                                        pdfjsLib.getDocument({ url: fileUrl }).promise.then(data => {
                                            initialState.pdfDoc = data;
                                            document.getElementById('page_count').textContent = initialState.pdfDoc.numPages;
                                            console.log('PDF loaded, rendering first page');
                                            renderPage();
                                        }).catch(err => {
                                            console.error('Error loading PDF:', err);
                                            showErrorMessage('Failed to load PDF: ' + err.message);
                                        });
                                    } else if (imageTypes.includes(fileType) || (fileExtension && imageExtensions.includes(fileExtension.toLowerCase()))) {
                                        console.log('Loading image file');
                                        imageViewer.src = fileUrl;
                                        imageViewer.onload = () => {
                                            console.log('Image loaded successfully');
                                            spinner.style.display = 'none';
                                            pdfContent.style.display = 'block';
                                            imageViewer.style.display = 'block';
                                        };
                                        imageViewer.onerror = () => {
                                            console.error('Error loading image');
                                            showErrorMessage('Failed to load image: Unable to access the file.');
                                        };
                                    } else if (textTypes.includes(fileType) || (fileExtension && textExtensions.includes(fileExtension.toLowerCase()))) {
                                        console.log('Loading text file');
                                        fetch(fileUrl)
                                            .then(response => {
                                                console.log('Text fetch response:', response);
                                                if (!response.ok) {
                                                    throw new Error('Network response was not ok');
                                                }
                                                return response.text();
                                            })
                                            .then(text => {
                                                console.log('Text file loaded successfully');
                                                spinner.style.display = 'none';
                                                pdfContent.style.display = 'block';
                                                fileContent.style.display = 'block';
                                                fileContent.textContent = text;
                                                if (fileType === 'application/json' || (fileExtension && fileExtension.toLowerCase() === 'json')) {
                                                    try {
                                                        const json = JSON.parse(text);
                                                        fileContent.textContent = JSON.stringify(json, null, 2);
                                                        console.log('JSON parsed and formatted');
                                                    } catch (e) {
                                                        console.error('Invalid JSON:', e);
                                                        fileContent.textContent = text;
                                                    }
                                                }
                                                if (fileType === 'text/html' || (fileExtension && ['html', 'htm'].includes(fileExtension.toLowerCase()))) {
                                                    fileContent.innerHTML = text;
                                                    console.log('HTML content rendered');
                                                }
                                            })
                                            .catch(err => {
                                                console.error('Error loading text file:', err);
                                                showErrorMessage('Failed to load text file: ' + err.message);
                                            });
                                    } else if (unsupportedPreviewTypes.includes(fileType) || (fileExtension && unsupportedExtensions.includes(fileExtension.toLowerCase()))) {
                                        console.log('File type not previewable');
                                        spinner.style.display = 'none';
                                        pdfContent.style.display = 'block';
                                        unsupportedMessage.style.display = 'block';
                                    } else {
                                        console.log('Fallback to unsupported file type');
                                        spinner.style.display = 'none';
                                        pdfContent.style.display = 'block';
                                        unsupportedMessage.style.display = 'block';
                                    }
                                }

                                console.log('Starting viewer initialization');
                                initializeViewer();

                                document.getElementById('first-page').addEventListener('click', () => {
                                    if (initialState.currentPage !== 1) {
                                        initialState.currentPage = 1;
                                        renderPage();
                                    }
                                });

                                document.getElementById('prev_page').addEventListener('click', () => {
                                    if (initialState.currentPage > 1) {
                                        initialState.currentPage--;
                                        renderPage();
                                    }
                                });

                                document.getElementById('next_page').addEventListener('click', () => {
                                    if (initialState.currentPage < initialState.pdfDoc?.numPages) {
                                        initialState.currentPage++;
                                        renderPage();
                                    }
                                });

                                document.getElementById('last-page').addEventListener('click', () => {
                                    if (initialState.currentPage !== initialState.pdfDoc?.numPages) {
                                        initialState.currentPage = initialState.pdfDoc.numPages;
                                        renderPage();
                                    }
                                });

                                zoomInButton.addEventListener('click', () => {
                                    if (initialState.zoom < initialState.maxZoom) {
                                        initialState.zoom += 0.1;
                                        renderPage();
                                        updateHorizontalScroll();
                                    }
                                });

                                zoomOutButton.addEventListener('click', () => {
                                    if (initialState.zoom > initialState.minZoom) {
                                        initialState.zoom -= 0.1;
                                        renderPage();
                                        updateHorizontalScroll();
                                    }
                                });

                                resetZoomButton.addEventListener('click', () => {
                                    initialState.zoom = calculateZoom();
                                    renderPage();
                                    updateHorizontalScroll();
                                });

                                document.getElementById('printButton').addEventListener('click', () => {
                                    const printIframe = document.getElementById('printIframe');
                                    printIframe.src = fileUrl;
                                    printIframe.onload = () => {
                                        printIframe.contentWindow.print();
                                    };
                                    printIframe.onerror = () => {
                                        showErrorMessage('Failed to load file for printing.');
                                    };
                                });

                                function updateHorizontalScroll() {
                                    const canvasWidth = pdfCanvas.width;
                                    const wrapperWidth = pdfWrapper.offsetWidth;
                                    if (canvasWidth > wrapperWidth) {
                                        pdfWrapper.scrollLeft = (canvasWidth - wrapperWidth) / 2;
                                    }
                                }

                                let startX = 0, startY = 0, isSelecting = false;
                                let lastHoveredItem = null;

                                pdfCanvas.addEventListener('mousedown', e => {
                                    startX = e.offsetX;
                                    startY = e.offsetY;
                                    isSelecting = true;
                                    selectionBox.style.left = startX + 'px';
                                    selectionBox.style.top = startY + 'px';
                                    selectionBox.style.width = '0';
                                    selectionBox.style.height = '0';
                                    selectionBox.style.display = 'block';
                                });

                                pdfCanvas.addEventListener('mousemove', e => {
                                    if (isSelecting) {
                                        const width = e.offsetX - startX;
                                        const height = e.offsetY - startY;
                                        selectionBox.style.width = width + 'px';
                                        selectionBox.style.height = height + 'px';
                                    }
                                    const rect = pdfCanvas.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const y = e.clientY - rect.top;
                                    let hoveredItem = null;

                                    for (let item of pdfTextContent) {
                                        const scale = initialState.zoom;
                                        const left = item.transform[4] * scale;
                                        const top = pdfPageViewport?.height - (item.transform[5] * scale);
                                        const width = item.width * scale;
                                        const height = item.height * scale;

                                        if (x >= left && x <= left + width && y >= top - height && y <= top) {
                                            hoveredItem = item;
                                            break;
                                        }
                                    }

                                    if (hoveredItem !== lastHoveredItem) {
                                        lastHoveredItem = hoveredItem;
                                        if (hoveredItem) {
                                            const scale = initialState.zoom;
                                            const left = hoveredItem.transform[4] * scale;
                                            const top = pdfPageViewport?.height - (hoveredItem.transform[5] * scale);
                                            const width = hoveredItem.width * scale;
                                            const height = hoveredItem.height * scale;
                                            hoverBox.style.left = left + 'px';
                                            hoverBox.style.top = (top - height) + 'px';
                                            hoverBox.style.width = width + 'px';
                                            hoverBox.style.height = height + 'px';
                                            hoverBox.style.display = 'block';
                                        } else {
                                            hoverBox.style.display = 'none';
                                        }
                                    }
                                });

                                pdfCanvas.addEventListener('mouseup', e => {
                                    if (isSelecting) {
                                        isSelecting = false;
                                        selectionBox.style.display = 'none';
                                        const endX = e.offsetX;
                                        const endY = e.offsetY;
                                        const selectedText = [];
                                        const selectedItems = [];

                                        for (let item of pdfTextContent) {
                                            const scale = initialState.zoom;
                                            const left = item.transform[4] * scale;
                                            const top = pdfPageViewport?.height - (item.transform[5] * scale);
                                            const width = item.width * scale;
                                            const height = item.height * scale;

                                            const selectionLeft = Math.min(startX, endX);
                                            const selectionRight = Math.max(startX, endX);
                                            const selectionTop = Math.min(startY, endY);
                                            const selectionBottom = Math.max(startY, endY);

                                            if (
                                                left + width >= selectionLeft &&
                                                left <= selectionRight &&
                                                top >= selectionTop &&
                                                top - height <= selectionBottom
                                            ) {
                                                selectedText.push(item.str);
                                                selectedItems.push({
                                                    text: item.str,
                                                    left: left,
                                                    top: top - height,
                                                    width: width,
                                                    height: height
                                                });
                                            }
                                        }

                                        const extractedText = selectedText.join(' ');
                                        outputDiv.textContent = extractedText || 'No text extracted yet.';
                                        hiddenTextField.value = extractedText;

                                        selectedItems.forEach(item => {
                                            const highlight = document.createElement('div');
                                            highlight.className = 'highlight-box';
                                            highlight.style.left = item.left + 'px';
                                            highlight.style.top = item.top + 'px';
                                            highlight.style.width = item.width + 'px';
                                            highlight.style.height = item.height + 'px';
                                            document.getElementById('container').appendChild(highlight);
                                        });
                                    }
                                });

                                searchInput.addEventListener('input', () => {
                                    const searchTerm = searchInput.value.toLowerCase();
                                    clearHighlights();

                                    if (searchTerm) {
                                        pdfTextContent.forEach(item => {
                                            if (item.str.toLowerCase().includes(searchTerm)) {
                                                const scale = initialState.zoom;
                                                const left = item.transform[4] * scale;
                                                const top = pdfPageViewport?.height - (item.transform[5] * scale);
                                                const width = item.width * scale;
                                                const height = item.height * scale;

                                                const highlight = document.createElement('div');
                                                highlight.className = 'highlight-box';
                                                highlight.style.left = left + 'px';
                                                highlight.style.top = (top - height) + 'px';
                                                highlight.style.width = width + 'px';
                                                highlight.style.height = height + 'px';
                                                document.getElementById('container').appendChild(highlight);
                                            }
                                        });
                                    }
                                });
                            </script>
                        </body>
                        </html>
                        `;
                        inlineHTMLField.defaultValue = leftSideContent;
                    }
                }
                else if ((strType === context.UserEventType.VIEW && showPdfOnView === true) &&
                    (runtime.executionContext === runtime.ContextType.USER_INTERFACE ||
                        runtime.executionContext === runtime.ContextType.WEBAPPLICATION ||
                        runtime.executionContext === runtime.ContextType.SUITELET)) {
                    log.audit("Context Type: ", "Execution Context: " + strType);
                    log.audit("Show PDF on View: ", showPdfOnView);
                    var vendorBillStagingId = context.newRecord.getValue({ fieldId: 'custbody_lst_vendor_bill_process' });
                    log.audit("Vendor Bill Staging ID: ", vendorBillStagingId);
                    if (isThereValue(vendorBillStagingId)) {
                        if (isThereValue(vendorBillStagingId)) {
                            try {
                                var billProcessRecord = record.load({
                                    type: 'customrecord_lstcptr_vendor_bill_process',
                                    id: vendorBillStagingId,
                                    isDynamic: false
                                });

                                var fileId = billProcessRecord.getValue({ fieldId: 'custrecord_lstcptr_pdf_file' });
                                log.audit(strDebugTitle, 'File ID from Vendor Bill Process Record: ' + fileId);

                                if (fileId) {
                                    try {
                                        var fileObj = file.load({ id: fileId });
                                        var nsfileUrl = fileObj.url;
                                        var accountId = runtime.accountId;
                                        fileUrl = `https://${accountId}.app.netsuite.com${nsfileUrl}`;
                                        log.audit(strDebugTitle, 'File URL: ' + fileUrl);
                                    } catch (e) {
                                        log.error('Error loading file', e.message);
                                    }
                                }
                            } catch (e) {
                                log.error('Error loading Vendor Bill Process record', e.message);
                            }
                        } else {
                            log.debug("No Vendor Bill Process record found for vendorBillStagingId: ", vendorBillStagingId);
                        }

                        var fileUrlField = form.addField({
                            id: 'custpage_lstcptr_file_url',
                            type: serverWidget.FieldType.TEXT,
                            label: 'File URL'
                        });
                        fileUrlField.defaultValue = fileUrl;
                        fileUrlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var showFileField = form.addField({
                            id: 'custpage_lstcptr_show_file',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Show File'
                        });
                        showFileField.defaultValue = 'T';
                        showFileField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var contextTypeField = form.addField({
                            id: 'custpage_lstcptr_context_type',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Context Type'
                        });
                        contextTypeField.defaultValue = strType;
                        contextTypeField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var inlineHTMLField = form.addField({
                            id: 'custpage_lstcptr_inline_html',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Inline HTML'
                        });

                        form.addButton({
                            id: 'custpage_lstcptr_toggle_file_button',
                            label: 'Hide/Show File',
                            functionName: 'toggleFileVisibility'
                        });

                        inlineHTMLField.defaultValue = `
                                <script>
                                    (function() {
                                        function initFileViewer() {
                                            if (typeof jQuery === 'undefined') {
                                                setTimeout(initFileViewer, 100);
                                                return;
                                            }
                                            jQuery(document).ready(function() {
                                                try {
                                                    var fileUrl = jQuery('#custpage_lstcptr_file_url').val();
                                                    var custpage_lstcptr_show_file = jQuery('#custpage_lstcptr_show_file').val() === 'T';
                                                    var contextType = jQuery('#custpage_lstcptr_context_type').val();

                                                    var fileViewerHtml = '<div id="lstcptrOCRSideBySideViewerPane" style="position: fixed; top: 95px; margin: 0px 0px 0px 45%; padding: 0px; height: 100%; z-index: 100; left: -45%; width: 45%; border-right: 1px solid rgb(81, 78, 78);">' +
                                                        '<iframe id="lstcptrOCRSideBySideViewerFrame" src="' + fileUrl + '" style="border: none; width: 100%; height: 100%;"></iframe>' +
                                                        '</div>';
                                                    jQuery("body").append(fileViewerHtml);

                                                    var filePane = jQuery("#lstcptrOCRSideBySideViewerPane");
                                                    if (!custpage_lstcptr_show_file) {
                                                        filePane.hide();
                                                        jQuery("#div__body").css({
                                                            "margin-left": "0%",
                                                            "width": "100%"
                                                        });
                                                    } else {
                                                        filePane.show();
                                                        jQuery("#div__body").css({
                                                            "margin-left": "45%",
                                                            "width": "55%"
                                                        });
                                                    }

                                                    console.log('File viewer initialized');
                                                } catch (error) {
                                                    console.error('Error initializing File viewer:', error);
                                                }
                                            });
                                        }
                                        initFileViewer();

                                        window.toggleFileVisibility = function() {
                                            var filePane = jQuery("#lstcptrOCRSideBySideViewerPane");
                                            if (filePane.is(":visible")) {
                                                filePane.hide();
                                                jQuery("#div__body").css({
                                                    "margin-left": "0%",
                                                    "width": "100%"
                                                });
                                            } else {
                                                filePane.show();
                                                jQuery("#div__body").css({
                                                    "margin-left": "45%",
                                                    "width": "55%"
                                                });
                                            }
                                        };
                                    })();
                                </script>`;
                    }
                }
            } catch (e) {
                log.error({ title: 'Error in beforeLoad', details: e });
            }


        }

        /**
         * Retrieves the Expense Account ID from the Expense Category record.
         * 
         * @param {string|number} categoryId - Internal ID of the Expense Category.
         * @returns {number|null} - The internal ID of the Expense Account, or null if not found.
         */
        function getExpenseAccountIds(categoryId) {
            try {
                var strDebugTitle = 'getExpenseAccountId';

                log.debug(strDebugTitle, 'Fetching account for category ID: ' + categoryId);

                var categoryLookup = search.lookupFields({
                    type: 'expensecategory',
                    id: categoryId,
                    columns: ['account']
                });

                log.debug(strDebugTitle, 'Category Lookup Result: ' + JSON.stringify(categoryLookup));

                var accountId = categoryLookup.account && categoryLookup.account.length > 0
                    ? categoryLookup.account[0].value
                    : null;

                log.debug(strDebugTitle, 'Retrieved Account ID: ' + accountId);

                return accountId;

            } catch (e) {
                log.error('getExpenseAccountId', 'Error retrieving expense account for category ID ' + categoryId + ': ' + e.message);
                return null;
            }
        }

        function getLineItemIds(desc) {
            var strDebugTitle = 'getLineItemIds';
            var searchItemId = "";

            try {
                if (!desc || desc.trim() === "") return null;

                var cleanedDesc = desc.replace(/\s+/g, ' ').trim().toLowerCase();
                var words = cleanedDesc.replace(/[\-]/g, '').split(' ');

                if (words.length === 0) return null;

                var results = [];

                for (var i = 1; i <= words.length; i++) {
                    var phrase = words.slice(0, i).join('');
                    log.debug(strDebugTitle, "Trying match with: " + phrase);

                    var itemSearch = search.create({
                        type: "item",
                        filters: [
                            ["formulatext:REPLACE(LOWER(REPLACE({itemid}, '-', '')), ' ', '')", "contains", phrase],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                        columns: ["internalid", "itemid"]
                    });

                    results = itemSearch.run().getRange({ start: 0, end: 5 });

                    if (results && results.length <= 5) {
                        break;
                    }
                }

                if (results && results.length > 0) {
                    for (var j = 0; j < results.length; j++) {
                        var internalId = results[j].getValue({ name: "internalid" });
                        var itemId = results[j].getValue({ name: "itemid" });
                        log.debug(strDebugTitle, "Matched: " + itemId + " | ID: " + internalId);
                        return internalId;
                    }
                } else {
                    log.debug(strDebugTitle, 'No match found for: ' + desc);
                }

            } catch (e) {
                log.error(strDebugTitle + " Error", e.message);
            }

            return null;
        }

        function getExpenseCategoryIds(desc) {
            var categoryIds = [];
            try {
                if (!desc || desc.trim() === "") return categoryIds;

                var normalizedDesc = desc.replace(/\s+/g, ' ').trim();
                var words = normalizedDesc.split(' ');

                if (words.length === 0) return categoryIds;

                var baseFilter = [["name", "contains", words[0]], "AND", ["isinactive", "is", "F"]];
                var results = [];

                for (var i = 1; i <= words.length; i++) {
                    var currentFilter = [["name", "contains", words.slice(0, i).join(' ')], "AND", ["isinactive", "is", "F"]];

                    var expenseSearch = search.create({
                        type: "expensecategory",
                        filters: currentFilter,
                        columns: ["internalid", "name"]
                    });

                    results = expenseSearch.run().getRange({ start: 0, end: 100 });

                    if (results && results.length <= 5) {
                        break;
                    }
                }

                if (results && results.length > 0) {
                    for (var j = 0; j < results.length; j++) {
                        var internalId = results[j].getValue({ name: "internalid" });
                        var name = results[j].getValue({ name: "name" });
                        categoryIds.push(internalId);
                        log.debug("getExpenseCategoryIds Match", "Matched: " + name + " | ID: " + internalId);
                    }
                } else {
                    log.debug("getExpenseCategoryIds", "No match found for: " + desc);
                }

            } catch (e) {
                log.error("getExpenseCategoryIds Error", e.message);
            }
            return categoryIds;
        }

        /**
         * Function executed after a write operation on a record
         */
        function afterSubmit(context) {
            try {
                if ((context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) && runtime.executionContext == runtime.ContextType.USER_INTERFACE) {
                    log.debug("Context Type: ", context.type + "Execution Context: ", runtime.executionContext);
                    var newRecord = context.newRecord;
                    var vendorBillStagingId = newRecord.getValue({ fieldId: 'custbody_lst_vendor_bill_process' });
                    log.debug("Vendor Bill Staging ID: ", vendorBillStagingId);
                    var tranId = newRecord.getValue({ fieldId: 'transactionnumber' });
                    log.debug("Transaction Number: ", tranId);
                    var tranDate = newRecord.getValue({ fieldId: 'trandate' });
                    var status = newRecord.getValue({ fieldId: 'approvalstatus' });
                    log.debug("Transaction Date: ", tranDate);
                    log.debug("Status: ", status);
                    if (isThereValue(vendorBillStagingId)) {
                        try {
                            var vendorBillStagingRecord = record.load({ type: 'customrecord_lstcptr_vendor_bill_process', id: vendorBillStagingId });
                            vendorBillStagingRecord.setValue({ fieldId: 'custrecord_lstcptr_gen_transaction', value: tranId });
                            vendorBillStagingRecord.setValue({ fieldId: 'custrecord_lstcptr_gen_transaction_date', value: tranDate });
                            vendorBillStagingRecord.setValue({ fieldId: 'custrecord_lstcptr_gen_tran_app_status', value: status });
                            vendorBillStagingRecord.setValue({ fieldId: 'custrecord_lstcptr_process_status', value: "5" });
                            vendorBillStagingRecord.save();
                            log.audit({ title: strDebugTitle, details: 'Vendor Bill Staging record updated successfully' });
                        } catch (err) {
                            log.error({ title: strDebugTitle + " (afterSubmit) Error", details: JSON.stringify({ code: err.name, message: err.message }) });
                        }
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (afterSubmit) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function formatJsonData(jsonData) {
            var formattedData = [];

            try {
                jsonData.forEach(function (item) {
                    if (item.type === 'field' || item.type === 'derived') {
                        formattedData.push({
                            label: item.label,
                            ocr_text: item.ocr_text
                        });
                    }
                    if (item.type === 'table' && item.cells && Array.isArray(item.cells)) {
                        item.cells.forEach(function (cell) {
                            formattedData.push({
                                label: cell.label,
                                ocr_text: cell.text
                            });
                        });
                    }
                });
            } catch (e) {
                log.error(strDebugTitle + ' (formatJsonData)', 'Error formatting JSON data: ' + e.message);
            }

            return formattedData;
        }

        function getVendorBillStagingRecord(vendorToBill) {
            var rtnData = [];
            try {
                var vendorBillStagingSearch = search.create({
                    type: "customrecord_lstcptr_vendor_bill_process",
                    filters: [
                        ["internalid", "anyof", vendorToBill]
                    ],
                    columns: [
                        search.createColumn({ name: "custrecord_lstcptr_bill_number", label: "Bill Number" }),
                        search.createColumn({ name: "custrecord_lstcptr_bill_date", label: "Bill Date" }),
                        search.createColumn({ name: "custrecord_lstcptr_tran_amount_inc_tax", label: "Amount" }),
                        search.createColumn({ name: "custrecord_lstcptr_vendor", label: "Vendor" }),
                        search.createColumn({ name: "custrecord_lstcptr_process_status", label: "Process Status" }),
                        search.createColumn({ name: "custrecord_lstcptr_json_item_data", label: "Json Item Data" }),
                    ]
                });
                rtnData = getAllSavedSearch(vendorBillStagingSearch);
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getVendorBillStagingRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        function getAllSavedSearch(savedSearch) {
            try {
                var resultset = savedSearch.run();
                var returnSearchResults = [];
                var Index = 0;
                do {
                    var resultslice = resultset.getRange(Index, Index + 1000);
                    for (var rs in resultslice) {
                        returnSearchResults.push(resultslice[rs]);
                        Index++;
                    }
                } while (resultslice.length >= 1000);

                return returnSearchResults;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getAllSavedSearch) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function getVendorNameById(vendorId) {
            var vendorName = null;
            if (!vendorId) {
                log.debug("No vendor ID provided");
                return;
            }

            try {
                var vendorFields = search.lookupFields({
                    type: search.Type.VENDOR,
                    id: vendorId,
                    columns: ['entityid']
                });

                vendorName = vendorFields.entityid || null;

            } catch (err) {
                log.error({
                    title: 'getVendorNameById Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }

            return vendorName;
        }

        function getVendorConfigRecord(vendor) {
            var rtnData = [];
            try {
                log.debug("Searching vendor config for vendor ID", vendor);

                var vendorConfigSearch = search.create({
                    type: 'customrecord_lstcptr_vendor_config',
                    filters: [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_lstcptr_vendor_con_parent_ven", "anyof", vendor]
                    ],
                    columns: [
                        'custrecord_lstcptr_vendor_con_department',
                        'custrecord_lstcptr_vendorr_config_class',
                        'custrecord_lstcptr_vendor_con_location',
                        'custrecord_lstcptr_ap_account',
                        'custrecord_lstcptr_vendor_con_currency',
                        'custrecord_lstcptr_vendor_con_item',
                        'custrecord_lstcptr_vendor_con_tax_code',
                        'custrecord_lstcptr_vendor_con_category',
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
                    ]
                });

                rtnData = vendorConfigSearch.run().getRange({ start: 0, end: 1 });
                log.debug("Vendor Config Search Result", JSON.stringify(rtnData));

            } catch (err) {
                log.error({
                    title: 'getVendorConfigRecord Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }

            return rtnData;
        }

        function getMainConfigRecordFields() {
            try {
                var mainConfigSearch = search.create({
                    type: 'customrecord_lstcptr_main_configuration',
                    filters: [
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_bill_split_creation', label: 'Vendor Bill Split View On Creation' }),
                        search.createColumn({ name: 'custrecord_lstcptr_bill_split_edit', label: 'Vendor Bill Split View On Edit' }),
                        search.createColumn({ name: 'custrecord_lstcptr_bill_split_view', label: 'Vendor Bill Split View On View' }),
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC, label: 'Internal ID' })
                    ]
                });

                var mainConfigSearchResult = mainConfigSearch.run().getRange({ start: 0, end: 1 });
                if (mainConfigSearchResult.length > 0) {
                    return {
                        custrecord_lstcptr_bill_split_creation: mainConfigSearchResult[0].getValue({ name: 'custrecord_lstcptr_bill_split_creation' }),
                        custrecord_lstcptr_bill_split_edit: mainConfigSearchResult[0].getValue({ name: 'custrecord_lstcptr_bill_split_edit' }),
                        custrecord_lstcptr_bill_split_view: mainConfigSearchResult[0].getValue({ name: 'custrecord_lstcptr_bill_split_view' })
                    };
                }
                return {};
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getMainConfigRecordFields) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function getSubsidiaryConfigRecords() {
            var rtnData = [];
            try {
                var subsidiaryConfigSearch = search.create({
                    type: 'customrecord_lstcptr_subsidiary_config',
                    filters: [
                        ["isinactive", "is", "F"]
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_department', label: 'Department' }),
                        search.createColumn({ name: 'custrecord_lstcptr_class', label: 'Class' }),
                        search.createColumn({ name: 'custrecord_lstcptr_location', label: 'Location' }),
                        search.createColumn({ name: 'custrecord_lstcptr_sub_config_subsidiary', label: 'Subsidiary' }),
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC, label: 'Internal ID' })
                    ]
                });

                rtnData = getAllSavedSearch(subsidiaryConfigSearch);
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getSubsidiaryConfigRecords) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        function createSubsidiaryToFormMap(subsidiaryConfigRecords) {
            var rtnData = {};
            try {
                subsidiaryConfigRecords.forEach(function (record) {
                    var subsidiaryId = record.getValue('custrecord_lstcptr_sub_config_subsidiary');
                    rtnData[subsidiaryId] = {
                        department: record.getValue('custrecord_lstcptr_department'),
                        className: record.getValue('custrecord_lstcptr_class'),
                        location: record.getValue('custrecord_lstcptr_location')
                    };
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (createSubsidiaryToFormMap) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        function isThereValue(value) {
            if (value != null && value != 'null' && value != '' && value != undefined && value != 'undefined' && value != 'NaN' && value != ' ') {
                return true;
            } else {
                return false;
            }
        }

        return {
            beforeLoad: beforeLoad,
            afterSubmit: afterSubmit
        };
    });