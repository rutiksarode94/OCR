/**
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name: LSTCapture Bill To Process Split Screen CS (lstcptr_bill_split_screen_cs.js)
 * Version: 1.2.0 - 15-July-2025 - Refactored for modularity and improved error handling
 * Author: LiveStrong Technologies
 * Purpose: Handle client-side logic for the LSTCapture Bill To Process Split Screen, including field population, PDF interaction, and validation.
 * Script: customscript_lstcptr_bill_split_screen
 * Deploy: customdeploy_lstcptr_bill_split_screen
 * Notes: Adapted for Vendor Bill with enhanced modularity and error handling.
 *
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/format', 'N/ui/dialog', 'N/currentRecord', 'N/log', 'N/search', 'N/record', './lstcptr_constants'],
    /**
     * @param {Object} format - NetSuite format module
     * @param {Object} dialog - NetSuite dialog module
     * @param {Object} currentRecord - NetSuite currentRecord module
     * @param {Object} log - NetSuite log module
     * @param {Object} search - NetSuite search module
     * @param {Object} record - NetSuite record module
     * @param {Object} constants - LSTCPTR constants
     */
    (format, dialog, currentRecord, log, search, record, constants) => {
        const DEBUG_TITLE = constants.BILL_SPLIT_SCREEN_DEBUG_TITLE;

        // State variables
        let lastClickedFieldId = null;
        let previousDates = {};
        let currentFieldId = '';
        let currentDate = '';

        /**
         * Checks if a value is valid (not null, undefined, empty, etc.).
         * @param {*} value - Value to check
         * @returns {boolean} True if the value is valid
         */
        const isValidValue = (value) => {
            return value != null && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN';
        };

        /**
         * Logs an error with consistent formatting.
         * @param {string} functionName - Name of the function where the error occurred
         * @param {Error} err - Error object
         */
        const logError = (functionName, err) => {
            log.error({
                title: `${DEBUG_TITLE} (${functionName}) Error`,
                details: JSON.stringify({ code: err.name, message: err.message })
            });
            console.error(`${functionName} Error: ${err.message}`);
        };

        /**
         * Retrieves JSON file ID for a given record.
         * @param {string|number} recordId - Vendor bill staging record ID
         * @returns {string|null} File ID or null if not found
         */
        const getJsonFileId = (recordId) => {
            try {
                if (!isValidValue(recordId)) {
                    log.debug(`${DEBUG_TITLE} (getJsonFileId)`, 'No record ID provided');
                    return null;
                }
                const fileSearch = search.create({
                    type: 'file',
                    filters: [
                        ['name', 'contains', `${recordId}.json`],
                        'AND',
                        ['folder', 'is', constants.FOLDER_IDS.JSON_FILES]
                    ],
                    columns: ['internalid', 'name']
                });
                const results = fileSearch.run().getRange({ start: 0, end: 1 });
                const fileId = results.length > 0 ? results[0].getValue('internalid') : null;
                log.debug(`${DEBUG_TITLE} (getJsonFileId)`, `File ID: ${fileId} for record ${recordId}`);
                return fileId;
            } catch (err) {
                logError('getJsonFileId', err);
                return null;
            }
        };

        /**
         * Retrieves vendor configuration.
         * @param {string|number} vendorId - Vendor internal ID
         * @returns {Object|null} Vendor configuration or null if not found
         */
        const getVendorConfig = (vendorId) => {
            try {
                if (!isValidValue(vendorId)) {
                    log.debug(`${DEBUG_TITLE} (getVendorConfig)`, 'No vendor ID provided');
                    return null;
                }
                const vendorSearch = search.create({
                    type: constants.RECORD_TYPES.VENDOR_CONFIG,
                    filters: [
                        [constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR, 'anyof', vendorId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        constants.VENDOR_CONFIG_FIELDS.AP_ACCOUNT,
                        constants.VENDOR_CONFIG_FIELDS.CURRENCY,
                        constants.VENDOR_CONFIG_FIELDS.ITEM,
                        constants.VENDOR_CONFIG_FIELDS.TAX_CODE,
                        constants.VENDOR_CONFIG_FIELDS.CATEGORY,
                        constants.VENDOR_CONFIG_FIELDS.SUBSIDIARY
                    ]
                });
                const results = vendorSearch.run().getRange({ start: 0, end: 1 });
                const config = results.length ? {
                    account: results[0].getValue(constants.VENDOR_CONFIG_FIELDS.AP_ACCOUNT),
                    currency: results[0].getValue(constants.VENDOR_CONFIG_FIELDS.CURRENCY),
                    item: results[0].getValue(constants.VENDOR_CONFIG_FIELDS.ITEM),
                    taxcode: results[0].getValue(constants.VENDOR_CONFIG_FIELDS.TAX_CODE),
                    category: results[0].getText(constants.VENDOR_CONFIG_FIELDS.CATEGORY),
                    subsidiary: results[0].getValue(constants.VENDOR_CONFIG_FIELDS.SUBSIDIARY)
                } : null;
                log.debug(`${DEBUG_TITLE} (getVendorConfig)`, `Vendor ${vendorId} config: ${JSON.stringify(config)}`);
                return config;
            } catch (err) {
                logError('getVendorConfig', err);
                return null;
            }
        };

        /**
         * Retrieves subsidiary configuration.
         * @param {string|number} subsidiaryId - Subsidiary internal ID
         * @returns {Object|null} Subsidiary configuration or null if not found
         */
        const getSubsidiaryConfig = (subsidiaryId) => {
            try {
                if (!isValidValue(subsidiaryId)) {
                    log.debug(`${DEBUG_TITLE} (getSubsidiaryConfig)`, 'No subsidiary ID provided');
                    return null;
                }
                const subsidiarySearch = search.create({
                    type: constants.RECORD_TYPES.SUBSIDIARY_CONFIG,
                    filters: [
                        [constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY, 'anyof', subsidiaryId],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        constants.SUBSIDIARY_CONFIG_FIELDS.DEPARTMENT,
                        constants.SUBSIDIARY_CONFIG_FIELDS.CLASS,
                        constants.SUBSIDIARY_CONFIG_FIELDS.LOCATION
                    ]
                });
                const results = subsidiarySearch.run().getRange({ start: 0, end: 1 });
                const config = results.length ? {
                    department: results[0].getValue(constants.SUBSIDIARY_CONFIG_FIELDS.DEPARTMENT),
                    class: results[0].getValue(constants.SUBSIDIARY_CONFIG_FIELDS.CLASS),
                    location: results[0].getValue(constants.SUBSIDIARY_CONFIG_FIELDS.LOCATION)
                } : null;
                log.debug(`${DEBUG_TITLE} (getSubsidiaryConfig)`, `Subsidiary ${subsidiaryId} config: ${JSON.stringify(config)}`);
                return config;
            } catch (err) {
                logError('getSubsidiaryConfig', err);
                return null;
            }
        };

        /**
         * Initializes page by setting up field values and PDF interactions.
         * @param {Object} context - Script context
         */
        const pageInit = (context) => {
            try {
                const rec = context.currentRecord;
                const url = window.location.href;
                const urlParams = new URLSearchParams(url.split('?')[1]);
                const subsidiaryId = urlParams.get('subsidiary');
                const vendorId = urlParams.get('vendor');
                const recordId = urlParams.get('vendorToBill');
                log.debug(`${DEBUG_TITLE} (pageInit)`, `Params - Subsidiary: ${subsidiaryId}, Vendor: ${vendorId}, VendorToBill: ${recordId}`);

                if (vendorId) {
                    const vendorConfig = getVendorConfig(vendorId);
                    if (vendorConfig) {
                        const fields = [
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.ENTITY, value: vendorId },
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.ACCOUNT, value: vendorConfig.account },
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.CURRENCY, value: vendorConfig.currency }
                        ].filter(field => isValidValue(field.value));
                        fields.forEach(field => {
                            rec.setValue({ fieldId: field.id, value: field.value, ignoreFieldChange: true });
                        });
                        log.debug(`${DEBUG_TITLE} (pageInit)`, `Set vendor fields: ${JSON.stringify(fields)}`);
                    }
                }

                if (subsidiaryId) {
                    const subsidiaryConfig = getSubsidiaryConfig(subsidiaryId);
                    if (subsidiaryConfig) {
                        const fields = [
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.DEPARTMENT, value: subsidiaryConfig.department },
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.CLASS, value: subsidiaryConfig.class },
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.LOCATION, value: subsidiaryConfig.location }
                        ].filter(field => isValidValue(field.value));
                        fields.forEach(field => {
                            rec.setValue({ fieldId: field.id, value: field.value, ignoreFieldChange: true });
                        });
                        log.debug(`${DEBUG_TITLE} (pageInit)`, `Set subsidiary fields: ${JSON.stringify(fields)}`);
                    }
                    getJsonFileId(recordId); // Log JSON file ID for debugging
                }

                setupPdfInteraction();
                attachFieldFocusListeners();
            } catch (err) {
                logError('pageInit', err);
            }
        };

        /**
         * Handles field changes, updating sublists or clearing PDF highlights.
         * @param {Object} context - Script context
         */
        const fieldChanged = (context) => {
            try {
                const rec = context.currentRecord;
                const fieldId = context.fieldId;

                if (fieldId === constants.STANDARD_FIELDS.VENDOR_BILL.ISTAXABLE) {
                    log.debug(`${DEBUG_TITLE} (fieldChanged)`, 'Clearing highlights for istaxable field');
                    clearPdfHighlights();
                    return;
                }

                if ([
                    constants.CUSTOM_FIELDS.VB_LINE_DEPARTMENT,
                    constants.CUSTOM_FIELDS.VB_LINE_LOCATION,
                    constants.CUSTOM_FIELDS.VB_LINE_CLASS
                ].includes(fieldId)) {
                    const lineCount = rec.getLineCount({ sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE });
                    const value = rec.getValue({ fieldId });
                    const sublistFieldMap = {
                        [constants.CUSTOM_FIELDS.VB_LINE_DEPARTMENT]: constants.STANDARD_FIELDS.VENDOR_BILL.DEPARTMENT,
                        [constants.CUSTOM_FIELDS.VB_LINE_LOCATION]: constants.STANDARD_FIELDS.VENDOR_BILL.LOCATION,
                        [constants.CUSTOM_FIELDS.VB_LINE_CLASS]: constants.STANDARD_FIELDS.VENDOR_BILL.CLASS
                    };
                    const sublistFieldId = sublistFieldMap[fieldId];

                    for (let i = 0; i < lineCount; i++) {
                        rec.selectLine({ sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE, line: i });
                        rec.setCurrentSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                            fieldId: sublistFieldId,
                            value
                        });
                    }
                    log.debug(`${DEBUG_TITLE} (fieldChanged)`, `Updated ${sublistFieldId} to ${value} for ${lineCount} expense lines`);
                }
            } catch (err) {
                logError('fieldChanged', err);
            }
        };

        /**
         * Validates the record before saving.
         * @param {Object} context - Script context
         * @returns {boolean} True if valid, false otherwise
         */
        const saveRecord = (context) => {
            try {
                const rec = context.currentRecord;
                const lineCount = rec.getLineCount({ sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE });
                if (lineCount === -1) {
                    log.error(`${DEBUG_TITLE} (saveRecord)`, 'Expense sublist not found');
                    dialog.alert({
                        title: 'Error',
                        message: 'Expense sublist is not configured. Please contact your administrator.'
                    });
                    return false;
                }

                const categoryField = rec.getSublistField({
                    sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                    fieldId: constants.STANDARD_FIELDS.EXPENSE_FIELDS.CATEGORY,
                    line: 0
                });
                if (!categoryField) {
                    log.error(`${DEBUG_TITLE} (saveRecord)`, 'Category field not found on expense sublist');
                    dialog.alert({
                        title: 'Error',
                        message: 'Category field is not configured on the expense sublist. Please contact your administrator.'
                    });
                    return false;
                }

                for (let i = 0; i < lineCount; i++) {
                    rec.selectLine({ sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE, line: i });
                    const category = rec.getCurrentSublistValue({
                        sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                        fieldId: constants.STANDARD_FIELDS.EXPENSE_FIELDS.CATEGORY
                    });
                    if (!category) {
                        dialog.alert({
                            title: 'Validation Error',
                            message: `Line ${i + 1} does not have a category selected. Please complete all categories before saving.`
                        });
                        return false;
                    }
                }

                return true;
            } catch (err) {
                logError('saveRecord', err);
                dialog.alert({
                    title: 'Error',
                    message: 'An unexpected error occurred while saving the record. Please contact your administrator.'
                });
                return false;
            }
        };

        /**
         * Handles post-sourcing logic for the entity field.
         * @param {Object} context - Script context
         */
        const postSourcing = (context) => {
            try {
                const rec = context.currentRecord;
                const fieldId = context.fieldId;

                if (fieldId === constants.STANDARD_FIELDS.VENDOR_BILL.ENTITY) {
                    const vendorId = rec.getValue(constants.STANDARD_FIELDS.VENDOR_BILL.ENTITY);
                    if (!vendorId) {
                        log.debug(`${DEBUG_TITLE} (postSourcing)`, 'No vendor selected, skipping');
                        return;
                    }

                    const vendorConfig = getVendorConfig(vendorId);
                    const vendorLookup = vendorId ? search.lookupFields({
                        type: search.Type.VENDOR,
                        id: vendorId,
                        columns: [
                            constants.STANDARD_FIELDS.VENDOR.SUBSIDIARY,
                            constants.STANDARD_FIELDS.VENDOR.PAYABLES_ACCOUNT,
                            constants.STANDARD_FIELDS.VENDOR.CURRENCY
                        ]
                    }) : {};

                    const subsidiaryId = vendorConfig?.subsidiary ||
                        vendorLookup[constants.STANDARD_FIELDS.VENDOR.SUBSIDIARY]?.[0]?.value ||
                        rec.getValue(constants.STANDARD_FIELDS.VENDOR_BILL.SUBSIDIARY);

                    if (!subsidiaryId) {
                        log.debug(`${DEBUG_TITLE} (postSourcing)`, `No subsidiary found for vendor ${vendorId}`);
                        dialog.alert({
                            title: 'Configuration Missing',
                            message: `No subsidiary found for vendor ID ${vendorId}. Please contact your administrator.`
                        });
                        return;
                    }

                    const vendorFields = [
                        { id: constants.STANDARD_FIELDS.VENDOR_BILL.SUBSIDIARY, value: subsidiaryId },
                        {
                            id: constants.STANDARD_FIELDS.VENDOR_BILL.ACCOUNT,
                            value: vendorConfig?.account || vendorLookup[constants.STANDARD_FIELDS.VENDOR.PAYABLES_ACCOUNT]?.[0]?.value
                        },
                        {
                            id: constants.STANDARD_FIELDS.VENDOR_BILL.CURRENCY,
                            value: vendorConfig?.currency || vendorLookup[constants.STANDARD_FIELDS.VENDOR.CURRENCY]?.[0]?.value
                        }
                    ].filter(field => isValidValue(field.value));

                    vendorFields.forEach(field => {
                        rec.setValue({
                            fieldId: field.id,
                            value: field.value,
                            ignoreFieldChange: true
                        });
                    });

                    const subsidiaryConfig = getSubsidiaryConfig(subsidiaryId);
                    if (subsidiaryConfig) {
                        const subsidiaryFields = [
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.DEPARTMENT, value: subsidiaryConfig.department },
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.CLASS, value: subsidiaryConfig.class },
                            { id: constants.STANDARD_FIELDS.VENDOR_BILL.LOCATION, value: subsidiaryConfig.location }
                        ].filter(field => isValidValue(field.value));

                        subsidiaryFields.forEach(field => {
                            rec.setValue({
                                fieldId: field.id,
                                value: field.value,
                                ignoreFieldChange: true
                            });
                        });
                    } else {
                        log.debug(`${DEBUG_TITLE} (postSourcing)`, `No subsidiary config found for subsidiary ${subsidiaryId}`);
                        dialog.alert({
                            title: 'Configuration Missing',
                            message: `No subsidiary configuration found for subsidiary ID ${subsidiaryId}. Please contact your administrator.`
                        });
                    }

                    log.debug(`${DEBUG_TITLE} (postSourcing)`, `Set fields for vendor ${vendorId}, subsidiary ${subsidiaryId}: ${JSON.stringify({
                        subsidiary: subsidiaryId,
                        account: vendorFields.find(f => f.id === constants.STANDARD_FIELDS.VENDOR_BILL.ACCOUNT)?.value,
                        currency: vendorFields.find(f => f.id === constants.STANDARD_FIELDS.VENDOR_BILL.CURRENCY)?.value,
                        ...subsidiaryConfig
                    })}`);
                }
            } catch (err) {
                logError('postSourcing', err);
            }
        };

        /**
         * Attaches focus and blur listeners to input fields.
         */
        const attachFieldFocusListeners = () => {
            try {
                const inputFields = document.querySelectorAll('input, textarea, select, email, hyperlink, integer, decimal, currency');
                inputFields.forEach(field => {
                    field.addEventListener('focus', () => {
                        lastClickedFieldId = field.id.replace('_formattedValue', '');
                        log.debug(`${DEBUG_TITLE} (attachFieldFocusListeners)`, `Field focused: ${lastClickedFieldId}`);
                        if (['inpt_category', 'memo', 'amount'].includes(lastClickedFieldId)) {
                            return;
                        }
                        if (previousDates[lastClickedFieldId]) {
                            const searchDate = previousDates[lastClickedFieldId];
                            log.debug(`${DEBUG_TITLE} (attachFieldFocusListeners)`, `Previous date found for field: ${lastClickedFieldId} - ${searchDate}`);
                            clearPdfHighlights();
                        }
                    });
                    field.addEventListener('blur', () => clearPdfHighlights());
                });
            } catch (err) {
                logError('attachFieldFocusListeners', err);
            }
        };

        /**
         * Applies selected PDF text to the active field.
         * @param {string} pdfText - Selected text from PDF
         */
        const applySelectedPdfTextToField = (pdfText) => {
            try {
                if (!lastClickedFieldId || !pdfText) {
                    log.debug(`${DEBUG_TITLE} (applySelectedPdfTextToField)`, 'No field selected or no text to copy');
                    return;
                }
                const rec = currentRecord.get();
                const field = rec.getField({ fieldId: lastClickedFieldId });

                if (!field) {
                    log.debug(`${DEBUG_TITLE} (applySelectedPdfTextToField)`, `Field not found: ${lastClickedFieldId}, attempting line-level`);
                    setValueLineLevel(pdfText);
                    return;
                }

                const fieldType = field.type;
                let valueToSet;

                if (fieldType === 'date') {
                    valueToSet = parseDate(pdfText);
                    if (valueToSet) {
                        currentDate = pdfText;
                        currentFieldId = lastClickedFieldId;
                        previousDates[currentFieldId] = currentDate;
                        log.debug(`${DEBUG_TITLE} (applySelectedPdfTextToField)`, `Stored date for ${currentFieldId}: ${currentDate}`);
                    } else {
                        log.error(`${DEBUG_TITLE} (applySelectedPdfTextToField)`, `Failed to parse date from: ${pdfText}`);
                        return;
                    }
                } else {
                    const currencySymbolsPattern = /^[\$\€\¥\£\₹\₽\₺\₩\₫\₪\₦\₱\฿\₲\₡\₭\₮\₸\Br\лв\R$\د.إд.к\.м\.р\.с\₼]+/;
                    valueToSet = currencySymbolsPattern.test(pdfText)
                        ? pdfText.replace(currencySymbolsPattern, '').replace(/,/g, '').trim()
                        : pdfText.trim();
                }

                setFieldValueBasedOnType(rec, lastClickedFieldId, valueToSet);
                const fieldElement = document.getElementById(lastClickedFieldId);
                if (fieldElement) fieldElement.focus();
                log.debug(`${DEBUG_TITLE} (applySelectedPdfTextToField)`, `Set value for ${lastClickedFieldId}: ${valueToSet}`);
                removeHighlightBoxes();
            } catch (err) {
                logError('applySelectedPdfTextToField', err);
            }
        };

        /**
         * Sets value for line-level fields.
         * @param {string} pdfText - Selected text from PDF
         */
        const setValueLineLevel = (pdfText) => {
            try {
                if (!lastClickedFieldId || !pdfText) {
                    log.debug(`${DEBUG_TITLE} (setValueLineLevel)`, 'No field selected or no text to copy');
                    return;
                }
                const rec = currentRecord.get();
                const currencySymbolsPattern = /^[\$\€\¥\£\₹\₽\₺\₩\₫\₪\₦\₱\฿\₲\₡\₭\₮\₸\Br\лв\R$\د.إд.к\.м\.р\.с\₼]+/;
                const valueToSet = lastClickedFieldId === 'memo'
                    ? pdfText
                    : currencySymbolsPattern.test(pdfText)
                        ? pdfText.replace(currencySymbolsPattern, '').replace(/,/g, '').trim()
                        : pdfText.trim();

                setFieldValueBasedOnType(rec, lastClickedFieldId, valueToSet);
                const fieldElement = document.getElementById(lastClickedFieldId);
                if (fieldElement) fieldElement.focus();
                log.debug(`${DEBUG_TITLE} (setValueLineLevel)`, `Set value for ${lastClickedFieldId}: ${valueToSet}`);
                removeHighlightBoxes();
            } catch (err) {
                logError('setValueLineLevel', err);
            }
        };

        /**
         * Sets field value based on its type.
         * @param {Object} rec - Current record
         * @param {string} fieldId - Field ID
         * @param {*} value - Value to set
         */
        const setFieldValueBasedOnType = (rec, fieldId, value) => {
            try {
                if (isSublistField(rec, constants.STANDARD_FIELDS.SUBLISTS.EXPENSE)) {
                    setLineFieldValue(rec, constants.STANDARD_FIELDS.SUBLISTS.EXPENSE, fieldId, value);
                } else if (isSublistField(rec, constants.STANDARD_FIELDS.SUBLISTS.ITEM)) {
                    setLineFieldValue(rec, constants.STANDARD_FIELDS.SUBLISTS.ITEM, fieldId, value);
                } else {
                    setBodyFieldValue(rec, fieldId, value);
                }
            } catch (err) {
                logError('setFieldValueBasedOnType', err);
            }
        };

        /**
         * Checks if a field is in a sublist.
         * @param {Object} rec - Current record
         * @param {string} sublistId - Sublist ID
         * @returns {boolean} True if field is in sublist
         */
        const isSublistField = (rec, sublistId) => {
            try {
                return rec.getCurrentSublistIndex({ sublistId }) >= 0;
            } catch (err) {
                logError('isSublistField', err);
                return false;
            }
        };

        /**
         * Sets body field value.
         * @param {Object} rec - Current record
         * @param {string} fieldId - Field ID
         * @param {*} value - Value to set
         */
        const setBodyFieldValue = (rec, fieldId, value) => {
            try {
                const field = rec.getField({ fieldId });
                if (field.type === 'date') {
                    const dateObj = new Date(value);
                    if (!isNaN(dateObj.getTime())) {
                        rec.setValue({ fieldId, value: dateObj });
                    }
                } else {
                    rec.setValue({ fieldId, value });
                }
                log.debug(`${DEBUG_TITLE} (setBodyFieldValue)`, `Set body field ${fieldId} to ${value}`);
            } catch (err) {
                logError('setBodyFieldValue', err);
            }
        };

        /**
         * Sets line field value.
         * @param {Object} rec - Current record
         * @param {string} sublistId - Sublist ID
         * @param {string} fieldId - Field ID
         * @param {*} value - Value to set
         */
        const setLineFieldValue = (rec, sublistId, fieldId, value) => {
            try {
                const currentLine = rec.getCurrentSublistIndex({ sublistId });
                rec.selectLine({ sublistId, line: currentLine });
                rec.setCurrentSublistValue({ sublistId, fieldId, value });
                log.debug(`${DEBUG_TITLE} (setLineFieldValue)`, `Set ${sublistId} field ${fieldId} to ${value}`);
            } catch (err) {
                logError('setLineFieldValue', err);
            }
        };

        /**
         * Parses a date string into a formatted date.
         * @param {string} dateString - Date string to parse
         * @returns {string|null} Formatted date or null if invalid
         */
        const parseDate = (dateString) => {
            try {
                const dateFormats = [
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

                for (const { regex, format: fmt } of dateFormats) {
                    if (regex.test(dateString)) {
                        let parts, year, month, day;
                        switch (fmt) {
                            case 'M/D/YYYY':
                            case 'D/M/YYYY':
                            case 'MM/DD/YYYY':
                            case 'DD/MM/YYYY':
                                parts = dateString.split('/');
                                [month, day] = fmt.startsWith('M') || fmt.startsWith('MM') ? [parts[0], parts[1]] : [parts[1], parts[0]];
                                year = parts[2];
                                break;
                            case 'M/D/YY':
                                parts = dateString.split('/');
                                [month, day, year] = [parts[0], parts[1], '20' + parts[2]];
                                break;
                            case 'D-Mon-YYYY':
                            case 'DD-Mon-YYYY':
                                parts = dateString.split('-');
                                [day, month, year] = [parts[0], new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1, parts[2]];
                                break;
                            case 'D.M.YYYY':
                            case 'DD.MM.YYYY':
                                parts = dateString.split('.');
                                [day, month, year] = parts;
                                break;
                            case 'D-MONTH-YYYY':
                            case 'DD-MONTH-YYYY':
                                parts = dateString.split('-');
                                [day, month, year] = [parts[0], new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1, parts[2]];
                                break;
                            case 'D MONTH, YYYY':
                            case 'DD MONTH, YYYY':
                                parts = dateString.split(' ');
                                [day, month, year] = [parts[0], new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1, parts[2].replace(',', '')];
                                break;
                            case 'YYYY/M/D':
                            case 'YYYY/MM/DD':
                            case 'YYYY-M-D':
                            case 'YYYY-MM-DD':
                                parts = dateString.split(/[-\/]/);
                                [year, month, day] = fmt.endsWith('D') ? [parts[0], parts[1], parts[2]] : [parts[0], parts[2], parts[1]];
                                break;
                            case 'D MONTH YYYY':
                                parts = dateString.split(' ');
                                [day, month, year] = [parts[0], new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1, parts[2]];
                                break;
                        }
                        const date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime())) {
                            return format.format({ value: date, type: format.Type.DATE });
                        }
                    }
                }
                return null;
            } catch (err) {
                logError('parseDate', err);
                return null;
            }
        };

        /**
         * Removes highlight boxes from the PDF.
         */
        const removeHighlightBoxes = () => {
            try {
                document.querySelectorAll('.highlight-box').forEach(box => box.remove());
            } catch (err) {
                logError('removeHighlightBoxes', err);
            }
        };

        /**
         * Clears PDF highlights and search input.
         */
        const clearPdfHighlights = () => {
            try {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                logError('clearPdfHighlights', err);
            }
        };

        /**
         * Sets up PDF interaction for text selection.
         */
        const setupPdfInteraction = () => {
            try {
                const pdfCanvas = document.getElementById('pdfCanvas');
                const selectionBox = document.getElementById('selectionBox');
                if (!pdfCanvas || !selectionBox) {
                    log.debug(`${DEBUG_TITLE} (setupPdfInteraction)`, 'pdfCanvas or selectionBox not found');
                    return;
                }

                let isMouseDown = false;
                let startX, startY;

                pdfCanvas.addEventListener('click', () => {
                    clearPdfHighlights();
                    if (window.lastHoveredItem) {
                        applySelectedPdfTextToField(window.lastHoveredItem.str);
                    }
                });

                pdfCanvas.addEventListener('mousedown', (e) => {
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

                pdfCanvas.addEventListener('mousemove', (e) => {
                    if (!isMouseDown) return;
                    const rect = pdfCanvas.getBoundingClientRect();
                    const endX = e.clientX - rect.left;
                    const endY = e.clientY - rect.top;
                    const width = Math.abs(endX - startX);
                    const height = Math.abs(endY - startY);
                    selectionBox.style.width = `${width}px`;
                    selectionBox.style.height = `${height}px`;
                    if (endX < startX) selectionBox.style.left = `${endX}px`;
                    if (endY < startY) selectionBox.style.top = `${endY}px`;
                });

                pdfCanvas.addEventListener('mouseup', async (e) => {
                    isMouseDown = false;
                    selectionBox.style.display = 'none';
                    const dragDistanceX = Math.abs(e.clientX - (startX + pdfCanvas.getBoundingClientRect().left));
                    const dragDistanceY = Math.abs(e.clientY - (startY + pdfCanvas.getBoundingClientRect().top));
                    if (dragDistanceX > 5 || dragDistanceY > 5) {
                        const selectedText = await captureSelectedText(
                            startX,
                            startY,
                            e.clientX - pdfCanvas.getBoundingClientRect().left,
                            e.clientY - pdfCanvas.getBoundingClientRect().top
                        );
                        if (selectedText.length > 0) {
                            log.debug(`${DEBUG_TITLE} (setupPdfInteraction)`, `Selected Text: ${selectedText.join('\n')}`);
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

                    for (let item of window.pdfTextContent || []) {
                        const left = item.transform[4] * window.pdfPageViewport?.scale;
                        const top = window.pdfPageViewport?.height - (item.transform[5] * window.pdfPageViewport?.scale);
                        const width = item.width * window.pdfPageViewport?.scale;
                        const height = item.height * window.pdfPageViewport?.scale;

                        if (left + width >= minX && left <= maxX && top >= minY && top - height <= maxY) {
                            const lineY = Math.floor(top);
                            if (!lines[lineY]) lines[lineY] = [];
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
                logError('setupPdfInteraction', err);
            }
        };

        return {
            pageInit,
            fieldChanged,
            saveRecord,
            postSourcing
        };
    });