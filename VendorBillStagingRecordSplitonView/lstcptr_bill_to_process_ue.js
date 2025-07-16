/*************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Bill To Process Split Screen UE (lstcptr_bill_split_screen_ue.js)
 *
 * Version:         1.0.0   -   14-July-2025  -   RS      -   Refactored for modularity
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Prepopulate a Vendor Bill record with data from a related custom record, display a PDF viewer, and provide a toggle button for the PDF viewer.
 *
 * Script:          customscript_lstcptr_bill_split_screen_ue
 * Deploy:          customdeploy_lstcptr_bill_split_screen_ue
 *
 * Dependencies:    lstcptr_bill_to_process_utils.js, lstcptr_constants.js
 *
 *************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(['N/file', 'N/record', 'N/runtime', 'N/ui/serverWidget', './lstcptr_bill_to_process_utils', './lstcptr_constants'],
    function (file, record, runtime, serverWidget, utils, constants) {
        var strDebugTitle = 'lstcptr_bill_creation';

        function beforeLoad(context) {
            strDebugTitle += ' beforeLoad';
            var strType = context.type;
            var objRecord = context.newRecord;
            var nRecType = objRecord.type;
            var form = context.form;
            var nUserObj = runtime.getCurrentUser();
            var nUserId = nUserObj.id;
            var nUserRoleId = nUserObj.role;

            var strDebugMsg = 'Type [' + strType + ']; Rec Type [' + nRecType + ']; User ID [' + nUserId + ']; User Role ID [' + nUserRoleId + ']';
            log.debug({ title: strDebugTitle, details: strDebugMsg });

            try {
                var mainConfigRecordFields = utils.getMainConfigRecordFields();
                var showPdfOnView = mainConfigRecordFields[constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_VIEW];
                var vendorToBill = context.newRecord.id;
                log.debug("Record Id: ", vendorToBill);

                if (strType == context.UserEventType.VIEW && showPdfOnView === 'T') {
                    log.debug("Context Type: ", "Execution Context: ", runtime.executionContext);

                    if (utils.isThereValue(vendorToBill)) {
                        var objOrderToProcessRecordFields = record.load({
                            type: 'customrecord_lstcptr_vendor_bill_process',
                            id: vendorToBill
                        });

                        var pdfFileId = objOrderToProcessRecordFields.getValue(constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE);
                        var pdfUrl = '';
                        if (pdfFileId) {
                            var pdfFile = file.load({ id: pdfFileId });
                            pdfUrl = pdfFile.url;
                        }

                        log.debug(strDebugTitle, 'PDF URL: ' + pdfUrl);

                        var pdfUrlField = form.addField({
                            id: constants.CUSTOM_FIELDS.FILE_URL,
                            type: serverWidget.FieldType.TEXT,
                            label: 'PDF URL'
                        });
                        pdfUrlField.defaultValue = pdfUrl;
                        pdfUrlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var showPdfField = form.addField({
                            id: constants.CUSTOM_FIELDS.SHOW_FILE,
                            type: serverWidget.FieldType.TEXT,
                            label: 'Show PDF'
                        });
                        showPdfField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var contextTypeField = form.addField({
                            id: constants.CUSTOM_FIELDS.CONTEXT_TYPE,
                            type: serverWidget.FieldType.TEXT,
                            label: 'Context Type'
                        });
                        contextTypeField.defaultValue = strType;
                        contextTypeField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var inlineHTMLField = form.addField({
                            id: constants.CUSTOM_FIELDS.INLINE_HTML,
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Inline HTML'
                        });

                        form.addButton({
                            id: constants.CUSTOM_FIELDS.TOGGLE_FILE_BUTTON,
                            label: 'Hide/Show PDF',
                            functionName: 'togglePdfVisibility'
                        });

                        var htmlFile = file.load({ id: 'SuiteScripts/LST Capture/bill_split_screen.html' });
                        inlineHTMLField.defaultValue = htmlFile.getContents()
                            .replace('{{pdfUrl}}', pdfUrl)
                            .replace('{{showPdfByDefault}}', 'true')
                            .replace('{{contextType}}', strType);
                    }
                }
            } catch (e) {
                log.error(strDebugTitle, 'Error in beforeLoad: ' + e.message);
            }
        }

        return {
            beforeLoad: beforeLoad
        };
    });
