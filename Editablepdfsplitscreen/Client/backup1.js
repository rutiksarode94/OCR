/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Bill To Process Split Screen CS (lstcptr_bill_spit_screen_cs.js)
 *
 * Version:         1.1.0   -   25-Sep-2024  -   RS.     -   Initial development (Adapted for Vendor Bill).
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Handle client-side logic for the LSTCapture Bill To Process Split Screen.
 *
 * Script:          customscript_lstcptr_bill_split_screen
 * Deploy:          customdeploy_lstcptr_bill_split_screen
 *
 * Notes:           
 *
 * Dependencies:
 *
 *********************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @FileName lstcptr_bill_spit_screen_cs.js
 */
define(['N/format', 'N/ui/dialog', 'N/currentRecord', 'N/log', 'N/search', 'N/record'],
    /**
     * @param {format} format
     * @param {dialog} dialog
     * @param {currentRecord} currentRecord
     * @param {log} log
     * @param {search} search
     */
    function (format, dialog, currentRecord, log, search, record) {
        var strDebugTitle = "lstcptr_bill_spit_screen_cs";
        var lastClickedFieldId = null;
        let previousDates = {};
        var currentFieldId = '';
        var currentDate = '';
        const DEBUG_TITLE = 'lstcptr_bill_split_screen_cs';

        /**
         * Function executed after page initialization
         */
        function pageInit(context) {
            try {
                var currentRecord = context.currentRecord;
                var url = window.location.href;
                log.debug({ title: strDebugTitle + ' (pageInit)', details: 'Full URL: ' + url });
                var urlParams = new URLSearchParams(url.split('?')[1]);
                var subsidiaryId = urlParams.get('subsidiary');
                var vendorId = urlParams.get('vendor');
                var recordId = urlParams.get('vendorToBill');
                log.debug({ title: strDebugTitle + ' (pageInit)', details: 'Params - Subsidiary: ' + subsidiaryId + ', Vendor: ' + vendorId + ', VendorToBill: ' + recordId });

                if (vendorId) {
                    var vendorConfig = getVendorConfig(vendorId);
                    if (vendorConfig) {
                        var account = vendorConfig.account;
                        var currency = vendorConfig.currency
                        var taxcode = vendorConfig.taxcode;

                        currentRecord.setValue({ fieldId: 'entity', value: vendorId });
                        log.debug("*****Account******: ", account);
                        if (account) currentRecord.setValue({ fieldId: 'account', value: account, ignoreFieldChange: true });
                        log.debug("Currency: ", currency);
                        if (currency) currentRecord.setValue({ fieldId: 'currency', value: currency });

                        var item = vendorConfig.item;
                        log.debug("Item: ", item);

                        var category = vendorConfig.category;
                        log.debug("Category: ", category);
                    }
                }
                if (subsidiaryId) {
                    // Step 2: Fetch location, class, and department from custom record
                    var subsidiaryConfig = getSubsidiaryConfig(subsidiaryId);
                    var jsonFileId = getJsonFileId(recordId);
                    log.debug("jsonFileId", jsonFileId);

                    if (subsidiaryConfig) {
                        var location = subsidiaryConfig.location;
                        var className = subsidiaryConfig.class;
                        var department = subsidiaryConfig.department;

                        log.debug({ title: strDebugTitle + ' (pageInit)', details: "Fetched values - Location: " + location + ", Class: " + className + ", Department: " + department });
                    }
                    else {
                        log.debug({ title: strDebugTitle + ' (pageInit)', details: "No subsidiary ID found in URL" });
                    }
                }

                setupPdfInteraction();
                attachFieldFocusListeners();
            } catch (err) {
                log.error({ title: strDebugTitle + ' (pageInit) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function getJsonFileId(recordId) {
            try {
                var fileSearch = search.create({
                    type: 'file',
                    filters: [
                        ['name', 'contains', recordId + '.json'],
                        'AND',
                        ['folder', 'is', '3465']
                    ],
                    columns: ['internalid', 'name']
                });

                var result = fileSearch.run().getRange({ start: 0, end: 1 });

                if (result && result.length > 0) {
                    var fileId = result[0].getValue({ name: 'internalid' });
                    log.debug('Found File ID', fileId);
                    return fileId;
                } else {
                    log.debug('No JSON file found for record', recordId);
                    return null;
                }

            } catch (e) {
                log.error('Error in getJsonFileId', e);
                return null;
            }
        }

        /**
         * Helper function to fetch subsidiary config
         */
        function getSubsidiaryConfig(subsidiaryId) {
            try {
                if (!subsidiaryId) {
                    log.debug(`${DEBUG_TITLE} (getSubsidiaryConfig)`, 'No subsidiary ID provided');
                    return null;
                }
                const subsidiarySearch = search.create({
                    type: 'customrecord_lstcptr_subsidiary_config',
                    filters: [
                        ['custrecord_lstcptr_sub_config_subsidiary', 'anyof', subsidiaryId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'custrecord_lstcptr_location',
                        'custrecord_lstcptr_class',
                        'custrecord_lstcptr_department'
                    ]
                });
                const result = subsidiarySearch.run().getRange({ start: 0, end: 1 });
                const config = result.length ? {
                    location: result[0].getValue('custrecord_lstcptr_location'),
                    class: result[0].getValue('custrecord_lstcptr_class'),
                    department: result[0].getValue('custrecord_lstcptr_department')
                } : null;
                log.debug({
                    title: `${DEBUG_TITLE} (getSubsidiaryConfig)`,
                    details: `Subsidiary ${subsidiaryId} config: ${JSON.stringify(config)}`
                });
                return config;
            } catch (err) {
                logError('getSubsidiaryConfig', err);
                console.error(`getSubsidiaryConfig Error: ${err.message}`);
                return null;
            }
        }

        function getVendorConfig(vendorId) {
            try {
                if (!vendorId) {
                    log.debug(`${DEBUG_TITLE} (getVendorConfig)`, 'No vendor ID provided');
                    return null;
                }
                const vendorSearch = search.create({
                    type: 'customrecord_lstcptr_vendor_config',
                    filters: [
                        ['custrecord_lstcptr_vendor_con_parent_ven', 'anyof', vendorId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        'custrecord_lstcptr_ap_account',
                        'custrecord_lstcptr_vendor_con_currency',
                        'custrecord_lstcptr_vendor_con_item',
                        'custrecord_lstcptr_vendor_con_tax_code',
                        'custrecord_lstcptr_vendor_con_category',
                        'custrecord_lstcptr_vendor_con_subsidiary'
                    ]
                });
                const result = vendorSearch.run().getRange({ start: 0, end: 1 });
                const config = result.length ? {
                    account: result[0].getValue('custrecord_lstcptr_ap_account'),
                    currency: result[0].getValue('custrecord_lstcptr_vendor_con_currency'),
                    item: result[0].getValue('custrecord_lstcptr_vendor_con_item'),
                    taxcode: result[0].getValue('custrecord_lstcptr_vendor_con_tax_code'),
                    category: result[0].getText('custrecord_lstcptr_vendor_con_category'),
                    subsidiary: result[0].getValue('custrecord_lstcptr_vendor_con_subsidiary')
                } : null;
                log.debug({
                    title: `${DEBUG_TITLE} (getVendorConfig)`,
                    details: `Vendor ${vendorId} config: ${JSON.stringify(config)}`
                });
                return config;
            } catch (err) {
                logError('getVendorConfig', err);
                console.error(`getVendorConfig Error: ${err.message}`);
                return null;
            }
        }

        function postSourcing(context) {
            try {
                const rec = context.currentRecord;
                const fieldId = context.fieldId;

                if (fieldId === 'entity') {
                    const vendorId = rec.getValue('entity');
                    if (!vendorId) {
                        log.debug({
                            title: `${DEBUG_TITLE} (postSourcing)`,
                            details: 'No vendor selected, skipping'
                        });
                        console.log(`postSourcing: No vendor selected`);
                        return;
                    }

                    // Get vendor configuration
                    const vendorConfig = getVendorConfig(vendorId);
                    const vendorLookup = vendorId ? search.lookupFields({
                        type: search.Type.VENDOR,
                        id: vendorId,
                        columns: ['subsidiary', 'payablesaccount', 'currency']
                    }) : {};

                    const subsidiaryId = vendorConfig?.subsidiary || vendorLookup.subsidiary?.[0]?.value || rec.getValue('subsidiary');
                    if (!subsidiaryId) {
                        log.debug({
                            title: `${DEBUG_TITLE} (postSourcing)`,
                            details: `No subsidiary found for vendor ${vendorId}`
                        });
                        console.warn(`postSourcing: No subsidiary for vendor ${vendorId}`);
                        return;
                    }

                    // Set vendor-related fields
                    const vendorFields = [
                        { id: 'subsidiary', value: subsidiaryId },
                        { id: 'account', value: vendorConfig?.account || vendorLookup.payablesaccount?.[0]?.value },
                        { id: 'currency', value: vendorConfig?.currency || vendorLookup.currency?.[0]?.value }
                    ].filter(field => field.value);

                    vendorFields.forEach(field => {
                        rec.setValue({
                            fieldId: field.id,
                            value: field.value,
                            ignoreFieldChange: true
                        });
                    });

                    // Get subsidiary configuration
                    const subsidiaryConfig = getSubsidiaryConfig(subsidiaryId);
                    if (subsidiaryConfig) {
                        const subsidiaryFields = [
                            { id: 'department', value: subsidiaryConfig.department },
                            { id: 'class', value: subsidiaryConfig.class },
                            { id: 'location', value: subsidiaryConfig.location }
                        ].filter(field => field.value);

                        subsidiaryFields.forEach(field => {
                            rec.setValue({
                                fieldId: field.id,
                                value: field.value,
                                ignoreFieldChange: true
                            });
                        });
                    } else {
                        log.debug({
                            title: `${DEBUG_TITLE} (postSourcing)`,
                            details: `No subsidiary config found for subsidiary ${subsidiaryId}`
                        });
                        console.warn(`postSourcing: No subsidiary config for ID ${subsidiaryId}`);
                        dialog.alert({
                            title: 'Configuration Missing',
                            message: `No subsidiary configuration found for subsidiary ID ${subsidiaryId}. Please contact your administrator.`
                        });
                    }

                    log.debug({
                        title: `${DEBUG_TITLE} (postSourcing)`,
                        details: `Set fields for vendor ${vendorId}, subsidiary ${subsidiaryId}: ${JSON.stringify({
                            subsidiary: subsidiaryId,
                            account: vendorFields.find(f => f.id === 'account')?.value,
                            currency: vendorFields.find(f => f.id === 'currency')?.value,
                            ...subsidiaryConfig
                        })}`
                    });
                    console.log(`postSourcing: Set fields - ${JSON.stringify({
                        vendorId,
                        subsidiaryId,
                        account: vendorFields.find(f => f.id === 'account')?.value,
                        currency: vendorFields.find(f => f.id === 'currency')?.value,
                        ...subsidiaryConfig
                    })}`);
                }
            } catch (err) {
                logError('postSourcing', err);
                console.error(`postSourcing Error: ${err.message}`);
            }
        }

        // /**
        //  * Function executed when a field changes
        //  */
        // function fieldChanged(context) {
        //     try {
        //         const pdfCanvas = document.getElementById('pdfCanvas');
        //         if (!pdfCanvas) return;
        //         var fieldId = context.fieldId;
        //         var rec = context.currentRecord;

        //         if (fieldId === 'istaxable') {
        //             log.debug({ title: strDebugTitle, details: "Clearing highlights for istaxable field" });
        //             clearPdfHighlights();
        //             return;
        //         }

        //         if (fieldId === 'custbody_lstcptr_vb_line_dep' || fieldId === 'custbody_lstcptr_vb_line_loc' || fieldId === 'custbody_lstcptr_vb_line_class') {
        //             var lineCount = rec.getLineCount({ sublistId: 'expense' });
        //             var value = rec.getValue({ fieldId: fieldId });

        //             for (var i = 0; i < lineCount; i++) {
        //                 rec.selectLine({ sublistId: 'expense', line: i });

        //                 if (fieldId === 'custbody_lstcptr_vb_line_dep') {
        //                     rec.setCurrentSublistValue({
        //                         sublistId: 'expense',
        //                         fieldId: 'department',
        //                         value: value
        //                     });
        //                 }
        //                 else if (fieldId === 'custbody_lstcptr_vb_line_loc') {
        //                     rec.setCurrentSublistValue({
        //                         sublistId: 'expense',
        //                         fieldId: 'location',
        //                         value: value
        //                     });
        //                 }
        //                 else if (fieldId === 'custbody_lstcptr_vb_line_class') {
        //                     rec.setCurrentSublistValue({
        //                         sublistId: 'expense',
        //                         fieldId: 'class',
        //                         value: value
        //                     });
        //                 }

        //                 //  rec.commitLine({ sublistId: 'expense' });
        //             }
        //         }
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        // }

        function saveRecord(context) {
            try {
                const pdfCanvas = document.getElementById('pdfCanvas');
                if (!pdfCanvas) {
                    log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'pdfCanvas element not found, allowing save to proceed' });
                    return true; // Adjust based on requirements
                }

                var rec = context.currentRecord;
                var lineCount = rec.getLineCount({ sublistId: 'expense' });
                if (lineCount === -1) {
                    log.error({ title: strDebugTitle + ' (saveRecord)', details: 'Expense sublist not found on record' });
                    alert('Expense sublist is not configured. Please contact your administrator.');
                    return false;
                }

                // Verify category field exists
                var categoryField = rec.getSublistField({ sublistId: 'expense', fieldId: 'category', line: 0 });
                if (!categoryField) {
                    log.error({ title: strDebugTitle + ' (saveRecord)', details: 'Category field not found on expense sublist' });
                    alert('Category field is not configured on the expense sublist. Please contact your administrator.');
                    return false;
                }

                var missingItemLine = null;

                for (var i = 0; i < lineCount; i++) {
                    try {
                        rec.selectLine({ sublistId: 'expense', line: i });
                        var category = rec.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'category'
                        });

                        if (!category) {
                            missingItemLine = i + 1;
                            break;
                        }
                    } catch (sublistErr) {
                        log.error({ title: strDebugTitle + ' (saveRecord) Sublist Error', details: JSON.stringify({ code: sublistErr.name, message: sublistErr.message, line: i }) });
                        alert('Error accessing expense line ' + (i + 1) + '. Please contact your administrator.');
                        return false;
                    }
                }

                if (missingItemLine) {
                    alert('Line ' + missingItemLine + ' does not have a category selected. Please complete all categories before saving.');
                    return false;
                }

                return true;

            } catch (err) {
                log.error({ title: strDebugTitle + ' (saveRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                alert('An unexpected error occurred while saving the record. Please contact your administrator.');
                return false;
            }
        }

        /**
         * Attach focus listeners to fields
         */
        function attachFieldFocusListeners() {
            try {
                var inputFields = document.querySelectorAll('input, textarea, select, email, hyperlink, integer, decimal, currency');
                inputFields.forEach(function (field) {
                    field.addEventListener('focus', function () {
                        lastClickedFieldId = field.id.replace('_formattedValue', '');
                        log.debug({ title: strDebugTitle, details: "Field focused: " + lastClickedFieldId });
                        if (lastClickedFieldId === 'inpt_category' || lastClickedFieldId === 'memo' || lastClickedFieldId === 'amount') {
                            return;
                        }
                        if (previousDates[lastClickedFieldId]) {
                            let searchDate = previousDates[lastClickedFieldId];
                            log.debug({ title: strDebugTitle, details: "Previous date found for field: " + lastClickedFieldId + " - " + searchDate });
                            clearPdfHighlights();
                        }
                    });

                    field.addEventListener('blur', function () {
                        clearPdfHighlights();
                    });
                });
            }
            catch (err) {
                log.error({ title: strDebugTitle + ' (attachFieldFocusListeners) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Apply selected PDF text to field
         */
        function applySelectedPdfTextToField(pdfText) {
            try {
                if (!lastClickedFieldId || !pdfText) {
                    log.debug({ title: strDebugTitle, details: "No field selected or no text to copy." });
                    return;
                }
                var rec = currentRecord.get();
                var field = rec.getField({ fieldId: lastClickedFieldId });

                if (!field) {
                    log.error({ title: strDebugTitle, details: "Field not found: " + lastClickedFieldId });
                    setValueLinelevel(pdfText);
                    return;
                }

                var fieldType = field.type;
                log.debug({ title: strDebugTitle, details: "Field type for " + lastClickedFieldId + ": " + fieldType });

                var valueToSet;

                switch (fieldType) {
                    case 'date':
                        var parsedDate = parseDate(pdfText);
                        if (parsedDate) {
                            valueToSet = parsedDate;
                            log.debug({ title: strDebugTitle, details: "Parsed date value: " + valueToSet + " from: " + pdfText });
                            if (parsedDate) {
                                currentDate = pdfText;
                                currentFieldId = lastClickedFieldId;
                                if (currentDate) {
                                    previousDates[currentFieldId] = currentDate;
                                    log.debug({ title: strDebugTitle, details: "Previous date stored for field: " + currentFieldId + " - " + currentDate });
                                }
                            }
                        } else {
                            log.error({ title: strDebugTitle, details: "Failed to parse date from: " + pdfText });
                            return;
                        }
                        break;

                    default:
                        valueToSet = pdfText.trim();
                }

                try {
                    if (fieldType === 'date') {
                        var dateObj = new Date(valueToSet);
                        if (!isNaN(dateObj.getTime())) {
                            rec.setValue({ fieldId: lastClickedFieldId, value: dateObj });
                        }
                    }
                    else if (fieldType === 'text' || fieldType === 'textarea') {
                        rec.setValue({ fieldId: lastClickedFieldId, value: valueToSet });
                    }
                    else {
                        var currencySymbolsPattern = /^[\$\€\¥\£\₹\₽\₺\₩\₫\₪\₦\₱\฿\₲\₡\₭\₮\₸\Br\лв\R$\د.إд.к\.м\.р\.с\₼]+/;
                        if (currencySymbolsPattern.test(pdfText)) {
                            valueToSet = pdfText.replace(currencySymbolsPattern, '').replace(/,/g, '').trim();
                            rec.setValue({ fieldId: lastClickedFieldId, value: valueToSet });
                        } else {
                            valueToSet = pdfText.trim();
                            rec.setValue({ fieldId: lastClickedFieldId, value: valueToSet });
                        }
                    }

                    var fieldElement = document.getElementById(lastClickedFieldId);
                    if (fieldElement) {
                        fieldElement.focus();
                    }

                    log.debug({ title: strDebugTitle, details: "Successfully set value for field " + lastClickedFieldId + ": " + valueToSet });

                } catch (setValueError) {
                    log.error({ title: strDebugTitle, details: "Error setting value: " + setValueError.message });
                }

                removeHighlightBoxes();

            } catch (err) {
                log.error({ title: strDebugTitle + ' (applySelectedPdfTextToField) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Set value for line-level fields
         */
        function setValueLinelevel(pdfText) {
            try {
                if (!lastClickedFieldId || !pdfText) {
                    log.debug({ title: strDebugTitle, details: "No field selected or no text to copy." });
                    return;
                }
                var rec = currentRecord.get();
                var valueToSet;

                try {
                    if (lastClickedFieldId === 'memo') {
                        valueToSet = pdfText;
                    } else {
                        var currencySymbolsPattern = /^[\$\€\¥\£\₹\₽\₺\₩\₫\₪\₦\₱\฿\₲\₡\₭\₮\₸\Br\лв\R$\د.إд.к\.м\.р\.с\₼]+/;
                        if (currencySymbolsPattern.test(pdfText)) {
                            valueToSet = pdfText.replace(currencySymbolsPattern, '').replace(/,/g, '').trim();
                        } else {
                            valueToSet = pdfText.trim();
                        }
                    }

                    setFieldValueBasedOnType(rec, lastClickedFieldId, valueToSet);

                    var fieldElement = document.getElementById(lastClickedFieldId);
                    if (fieldElement) {
                        fieldElement.focus();
                    }
                    log.debug({ title: strDebugTitle, details: "Successfully set value for field " + lastClickedFieldId + ": " + valueToSet });

                } catch (setValueError) {
                    log.error({ title: strDebugTitle, details: "Error setting value: " + setValueError.message });
                }
                removeHighlightBoxes();

            } catch (err) {
                log.error({ title: strDebugTitle + ' (setValueLinelevel) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Set field value based on type
         */
        function setFieldValueBasedOnType(rec, fieldId, value) {
            try {
                if (isSublistField(rec, 'expense')) {
                    setLineFieldValue(rec, 'expense', fieldId, value);
                } else if (isSublistField(rec, 'item')) {
                    setLineFieldValue(rec, 'item', fieldId, value);
                } else {
                    log.debug({ title: strDebugTitle, details: "Setting value for body field: " + fieldId });
                    setBodyFieldValue(rec, fieldId, value);
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setFieldValueBasedOnType) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Check if field is in sublist
         */
        function isSublistField(rec, sublistId) {
            try {
                var currentLine = rec.getCurrentSublistIndex({ sublistId: sublistId });
                return currentLine >= 0;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (isSublistField) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return false;
            }
        }

        /**
         * Set body field value
         */
        function setBodyFieldValue(rec, fieldId, value) {
            try {
                rec.setValue({ fieldId: fieldId, value: value });
                log.debug({ title: strDebugTitle, details: "Successfully set body field: " + fieldId + " to value: " + value });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setBodyFieldValue) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Set line field value
         */
        function setLineFieldValue(rec, sublistId, fieldId, value) {
            try {
                var currentLine = rec.getCurrentSublistIndex({ sublistId: sublistId });
                rec.selectLine({ sublistId: sublistId, line: currentLine });
                rec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    value: value
                });
                log.debug({ title: strDebugTitle, details: "Set line field value: " + fieldId + " to value: " + value });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setLineFieldValue) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Parse date string
         */
        function parseDate(dateString) {
            try {
                var dateFormats =
                    [
                        { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'M/D/YYYY' },
                        { regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/, format: 'M/D/YY' },
                        { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'D/M/YYYY' },
                        { regex: /^\d{1,2}-[A-Za-z]{3}-\d{4}$/, format: 'D-Mon-YYYY' },
                        { regex: /^\d{1,2}\.\d{1,2}\.\d{4}$/, format: 'D.M.YYYY' },
                        { regex: /^\d{1,2}-[A-Za-z]+-\d{4}$/, format: 'D-MONTH-YYYY' },
                        { regex: /^\d{1,2} [A-Za-z]+, \d{4}$/, format: 'D MONTH, YYYY' },
                        { regex: /^\d{4}\/\d{1,2}\/\d{1,2}$/, format: 'YYYY/M/D' },
                        { regex: /^\d{4}-\d{1,2}-\d{1,2}$/, format: 'YYYY-M-D' },
                        { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'DD/MM/YYYY' },
                        { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: 'DD-Mon-YYYY' },
                        { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
                        { regex: /^\d{2}-[A-Za-z]+-\d{4}$/, format: 'DD-MONTH-YYYY' },
                        { regex: /^\d{2} [A-Za-z]+, \d{4}$/, format: 'DD MONTH, YYYY' },
                        { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
                        { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
                        { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
                        { regex: /^\d{1,2} [A-Za-z]+ \d{4}$/, format: 'D MONTH YYYY' }
                    ];

                for (var i = 0; i < dateFormats.length; i++) {
                    var format = dateFormats[i];
                    if (format.regex.test(dateString)) {
                        var parts, year, month, day;

                        switch (format.format) {
                            case 'M/D/YYYY':
                            case 'D/M/YYYY':
                            case 'MM/DD/YYYY':
                            case 'DD/MM/YYYY':
                                parts = dateString.split('/');
                                if (format.format.startsWith('M') || format.format.startsWith('MM')) {
                                    month = parts[0];
                                    day = parts[1];
                                } else {
                                    day = parts[0];
                                    month = parts[1];
                                }
                                year = parts[2];
                                break;
                            case 'M/D/YY':
                                parts = dateString.split('/');
                                month = parts[0];
                                day = parts[1];
                                year = '20' + parts[2];
                                break;
                            case 'D-Mon-YYYY':
                            case 'DD-Mon-YYYY':
                                parts = dateString.split('-');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2];
                                break;
                            case 'D.M.YYYY':
                            case 'DD.MM.YYYY':
                                parts = dateString.split('.');
                                day = parts[0];
                                month = parts[1];
                                year = parts[2];
                                break;
                            case 'D-MONTH-YYYY':
                            case 'DD-MONTH-YYYY':
                                parts = dateString.split('-');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2];
                                break;
                            case 'D MONTH, YYYY':
                            case 'DD MONTH, YYYY':
                                parts = dateString.split(' ');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2].replace(',', '');
                                break;
                            case 'YYYY/M/D':
                            case 'YYYY/MM/DD':
                            case 'YYYY-M-D':
                            case 'YYYY-MM-DD':
                                parts = dateString.split(/[-\/]/);
                                year = parts[0];
                                if (format.format.endsWith('D')) {
                                    month = parts[1];
                                    day = parts[2];
                                } else {
                                    day = parts[1];
                                    month = parts[2];
                                }
                                break;
                            case 'D MONTH YYYY':
                                parts = dateString.split(' ');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2];
                                break;
                        }

                        var date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime())) {
                            return formatDate(date);
                        }
                    }
                }
                return null;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (parseDate) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }


        /**
         * Format date based on company preference
         */
        function formatDate(date) {
            try {
                return format.format({
                    value: date,
                    type: format.Type.DATE
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (formatDate) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Remove highlight boxes from PDF
         */
        function removeHighlightBoxes() {
            try {
                const highlightBoxes = document.querySelectorAll('.highlight-box');
                highlightBoxes.forEach(box => box.remove());
            } catch (err) {
                log.error({ title: strDebugTitle + ' (removeHighlightBoxes) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
        /**
         * Setup PDF interaction
         */
        function setupPdfInteraction() {
            try {
                const pdfCanvas = document.getElementById('pdfCanvas');
                if (!pdfCanvas) return;
                const selectionBox = document.getElementById('selectionBox');
                if (!selectionBox) return;

                let isMouseDown = false;
                let startX, startY;

                pdfCanvas.addEventListener('click', function () {
                    clearPdfHighlights();
                    if (lastHoveredItem) {
                        var capturedText = lastHoveredItem.str;
                        applySelectedPdfTextToField(capturedText);
                    }
                });

                pdfCanvas.addEventListener('mousedown', function (e) {
                    const rect = pdfCanvas.getBoundingClientRect();
                    startX = e.clientX - rect.left;
                    startY = e.clientY - rect.top;
                    isMouseDown = true;

                    selectionBox.style.left = `${startX}px`;
                    selectionBox.style.top = `${startY}px`;
                    selectionBox.style.width = `0px`;
                    selectionBox.style.height = `0px`;
                    selectionBox.style.display = 'block';
                });

                pdfCanvas.addEventListener('mousemove', function (e) {
                    if (!isMouseDown) return;

                    const rect = pdfCanvas.getBoundingClientRect();
                    const endX = e.clientX - rect.left;
                    const endY = e.clientY - rect.top;
                    const width = Math.abs(endX - startX);
                    const height = Math.abs(endY - startY);
                    selectionBox.style.width = `${width}px`;
                    selectionBox.style.height = `${height}px`;

                    if (endX < startX) {
                        selectionBox.style.left = `${endX}px`;
                    }
                    if (endY < startY) {
                        selectionBox.style.top = `${endY}px`;
                    }
                });

                pdfCanvas.addEventListener('mouseup', async function (e) {
                    isMouseDown = false;
                    selectionBox.style.display = 'none';

                    const dragDistanceX = Math.abs(e.clientX - (startX + pdfCanvas.getBoundingClientRect().left));
                    const dragDistanceY = Math.abs(e.clientY - (startY + pdfCanvas.getBoundingClientRect().top));

                    if (dragDistanceX > 5 || dragDistanceY > 5) {
                        const selectedText = await captureSelectedText(startX, startY, e.clientX - pdfCanvas.getBoundingClientRect().left, e.clientY - pdfCanvas.getBoundingClientRect().top);
                        if (selectedText.length > 0) {
                            log.debug({ title: strDebugTitle, details: 'Selected Text: ' + selectedText.join('\n') });
                            applySelectedPdfTextToField(selectedText.join('\n'));
                        }
                    }
                });

                async function captureSelectedText(x1, y1, x2, y2) {
                    const selectedText = [];
                    const minX = Math.min(x1, x2);
                    const maxX = Math.max(x1, x2);
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);

                    const lines = {};

                    for (let item of pdfTextContent) {
                        const left = item.transform[4] * pdfPageViewport.scale;
                        const top = pdfPageViewport.height - (item.transform[5] * pdfPageViewport.scale);
                        const width = item.width * pdfPageViewport.scale;
                        const height = item.height * pdfPageViewport.scale;

                        if (left + width >= minX && left <= maxX && top >= minY && top - height <= maxY) {
                            const lineY = Math.floor(top);
                            if (!lines[lineY]) {
                                lines[lineY] = [];
                            }

                            let charLeft = left;
                            const charWidth = width / item.str.length;

                            for (let i = 0; i < item.str.length; i++) {
                                const char = item.str[i];
                                if (charLeft + charWidth >= minX && charLeft <= maxX) {
                                    lines[lineY].push({ text: char, x: charLeft });
                                }
                                charLeft += charWidth;
                            }
                        }
                    }

                    const sortedLines = Object.keys(lines).sort((a, b) => a - b);
                    for (let line of sortedLines) {
                        lines[line].sort((a, b) => a.x - b.x);
                        selectedText.push(lines[line].map(item => item.text).join(''));
                    }

                    return selectedText;
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setupPdfInteraction) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Clear PDF highlights
         */
        function clearPdfHighlights() {
            try {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (clearPdfHighlights) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        return {
            pageInit: pageInit,
            //fieldChanged: fieldChanged,
            saveRecord: saveRecord,
            postSourcing: postSourcing
        };
    });