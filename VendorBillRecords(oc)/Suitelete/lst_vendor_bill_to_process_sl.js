/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            Vendor Bill To Process Records (lst_vendor_bill_to_process.js)
*
* Version:         1.0.0   -   12-March-2025 -  RS      Initial Development.
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script is used to show vendor bill records.
*
* Script:          customscript_lstcptr_vendor_bill_process
* Deploy:          customdeploy_lstcptr_vendor_bill_process
*
*********************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @FileName lst_vendor_bill_to_process.js
 */
define(['N/file', 'N/search', 'N/record', 'N/render', 'N/runtime', 'N/ui/serverWidget', 'N/redirect', './LST Capture/lstcptr_constants'], 
(file, search, record, render, runtime, serverWidget, redirect, constants) => {
    const strDebugTitle = constants.VENDOR_BILL_PROCESS_DEBUG_TITLE;

    /**
     * Main entry point for the Suitelet.
     * @param {Object} context - Suitelet context object
     */
    function onRequest(context) {
        try {
            const request = context.request;
            const user = runtime.getCurrentUser();
            const accountId = runtime.accountId;
            log.debug({ title: strDebugTitle, details: `User ID: ${user.id} | Role ID: ${user.role} | User Name: ${user.name}` });

            if (request.method === 'GET') {
                displayVendorBillForm(context, accountId);
            } else if (request.method === 'POST') {
                handleRejectAction(context);
            }
        } catch (err) {
            log.error({ title: `${strDebugTitle} - onRequest Error`, details: `${err.name}: ${err.message}` });
            context.response.write({ output: `Error: ${err.message}` });
        }
    }

    /**
     * Displays the vendor bill records form with an HTML table.
     * @param {Object} context - Suitelet context object
     */
    function displayVendorBillForm(context, accountId) {
        const form = serverWidget.createForm({ title: 'LSTCapture Incoming Purchase Transactions To Be Processed' });
        const searchResults = getVendorBillRecords();
        const duplicateBillNumbers = getDuplicateBillNumbers(searchResults);
        const templateContent = getTemplateContent();

        if (!templateContent) {
            log.error({ title: `${strDebugTitle} - Template Error`, details: 'Failed to load HTML template' });
            context.response.writePage(form);
            return;
        }

        const data = {
            searchResults: formatSearchResults(searchResults, duplicateBillNumbers, accountId)
        };

        const renderer = render.create();
        renderer.templateContent = templateContent;
        renderer.addCustomDataSource({ format: render.DataSource.OBJECT, alias: 'data', data });

        const htmlField = form.addField({
            id: constants.CUSTOM_FIELDS.HTML_TABLE,
            type: serverWidget.FieldType.INLINEHTML,
            label: 'HTML Table'
        });
        htmlField.defaultValue = renderer.renderAsString();

        context.response.writePage(form);
    }

    /**
     * Handles POST requests for rejecting records.
     * @param {Object} context - Suitelet context object
     */
    function handleRejectAction(context) {
        const requestParams = context.request.parameters;
        log.debug({ title: `${strDebugTitle} - POST`, details: `Parameters: ${Object.keys(requestParams).join(', ')}` });

        if (requestParams.reject_id) {
            try {
                const recordId = parseInt(requestParams.reject_id, 10);
                if (isNaN(recordId)) {
                    throw new Error(`Invalid record ID: ${requestParams.reject_id}`);
                }

                record.submitFields({
                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                    id: recordId,
                    values: {
                        isinactive: true,
                        [constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS]: constants.PROCESS_STATUSES.REJECTED
                    }
                });
                log.debug({ title: `${strDebugTitle} - Reject`, details: `Rejected record ID: ${recordId}` });

                redirect.toSuitelet({
                    scriptId: constants.VENDOR_BILL_PROCESS_SUITELET.SCRIPT_ID,
                    deploymentId: constants.VENDOR_BILL_PROCESS_SUITELET.DEPLOYMENT_ID
                });
            } catch (err) {
                log.error({ title: `${strDebugTitle} - Reject Error`, details: `${err.name}: ${err.message}` });
            }
        }
    }

    /**
     * Retrieves active vendor bill records.
     * @returns {Array} Array of search result objects
     */
    function getVendorBillRecords() {
        try {
            log.debug({ title: `${strDebugTitle} - getVendorBillRecords`, details: 'Fetching vendor bill records' });
            const vendorBillSearch = search.create({
                type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                filters: [['isinactive', 'is', 'F']],
                columns: [
                    { name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID },
                    { name: 'created' },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.TRANSACTION_TYPE },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.BILL_DATE },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.JSON_FILEID },
                    { name: constants.VENDOR_BILL_STAGING_FIELDS.JSON_ITEM_DATA }
                ]
            });
            return getAllSavedSearch(vendorBillSearch);
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getVendorBillRecords Error`, details: err.message });
            return [];
        }
    }

    /**
     * Identifies duplicate bill numbers in search results.
     * @param {Array} searchResults - Array of search result objects
     * @returns {Object} Map of duplicate bill numbers
     */
    function getDuplicateBillNumbers(searchResults) {
        try {
            log.debug({ title: `${strDebugTitle} - getDuplicateBillNumbers`, details: 'Checking for duplicate bill numbers' });
            const billNumbersTracker = {};
            const duplicateBillNumbers = {};

            searchResults.forEach(result => {
                const billNumber = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER });
                if (billNumber) {
                    billNumbersTracker[billNumber] = (billNumbersTracker[billNumber] || 0) + 1;
                    if (billNumbersTracker[billNumber] > 1) {
                        duplicateBillNumbers[billNumber] = true;
                    }
                }
            });

            return duplicateBillNumbers;
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getDuplicateBillNumbers Error`, details: err.message });
            return {};
        }
    }

    /**
     * Loads the HTML template content from the main configuration record.
     * @returns {String} Template content or empty string if not found
     */
    function getTemplateContent() {
        try {
            log.debug({ title: `${strDebugTitle} - getTemplateContent`, details: 'Loading template content' });
            const mainConfigRecord = getMainConfigRecord();
            if (!mainConfigRecord) {
                log.error({ title: `${strDebugTitle} - getTemplateContent`, details: 'No main config record found' });
                return '';
            }

            const templateFileId = mainConfigRecord.getValue({ name: constants.MAIN_CONFIG_FIELDS.HTML_TEMPLATE });
            if (!templateFileId) {
                log.error({ title: `${strDebugTitle} - getTemplateContent`, details: 'No template file ID in config' });
                return '';
            }

            const templateFile = file.load({ id: templateFileId });
            return templateFile.getContents();
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getTemplateContent Error`, details: err.message });
            return '';
        }
    }

    /**
     * Retrieves the main configuration record.
     * @returns {Object|null} Main config record or null if not found
     */
    function getMainConfigRecord() {
        try {
            log.debug({ title: `${strDebugTitle} - getMainConfigRecord`, details: 'Fetching main config record' });
            const mainConfigSearch = search.create({
                type: constants.RECORD_TYPES.MAIN_CONFIG,
                filters: [],
                columns: [
                    { name: constants.MAIN_CONFIG_FIELDS.HTML_TEMPLATE },
                    { name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID, sort: search.Sort.DESC }
                ]
            });

            const results = mainConfigSearch.run().getRange({ start: 0, end: 1 });
            return results.length > 0 ? results[0] : null;
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getMainConfigRecord Error`, details: err.message });
            return null;
        }
    }

    /**
     * Formats search results for HTML rendering.
     * @param {Array} searchResults - Array of search result objects
     * @param {Object} duplicateBillNumbers - Map of duplicate bill numbers
     * @returns {Array} Formatted data for rendering
     */
    function formatSearchResults(searchResults, duplicateBillNumbers, accountId) {
        return searchResults.map(result => {
            try {
                const internalId = result.getValue({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID });
                if (!internalId || isNaN(Number(internalId))) {
                    log.error({ title: `${strDebugTitle} - formatSearchResults`, details: `Invalid Internal ID: ${internalId}` });
                    return null;
                }

                const billNumber = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER }) || '';
                const subsidiaryId = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY }) || '';
                const subsidiaryText = result.getText({ name: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY }) || '';
                const vendorId = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR }) || '';
                const vendorText = result.getText({ name: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR }) || '';
                const totalAmount = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX }) || '';
                const currentProcessStatusId = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS }) || '';
                const processStatusText = result.getText({ name: constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS }) || '';
                const fileId = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE }) || '';
                const billDate = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.BILL_DATE }) || '';
                const jsonFileId = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.JSON_FILEID }) || '';
                const transactionTypeText = result.getText({ name: constants.VENDOR_BILL_STAGING_FIELDS.TRANSACTION_TYPE }) || '';
                const jsonLineItems = result.getValue({ name: constants.VENDOR_BILL_STAGING_FIELDS.JSON_ITEM_DATA }) || '';

                // Dynamically determine process status
                const newProcessStatusId = isValidRecord(subsidiaryId, vendorId, totalAmount) ? constants.PROCESS_STATUSES.PROCEED : currentProcessStatusId;
                const displayProcessStatus = newProcessStatusId === constants.PROCESS_STATUSES.PROCEED ? 'Proceed' : processStatusText;

                // System alert for duplicates or missing fields
                const systemAlert = duplicateBillNumbers[billNumber] 
                    ? '<span>Duplicate Transaction</span>' 
                    : (!subsidiaryId || !vendorId || !totalAmount ? '<span>Please enter details to proceed</span>' : '');

                // Generate URLs and buttons
                const editUrl = generateEditUrl(internalId, accountId);
                const proceedUrl = generateProceedUrl(vendorId, subsidiaryId, internalId, fileId, jsonFileId, accountId);
                const rejectUrl = generateRejectUrl(internalId, accountId);
                const actionButton = newProcessStatusId === constants.PROCESS_STATUSES.PROCEED 
                    ? `<button type="button" class="action-button btn-proceed" style="background-color: #28a745; color: white; border: none; padding: 5px 10px; cursor: pointer;" onclick="redirectToSuitelet('${proceedUrl}')">Proceed</button>`
                    : `<button type="button" class="action-button btn-edit" style="background-color: yellow; color: black; border: none; padding: 5px 10px; cursor: pointer;" onclick="redirectToSuitelet('${editUrl}')">Edit</button>`;
                const rejectButton = `<button type="button" class="btn btn-danger reject-btn" data-id="${internalId}">REJECT</button>`;

                return {
                    internalId: internalId 
                        ? `<a href="${editUrl}" target="_blank">${internalId}</a>` 
                        : 'N/A',
                    editUrl,
                    proceedUrl,
                    createdDate: result.getValue({ name: 'created' }) || '',
                    transactionType: transactionTypeText,
                    processStatus: displayProcessStatus,
                    vendor: vendorText,
                    billNumbers: billNumber,
                    status: displayProcessStatus,
                    billDate,
                    pdfFileId: fileId,
                    totalAmount,
                    subsidiary: subsidiaryText,
                    systemAlert,
                    actionButton,
                    rejectButton,
                    rejectUrl
                };
            } catch (err) {
                log.error({ title: `${strDebugTitle} - formatSearchResults Error`, details: `Record ID: ${result.getValue({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID })} - ${err.message}` });
                return null;
            }
        }).filter(item => item !== null);
    }

    /**
     * Validates if a record has required fields for "Proceed" status.
     * @param {String} subsidiaryId - Subsidiary ID
     * @param {String} vendorId - Vendor ID
     * @param {String} totalAmount - Total amount
     * @returns {Boolean} True if all fields are valid
     */
    function isValidRecord(subsidiaryId, vendorId, totalAmount) {
        const isValid = subsidiaryId && vendorId && totalAmount && subsidiaryId !== '' && vendorId !== '' && totalAmount !== '';
        log.debug({ title: `${strDebugTitle} - isValidRecord`, details: `Valid: ${isValid} | Subsidiary: ${subsidiaryId}, Vendor: ${vendorId}, Total: ${totalAmount}` });
        return isValid;
    }

    /**
     * Generates the edit URL for a record.
     * @param {String} internalId - Record internal ID
     * @returns {String} Edit URL
     */
    function generateEditUrl(internalId, accountId) {
        return `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=${constants.STAGING_RECORD_SPLIT_SUITLET.SCRIPT_ID}&deploy=${constants.STAGING_RECORD_SPLIT_SUITLET.DEPLOYMENT_ID}&internalId=${internalId}`;
    }

    /**
     * Generates the proceed URL for a record.
     * @param {String} vendorId - Vendor ID
     * @param {String} subsidiaryId - Subsidiary ID
     * @param {String} internalId - Record internal ID
     * @param {String} fileId - PDF file ID
     * @param {String} jsonFileId - JSON file ID
     * @returns {String} Proceed URL
     */
    function generateProceedUrl(vendorId, subsidiaryId, internalId, fileId, jsonFileId, accountId) {
        return `/app/accounting/transactions/vendbill.nl?whence=&vendor=${vendorId}&subsidiary=${subsidiaryId}&vendorToBill=${internalId}&fileId=${fileId}&jsonFileId=${jsonFileId}`;
    }

    /**
     * Generates the reject URL for a record.
     * @param {String} internalId - Record internal ID
     * @returns {String} Reject URL
     */
    function generateRejectUrl(internalId, accountId) {
        return `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=${constants.VENDOR_BILL_PROCESS_SUITELET.SCRIPT_ID}&deploy=${constants.VENDOR_BILL_PROCESS_SUITELET.DEPLOYMENT_ID}&reject_id=${internalId}`;
    }

    /**
     * Retrieves all search results with pagination.
     * @param {Object} savedSearch - Search object
     * @returns {Array} Array of search result objects
     */
    function getAllSavedSearch(savedSearch) {
        try {
            log.debug({ title: `${strDebugTitle} - getAllSavedSearch`, details: 'Fetching search results' });
            const results = [];
            let index = 0;
            let resultSlice = savedSearch.run().getRange({ start: index, end: index + 1000 });

            while (resultSlice.length > 0) {
                results.push(...resultSlice);
                index += 1000;
                resultSlice = savedSearch.run().getRange({ start: index, end: index + 1000 });
            }

            log.debug({ title: `${strDebugTitle} - getAllSavedSearch`, details: `Retrieved ${results.length} results` });
            return results;
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getAllSavedSearch Error`, details: err.message });
            return [];
        }
    }

    return { onRequest };
});