/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Bill To Process Split Screen UE (lstcptr_bill_split_screen_ue.js)
*
* Version:         1.1.0   -   13-Sep-2024  -   RS.     -   Initial development (Adapted for Vendor Bill).
*
* Author:          LiveStrong Technologies
*
* Purpose:         Prepopulate a Vendor Bill record with data from a related custom record, display a PDF viewer, and provide a toggle button for the PDF viewer.
*
* Script:          customscript_lstcptr_bill_split_screen_ue
* Deploy:          customdeploy_lstcptr_bill_split_screen_ue
*
* Notes:           
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
        var strDebugTitle = 'lstcptr_bill_creation';
        var strDebugMsg = '';

        /**
         * Function triggered before record is loaded.
         */
        function beforeLoad(context) {
            strDebugTitle += ' beforeLoad';
            var strType = context.type;
            var objRecord = context.newRecord;
            var nRecType = objRecord.type;
            var form = context.form;
            var nUserObj = runtime.getCurrentUser();
            var nUserId = nUserObj.id;
            var nUserRoleId = nUserObj.role;
            var accountId = runtime.accountId;


            strDebugMsg = 'Type [' + strType + ']; Rec Type [' + nRecType + ']; User ID [' + nUserId + ']; User Role ID [' + nUserRoleId + ']';
            log.debug({ title: strDebugTitle, details: strDebugMsg });

            try {
                var mainConfigRecordFields = getMainConfigRecordFields();
                // var showPdfOnCreate = mainConfigRecordFields.custrecord_lstcptr_bill_split_creation; // Hardcoded default for CREATE
                // var showPdfOnEdit = mainConfigRecordFields.custrecord_lstcptr_bill_split_edit;   // Hardcoded default for EDIT
                var showPdfOnView = mainConfigRecordFields.custrecord_lstcptr_bill_split_view;   // Hardcoded default for VIEW
                var vendorToBill = context.newRecord.id;
                log.debug("Record Id: ", vendorToBill);

                if (strType == context.UserEventType.VIEW && showPdfOnView == 'T') {
                    log.debug("Context Type: ", "Execution Context: ", runtime.executionContext);
                    if (isThereValue(vendorToBill)) {
                        var objOrderToProcessRecordFields = search.lookupFields({
                            type: 'customrecord_lstcptr_vendor_bill_process',
                            id: vendorToBill,
                            columns: ['custrecord_lstcptr_pdf_file']
                        });
                        var pdfFileId = objOrderToProcessRecordFields.custrecord_lstcptr_pdf_file;
                        var pdfUrl = '';
                        if (pdfFileId) {
                            var pdfFile = file.load({ id: pdfFileId });
                            pdfUrl = pdfFile.url;
                        }
                        log.debug(strDebugTitle, 'PDF URL: ' + pdfUrl);

                        var pdfUrlField = form.addField({
                            id: 'custpage_lstcptr_pdf_url',
                            type: serverWidget.FieldType.TEXT,
                            label: 'PDF URL'
                        });
                        pdfUrlField.defaultValue = pdfUrl;
                        pdfUrlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                        var showPdfField = form.addField({
                            id: 'custpage_lstcptr_show_pdf',
                            type: serverWidget.FieldType.TEXT,
                            label: 'Show PDF'
                        });
                        showPdfField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

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
                            id: 'custpage_lstcptr_toggle_pdf_button',
                            label: 'Hide/Show PDF',
                            functionName: 'togglePdfVisibility'
                        });

                        inlineHTMLField.defaultValue = `
                        <script>
                            (function() {
                                function initPdfViewer() {
                                    if (typeof jQuery === 'undefined') {
                                        setTimeout(initPdfViewer, 100);
                                        return;
                                    }
                                    jQuery(document).ready(function() {
                                        try {
                                            console.log('Initializing PDF viewer');
                                            var pdfUrl = jQuery('#custpage_lstcptr_pdf_url').val();
                                            var showPdfByDefault = jQuery('#custpage_lstcptr_show_pdf').val() === 'true';
                                            var contextType = jQuery('#custpage_lstcptr_context_type').val();
                                            
                                            console.log('Context Type:', contextType);
                                            console.log('Show PDF by default:', showPdfByDefault);
            
                                            var pdfViewerHtml = '<div id="lstcptrOCRSideBySideViewerPane" style="position: fixed; top: 95px; margin: 0px 0px 0px 45%; padding: 0px; height: 100%; z-index: 100; left: -45%; width: 45%; border-right: 1px solid rgb(81, 78, 78);">' +
                                                '<iframe id="lstcptrOCRSideBySideViewerFrame" src="' + pdfUrl + '" style="border: none; width: 100%; height: 100%;"></iframe>' +
                                                '</div>';
                                            jQuery("body").append(pdfViewerHtml);
                                            
                                            var pdfPane = jQuery("#lstcptrOCRSideBySideViewerPane");
                                            if (!showPdfByDefault) {
                                                pdfPane.hide();
                                                jQuery("#div__body").css({
                                                    "margin-left": "0%",
                                                    "width": "100%"
                                                });
                                            } else {
                                                pdfPane.show();
                                                jQuery("#div__body").css({
                                                    "margin-left": "45%",
                                                    "width": "55%"
                                                });
                                            }
            
                                            console.log('PDF viewer initialized');
                                        } catch (error) {
                                            console.error('Error initializing PDF viewer:', error);
                                        }
                                    });
                                }
                                initPdfViewer();
            
                                window.togglePdfVisibility = function() {
                                    var pdfPane = jQuery("#lstcptrOCRSideBySideViewerPane");
                                    if (pdfPane.is(":visible")) {
                                        pdfPane.hide();
                                        jQuery("#div__body").css({
                                            "margin-left": "0%",
                                            "width": "100%"
                                        });
                                    } else {
                                        pdfPane.show();
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
                log.error(strDebugTitle, 'Error in beforeLoad: ' + e.message);
            }
        }

        function getVendorNameById(vendorId) {
            var vendorName = null;
            if (!vendorId) {
                log.debug({ title: 'getVendorNameById', details: 'No vendor ID provided' });
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
                    filters:
                        [
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
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



        /**
         * Helper function to check if a value is valid
         */
        function isThereValue(value) {
            if (value != null && value != 'null' && value != '' && value != undefined && value != 'undefined' && value != 'NaN' && value != ' ') {
                return true;
            } else {
                return false;
            }
        }

        return {
            beforeLoad: beforeLoad,
            // afterSubmit: afterSubmit
        };
    });