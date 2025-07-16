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
 */
define(['N/file', 'N/search', 'N/record', 'N/runtime', 'N/ui/serverWidget', './lstcptr_constants'],
    /**
     * @param {Object} file - NetSuite file module
     * @param {Object} search - NetSuite search module
     * @param {Object} record - NetSuite record module
     * @param {Object} runtime - NetSuite runtime module
     * @param {Object} serverWidget - NetSuite serverWidget module
     * @param {Object} constants - LSTCPTR constants
     */
    (file, search, record, runtime, serverWidget, constants) => {
        const DEBUG_TITLE = constants.BILL_SPLIT_SCREEN_DEBUG_TITLE;

        /**
         * Checks if a value is valid (not null, undefined, empty, etc.).
         * @param {*} value - Value to check
         * @returns {boolean} True if the value is valid
         */
        const isValidValue = (value) => {
            return value != null && value !== 'null' && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN' && value !== ' ';
        };

        /**
         * Retrieves vendor name by ID.
         * @param {string|number} vendorId - Vendor internal ID
         * @returns {string|null} Vendor name or null if not found
         */
        const getVendorNameById = (vendorId) => {
            if (!isValidValue(vendorId)) {
                log.debug(`${DEBUG_TITLE} (getVendorNameById)`, 'No vendor ID provided');
                return null;
            }
            try {
                const vendorFields = search.lookupFields({
                    type: search.Type.VENDOR,
                    id: vendorId,
                    columns: [constants.STANDARD_FIELDS.VENDOR.ENTITY_ID]
                });
                return vendorFields.entityid || null;
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getVendorNameById) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return null;
            }
        };

        /**
         * Retrieves vendor configuration record.
         * @param {string|number} vendorId - Vendor internal ID
         * @returns {Array} Array of search results
         */
        const getVendorConfigRecord = (vendorId) => {
            try {
                log.debug(`${DEBUG_TITLE} (getVendorConfigRecord)`, `Searching vendor config for vendor ID: ${vendorId}`);
                const vendorConfigSearch = search.create({
                    type: constants.RECORD_TYPES.VENDOR_CONFIG,
                    filters: [
                        ['isinactive', 'is', 'F'],
                        'AND',
                        [constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR, 'anyof', vendorId]
                    ],
                    columns: [
                        constants.VENDOR_CONFIG_FIELDS.DEPARTMENT,
                        constants.VENDOR_CONFIG_FIELDS.CLASS,
                        constants.VENDOR_CONFIG_FIELDS.LOCATION,
                        constants.VENDOR_CONFIG_FIELDS.AP_ACCOUNT,
                        constants.VENDOR_CONFIG_FIELDS.CURRENCY,
                        constants.VENDOR_CONFIG_FIELDS.ITEM,
                        constants.VENDOR_CONFIG_FIELDS.TAX_CODE,
                        constants.VENDOR_CONFIG_FIELDS.CATEGORY,
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
                    ]
                });
                const results = vendorConfigSearch.run().getRange({ start: 0, end: 1 });
                log.debug(`${DEBUG_TITLE} (getVendorConfigRecord)`, `Vendor Config Search Result: ${JSON.stringify(results)}`);
                return results;
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getVendorConfigRecord) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return [];
            }
        };

        /**
         * Retrieves main configuration fields.
         * @returns {Object} Configuration fields
         */
        const getMainConfigRecordFields = () => {
            try {
                const mainConfigSearch = search.create({
                    type: constants.RECORD_TYPES.MAIN_CONFIG,
                    filters: [['isinactive', 'is', 'F']],
                    columns: [
                        constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_CREATION,
                        constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_EDIT,
                        constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_VIEW,
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
                    ]
                });
                const results = mainConfigSearch.run().getRange({ start: 0, end: 1 });
                if (results.length > 0) {
                    return {
                        custrecord_lstcptr_bill_split_creation: results[0].getValue(constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_CREATION),
                        custrecord_lstcptr_bill_split_edit: results[0].getValue(constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_EDIT),
                        custrecord_lstcptr_bill_split_view: results[0].getValue(constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_VIEW)
                    };
                }
                return {};
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getMainConfigRecordFields) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return {};
            }
        };

        /**
         * Retrieves subsidiary configuration records.
         * @returns {Array} Array of search results
         */
        const getSubsidiaryConfigRecords = () => {
            try {
                const subsidiaryConfigSearch = search.create({
                    type: constants.RECORD_TYPES.SUBSIDIARY_CONFIG,
                    filters: [['isinactive', 'is', 'F']],
                    columns: [
                        constants.SUBSIDIARY_CONFIG_FIELDS.DEPARTMENT,
                        constants.SUBSIDIARY_CONFIG_FIELDS.CLASS,
                        constants.SUBSIDIARY_CONFIG_FIELDS.LOCATION,
                        constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY,
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC })
                    ]
                });
                return getAllSavedSearch(subsidiaryConfigSearch);
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getSubsidiaryConfigRecords) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return [];
            }
        };

        /**
         * Creates a map of subsidiary configurations.
         * @param {Array} subsidiaryConfigRecords - Array of subsidiary config records
         * @returns {Object} Subsidiary to configuration map
         */
        const createSubsidiaryToFormMap = (subsidiaryConfigRecords) => {
            const map = {};
            try {
                subsidiaryConfigRecords.forEach(record => {
                    const subsidiaryId = record.getValue(constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY);
                    map[subsidiaryId] = {
                        department: record.getValue(constants.SUBSIDIARY_CONFIG_FIELDS.DEPARTMENT),
                        className: record.getValue(constants.SUBSIDIARY_CONFIG_FIELDS.CLASS),
                        location: record.getValue(constants.SUBSIDIARY_CONFIG_FIELDS.LOCATION)
                    };
                });
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (createSubsidiaryToFormMap) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
            return map;
        };

        /**
         * Retrieves all results from a saved search.
         * @param {Object} savedSearch - NetSuite search object
         * @returns {Array} Array of search results
         */
        const getAllSavedSearch = (savedSearch) => {
            try {
                const resultSet = savedSearch.run();
                const results = [];
                let index = 0;
                do {
                    const slice = resultSet.getRange(index, index + 1000);
                    results.push(...slice);
                    index += 1000;
                } while (slice.length >= 1000);
                return results;
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getAllSavedSearch) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return [];
            }
        };

        /**
         * Retrieves vendor bill staging record.
         * @param {string|number} vendorToBill - Vendor bill staging ID
         * @returns {Array} Array of search results
         */
        const getVendorBillStagingRecord = (vendorToBill) => {
            try {
                const vendorBillStagingSearch = search.create({
                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                    filters: [['internalid', 'anyof', vendorToBill]],
                    columns: [
                        constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER,
                        constants.VENDOR_BILL_STAGING_FIELDS.BILL_DATE,
                        constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX,
                        constants.VENDOR_BILL_STAGING_FIELDS.VENDOR,
                        constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS,
                        constants.VENDOR_BILL_STAGING_FIELDS.JSON_ITEM_DATA
                    ]
                });
                const results = getAllSavedSearch(vendorBillStagingSearch);
                log.debug(`${DEBUG_TITLE} (getVendorBillStagingRecord)`, `Vendor Bill Staging Result: ${JSON.stringify(results)}`);
                return results;
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getVendorBillStagingRecord) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return [];
            }
        };

        /**
         * Formats JSON data from file.
         * @param {Array} jsonData - Raw JSON data
         * @returns {Array} Formatted JSON data
         */
        const formatJsonData = (jsonData) => {
            const formattedData = [];
            try {
                jsonData.forEach(item => {
                    if (item.type === 'field' || item.type === 'derived') {
                        formattedData.push({
                            label: item.label,
                            ocr_text: item.ocr_text
                        });
                    }
                    if (item.type === 'table' && item.cells && Array.isArray(item.cells)) {
                        item.cells.forEach(cell => {
                            formattedData.push({
                                label: cell.label,
                                ocr_text: cell.text
                            });
                        });
                    }
                });
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (formatJsonData) Error`,
                    details: `Error formatting JSON data: ${err.message}`
                });
            }
            return formattedData;
        };

        /**
         * Retrieves expense account ID from category.
         * @param {string|number} categoryId - Expense category ID
         * @returns {number|null} Account ID or null
         */
        const getExpenseAccountIds = (categoryId) => {
            try {
                log.debug(`${DEBUG_TITLE} (getExpenseAccountIds)`, `Fetching account for category ID: ${categoryId}`);
                const categoryLookup = search.lookupFields({
                    type: 'expensecategory',
                    id: categoryId,
                    columns: [constants.STANDARD_FIELDS.EXPENSE_CATEGORY.ACCOUNT]
                });
                const accountId = categoryLookup.account?.length > 0 ? categoryLookup.account[0].value : null;
                log.debug(`${DEBUG_TITLE} (getExpenseAccountIds)`, `Retrieved Account ID: ${accountId}`);
                return accountId;
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getExpenseAccountIds) Error`,
                    details: `Error retrieving expense account for category ID ${categoryId}: ${err.message}`
                });
                return null;
            }
        };

        /**
         * Retrieves line item IDs based on description.
         * @param {string} desc - Item description
         * @returns {string|null} Item ID or null
         */
        const getLineItemIds = (desc) => {
            try {
                if (!isValidValue(desc)) return null;
                const cleanedDesc = desc.replace(/\s+/g, ' ').trim().toLowerCase();
                const words = cleanedDesc.replace(/[\-]/g, '').split(' ');
                if (words.length === 0) return null;

                for (let i = 1; i <= words.length; i++) {
                    const phrase = words.slice(0, i).join('');
                    log.debug(`${DEBUG_TITLE} (getLineItemIds)`, `Trying match with: ${phrase}`);
                    const itemSearch = search.create({
                        type: 'item',
                        filters: [
                            [`formulatext:REPLACE(LOWER(REPLACE({itemid}, '-', '')), ' ', '')`, 'contains', phrase],
                            'AND',
                            ['isinactive', 'is', 'F']
                        ],
                        columns: ['internalid', 'itemid']
                    });
                    const results = itemSearch.run().getRange({ start: 0, end: 5 });
                    if (results?.length > 0) {
                        const internalId = results[0].getValue('internalid');
                        const itemId = results[0].getValue('itemid');
                        log.debug(`${DEBUG_TITLE} (getLineItemIds)`, `Matched: ${itemId} | ID: ${internalId}`);
                        return internalId;
                    }
                    if (results?.length <= 5) break;
                }
                log.debug(`${DEBUG_TITLE} (getLineItemIds)`, `No match found for: ${desc}`);
                return null;
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getLineItemIds) Error`,
                    details: err.message
                });
                return null;
            }
        };

        /**
         * Retrieves expense category IDs based on description.
         * @param {string} desc - Category description
         * @returns {Array} Array of category IDs
         */
        const getExpenseCategoryIds = (desc) => {
            const categoryIds = [];
            try {
                if (!isValidValue(desc)) return categoryIds;
                const normalizedDesc = desc.replace(/\s+/g, ' ').trim();
                const words = normalizedDesc.split(' ');
                if (words.length === 0) return categoryIds;

                for (let i = 1; i <= words.length; i++) {
                    const currentFilter = [['name', 'contains', words.slice(0, i).join(' ')], 'AND', ['isinactive', 'is', 'F']];
                    const expenseSearch = search.create({
                        type: 'expensecategory',
                        filters: currentFilter,
                        columns: ['internalid', 'name']
                    });
                    const results = expenseSearch.run().getRange({ start: 0, end: 100 });
                    if (results?.length > 0) {
                        results.forEach(result => {
                            const internalId = result.getValue('internalid');
                            const name = result.getValue('name');
                            categoryIds.push(internalId);
                            log.debug(`${DEBUG_TITLE} (getExpenseCategoryIds)`, `Matched: ${name} | ID: ${internalId}`);
                        });
                    }
                    if (results?.length <= 5) break;
                }
                if (categoryIds.length === 0) {
                    log.debug(`${DEBUG_TITLE} (getExpenseCategoryIds)`, `No match found for: ${desc}`);
                }
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (getExpenseCategoryIds) Error`,
                    details: err.message
                });
            }
            return categoryIds;
        };

        /**
         * Generates the HTML content for the file viewer.
         * @param {string} fileUrl - URL of the file to display
         * @param {string} fileType - File MIME type
         * @param {string} fileExtension - File extension
         * @param {Array} supportedTypes - Supported file types
         * @param {string} accountId - NetSuite account ID
         * @returns {string} HTML content
         */
        const generateFileViewerHTML = (fileUrl, fileType, fileExtension, supportedTypes, accountId) => {
            return `
                <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>File Viewer</title>
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
                    <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@2.15.349/build/pdf.min.js" onerror="console.error('Failed to load pdf.js');"></script>
                    <script src="https://${accountId}.app.netsuite.com/core/media/media.nl?id=17852&c=${accountId}&h=_d4TpHE1o_ZrrC2zZiu2c-IdBxb8QPcW5OFTtCU7zRMmCOWW&_xt=.js" onerror="console.error('Failed to load NetSuite script');"></script>
                </head>
                <body>
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
                                            <span id="page_num"></span> / <span id="page_count"></span>
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
                            document.addEventListener('DOMContentLoaded', () => {
                                const showFileByDefault = document.getElementById('custpage_lstcptr_show_file')?.value === 'true';
                                const inlineContent = document.getElementById('inlineContent');
                                const bodyElement = document.getElementById('div__body');

                                if (!inlineContent || !bodyElement) {
                                    console.error('Layout elements missing');
                                    return;
                                }

                                inlineContent.style.display = 'block';
                                bodyElement.style.left = '45%';
                                bodyElement.style.width = '55%';
                            });

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
                                if (width < 600) zoom = 0.7;
                                else if (width < 1200) zoom = 1;
                                else zoom = 1.5;
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
                                            document.getElementById('first-page').style.opacity = initialState.currentPage === 1 ? '0.5' : '1';
                                            document.getElementById('prev_page').style.opacity = initialState.currentPage === 1 ? '0.5' : '1';
                                            document.getElementById('next_page').style.opacity = initialState.currentPage === initialState.pdfDoc.numPages ? '0.5' : '1';
                                            document.getElementById('last-page').style.opacity = initialState.currentPage === initialState.pdfDoc.numPages ? '0.5' : '1';
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
                                document.querySelectorAll('.highlight-box').forEach(highlight => highlight.remove());
                            }

                            function initializeViewer() {
                                console.log('Initializing viewer for file:', fileUrl);
                                console.log('File type:', fileType, 'Extension:', fileExtension);

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
                                            if (!response.ok) throw new Error('Network response was not ok');
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
                                printIframe.onload = () => printIframe.contentWindow.print();
                                printIframe.onerror = () => showErrorMessage('Failed to load file for printing.');
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
                        })();
                    </script>
                </body>
                </html>
            `;
        };

        /**
         * Adds hidden fields to the form for file viewer.
         * @param {Object} form - NetSuite form object
         * @param {string} fileUrl - File URL
         * @param {Object} fileObj - File object
         * @param {boolean} showFile - Whether to show the file
         * @returns {Object} Object containing hidden field IDs
         */
        const addHiddenFields = (form, fileUrl, fileObj, showFile) => {
            const fileUrlField = form.addField({
                id: constants.CUSTOM_FIELDS.FILE_URL,
                type: serverWidget.FieldType.TEXT,
                label: 'File URL'
            });
            fileUrlField.defaultValue = fileUrl;
            fileUrlField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const showFileField = form.addField({
                id: constants.CUSTOM_FIELDS.SHOW_FILE,
                type: serverWidget.FieldType.TEXT,
                label: 'Show File'
            });
            showFileField.defaultValue = showFile.toString();
            showFileField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const fileTypeField = form.addField({
                id: constants.CUSTOM_FIELDS.FILE_TYPE,
                type: serverWidget.FieldType.TEXT,
                label: 'File Type'
            });
            const fileType = fileObj ? fileObj.fileType : 'application/pdf';
            const fileExtension = fileUrl ? fileUrl.split('.').pop().toLowerCase() : 'pdf';
            log.debug(`${DEBUG_TITLE} (addHiddenFields)`, `File Type: ${fileType}`);
            fileTypeField.defaultValue = fileType;
            fileTypeField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const fileExtensionField = form.addField({
                id: constants.CUSTOM_FIELDS.FILE_EXTENSION,
                type: serverWidget.FieldType.TEXT,
                label: 'File Extension'
            });
            fileExtensionField.defaultValue = fileExtension;
            fileExtensionField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            const supportedTypesField = form.addField({
                id: constants.CUSTOM_FIELDS.SUPPORTED_TYPES,
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Supported Types'
            });
            supportedTypesField.defaultValue = JSON.stringify(constants.FILE_VIEWER.SUPPORTED_TYPES);
            supportedTypesField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

            return { fileType, fileExtension };
        };

        /**
         * Processes line items for the vendor bill.
         * @param {Object} objRecord - NetSuite record object
         * @param {Array} lineItems - Parsed line items
         * @param {Object} config - Configuration object with department, class, location
         */
        const processLineItems = (objRecord, lineItems, config) => {
            let expenseLineIndex = objRecord.getLineCount({ sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE }) || 0;
            let itemLineIndex = objRecord.getLineCount({ sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM }) || 0;

            lineItems.forEach((currentItem, i) => {
                const description = currentItem.Description || '';
                const quantity = parseFloat(currentItem.Quantity) || 1;
                const unitPrice = parseFloat(currentItem.Unit_price) || 1;
                const lineAmount = parseFloat(currentItem.Line_amount) || unitPrice * quantity || 0;
                log.debug(`${DEBUG_TITLE} (processLineItems)`, `Line ${i}: Description=${description}, Amount=${lineAmount}, Quantity=${quantity}`);

                const categoryIds = getExpenseCategoryIds(description);
                const lineItemId = getLineItemIds(description);

                try {
                    if (categoryIds?.length > 0) {
                        const cId = categoryIds[0];
                        const accId = getExpenseAccountIds(cId);

                        if (accId) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                                fieldId: constants.STANDARD_FIELDS.EXPENSE_FIELDS.ACCOUNT,
                                line: expenseLineIndex,
                                value: accId
                            });
                        }

                        if (cId) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                                fieldId: constants.STANDARD_FIELDS.EXPENSE_FIELDS.CATEGORY,
                                line: expenseLineIndex,
                                value: cId
                            });
                        }

                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                            fieldId: constants.STANDARD_FIELDS.EXPENSE_FIELDS.AMOUNT,
                            line: expenseLineIndex,
                            value: lineAmount
                        });

                        if (config.department) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                                fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.DEPARTMENT,
                                line: expenseLineIndex,
                                value: config.department
                            });
                        }
                        if (config.className) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                                fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.CLASS,
                                line: expenseLineIndex,
                                value: config.className
                            });
                        }
                        if (config.location) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                                fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.LOCATION,
                                line: expenseLineIndex,
                                value: config.location
                            });
                        }

                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.EXPENSE,
                            fieldId: constants.STANDARD_FIELDS.EXPENSE_FIELDS.MEMO,
                            line: expenseLineIndex,
                            value: `Expense Item Added: ${description}`
                        });

                        expenseLineIndex++;
                    } else if (lineItemId) {
                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                            fieldId: constants.STANDARD_FIELDS.ITEM_FIELDS.ITEM,
                            line: itemLineIndex,
                            value: lineItemId
                        });
                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                            fieldId: constants.STANDARD_FIELDS.ITEM_FIELDS.QUANTITY,
                            line: itemLineIndex,
                            value: quantity
                        });
                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                            fieldId: constants.STANDARD_FIELDS.ITEM_FIELDS.PRICE,
                            line: itemLineIndex,
                            value: -1
                        });
                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                            fieldId: constants.STANDARD_FIELDS.ITEM_FIELDS.RATE,
                            line: itemLineIndex,
                            value: unitPrice
                        });
                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                            fieldId: constants.STANDARD_FIELDS.ITEM_FIELDS.AMOUNT,
                            line: itemLineIndex,
                            value: lineAmount
                        });

                        if (config.department) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                                fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.DEPARTMENT,
                                line: itemLineIndex,
                                value: config.department
                            });
                        }
                        if (config.className) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                                fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.CLASS,
                                line: itemLineIndex,
                                value: config.className
                            });
                        }
                        if (config.location) {
                            objRecord.setSublistValue({
                                sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                                fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.LOCATION,
                                line: itemLineIndex,
                                value: config.location
                            });
                        }

                        objRecord.setSublistValue({
                            sublistId: constants.STANDARD_FIELDS.SUBLISTS.ITEM,
                            fieldId: constants.STANDARD_FIELDS.ITEM_FIELDS.DESCRIPTION,
                            line: itemLineIndex,
                            value: description
                        });

                        itemLineIndex++;
                    }
                } catch (err) {
                    log.error({
                        title: `${DEBUG_TITLE} (processLineItems) Error`,
                        details: `Error while processing line item ${i}: ${err.message}`
                    });
                }
            });
        };

        /**
         * Sets vendor bill field values based on configuration.
         * @param {Object} objRecord - NetSuite record object
         * @param {Object} config - Configuration object
         */
        const setVendorBillFields = (objRecord, config) => {
            try {
                if (config.department) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.DEPARTMENT, value: config.department });
                }
                if (config.className) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.CLASS, value: config.className });
                }
                if (config.location) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.LOCATION, value: config.location });
                }
                if (config.apAccount) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.ACCOUNT, value: config.apAccount });
                }
                if (config.currency) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.CURRENCY, value: config.currency });
                }
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (setVendorBillFields) Error`,
                    details: `Error setting vendor bill fields: ${err.message}`
                });
            }
        };

        /**
         * Handles the beforeLoad event.
         * @param {Object} context - Script context
         */
        const beforeLoad = (context) => {
            const { type: strType, newRecord: objRecord, form, request } = context;
            const userObj = runtime.getCurrentUser();
            const accountId = runtime.accountId;
            const isValidContext = [runtime.ContextType.USER_INTERFACE, runtime.ContextType.WEBAPPLICATION, runtime.ContextType.SUITELET].includes(runtime.executionContext);

            log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Type: ${strType}, Rec Type: ${objRecord.type}, User ID: ${userObj.id}, User Role ID: ${userObj.role}`);

            try {
                const mainConfig = getMainConfigRecordFields();
                const { custrecord_lstcptr_bill_split_creation: showPdfOnCreate, custrecord_lstcptr_bill_split_edit: showPdfOnEdit } = mainConfig;

                let vendorToBill = request.parameters.vendorToBill;
                const jsonFileId = request.parameters.jsonFileId;
                const encodedLineItems = request.parameters.jsonLineItems;
                const lstvendorId = request.parameters.vendor;
                const subsidiaryId = request.parameters.subsidiary;
                log.debug(`${DEBUG_TITLE} (beforeLoad)`, `VendorToBill: ${vendorToBill}, JSON File ID: ${jsonFileId}, Encoded Line Items: ${encodedLineItems}, Vendor ID: ${lstvendorId}, Subsidiary ID: ${subsidiaryId}`);

                const vendorName = getVendorNameById(lstvendorId);
                log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Vendor Name: ${vendorName}`);

                if (lstvendorId) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.ENTITY, value: lstvendorId });
                }
                if (subsidiaryId) {
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.SUBSIDIARY, value: subsidiaryId });
                }

                let config = {
                    department: '',
                    className: '',
                    location: '',
                    apAccount: '',
                    currency: '',
                    item: '',
                    taxCode: '',
                    category: ''
                };

                if (isValidValue(lstvendorId)) {
                    const vendorConfigResults = getVendorConfigRecord(lstvendorId);
                    if (vendorConfigResults?.length > 0) {
                        const vendorConfig = vendorConfigResults[0];
                        config.department = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.DEPARTMENT);
                        config.className = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.CLASS);
                        config.location = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.LOCATION);
                        config.apAccount = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.AP_ACCOUNT);
                        config.currency = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.CURRENCY);
                        config.item = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.ITEM);
                        config.taxCode = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.TAX_CODE);
                        config.category = vendorConfig.getValue(constants.VENDOR_CONFIG_FIELDS.CATEGORY);
                        log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Vendor Config: ${JSON.stringify(config)}`);
                    }
                }

                const subsidiary = objRecord.getValue(constants.STANDARD_FIELDS.VENDOR_BILL.SUBSIDIARY);
                const subsidiaryConfigRecords = getSubsidiaryConfigRecords();
                const subsidiaryToFormMap = createSubsidiaryToFormMap(subsidiaryConfigRecords);
                const subsidiaryConfig = subsidiaryToFormMap[subsidiary];

                if (subsidiaryConfig) {
                    config.department = config.department || subsidiaryConfig.department;
                    config.className = config.className || subsidiaryConfig.className;
                    config.location = config.location || subsidiaryConfig.location;
                    log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Subsidiary Config: Department=${subsidiaryConfig.department}, Class=${subsidiaryConfig.className}, Location=${subsidiaryConfig.location}`);
                }

                if (isValidValue(jsonFileId)) {
                    const jsonFile = file.load({ id: jsonFileId });
                    const jsonData = JSON.parse(jsonFile.getContents());
                    const formattedJsonData = formatJsonData(jsonData);
                    log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Formatted JSON Data: ${JSON.stringify(formattedJsonData)}`);

                    const jsonDataField = form.addField({
                        id: constants.CUSTOM_FIELDS.JSON_DATA,
                        type: serverWidget.FieldType.LONGTEXT,
                        label: 'Formatted JSON Data'
                    });
                    jsonDataField.defaultValue = JSON.stringify(formattedJsonData);
                    jsonDataField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                    const vendorToBillField = form.addField({
                        id: constants.CUSTOM_FIELDS.HIDDEN_VENDOR_TO_BILL,
                        type: serverWidget.FieldType.TEXT,
                        label: 'Hidden Vendor Bill ID'
                    });
                    vendorToBillField.defaultValue = vendorToBill;
                    vendorToBillField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

                    formattedJsonData.forEach(item => {
                        switch (item.label.toLowerCase()) {
                            case 'vendor':
                                objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.ENTITY, value: item.ocr_text });
                                break;
                            case 'billnumber':
                                objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.TRANID, value: item.ocr_text });
                                break;
                            case 'po_date':
                                objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.TRANDATE, value: new Date(item.ocr_text) });
                                break;
                            case 'subsidiary':
                                objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.SUBSIDIARY, value: item.ocr_text });
                                break;
                            case 'total_amount':
                                objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.USERTOTAL, value: parseFloat(item.ocr_text.replace(/,/g, '')) });
                                break;
                        }
                    });
                }

                if ((strType === context.UserEventType.CREATE || (strType === context.UserEventType.COPY && showPdfOnCreate)) && isValidContext) {
                    setVendorBillFields(objRecord, config);
                    objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.PROCESS, value: vendorToBill });

                    let fileUrl = '';
                    let fileObj;
                    if (isValidValue(vendorToBill)) {
                        const lstCaptureRecord = record.load({
                            type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                            id: vendorToBill
                        });
                        const fileId = lstCaptureRecord.getValue(constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE);
                        log.debug(`${DEBUG_TITLE} (beforeLoad)`, `File ID: ${fileId}`);
                        if (isValidValue(fileId)) {
                            try {
                                fileObj = file.load({ id: fileId });
                                fileUrl = `https://${accountId}.app.netsuite.com${fileObj.url}`;
                                log.debug(`${DEBUG_TITLE} (beforeLoad)`, `File URL: ${fileUrl}`);
                            } catch (err) {
                                log.error(`${DEBUG_TITLE} (beforeLoad)`, `Error loading file: ${err.message}`);
                            }
                        } else {
                            log.debug(`${DEBUG_TITLE} (beforeLoad)`, `No file ID found for vendor bill process record: ${vendorToBill}`);
                        }
                    }

                    const { fileType, fileExtension } = addHiddenFields(form, fileUrl, fileObj, showPdfOnCreate);

                    const vendorBillStagingResult = getVendorBillStagingRecord(vendorToBill);
                    if (vendorBillStagingResult.length > 0) {
                        const billNumber = vendorBillStagingResult[0].getValue(constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER);
                        const billDate = vendorBillStagingResult[0].getValue(constants.VENDOR_BILL_STAGING_FIELDS.BILL_DATE);
                        const amount = vendorBillStagingResult[0].getValue(constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX);
                        const vendorId = vendorBillStagingResult[0].getValue(constants.VENDOR_BILL_STAGING_FIELDS.VENDOR);
                        const lineItems = vendorBillStagingResult[0].getValue(constants.VENDOR_BILL_STAGING_FIELDS.JSON_ITEM_DATA);
                        log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Vendor: ${vendorId}, Bill Number: ${billNumber}, Amount: ${amount}`);

                        objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.TRANID, value: billNumber });
                        objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.TRANDATE, value: billDate });
                        objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.USERTOTAL, value: amount });
                        objRecord.setValue({ fieldId: constants.STANDARD_FIELDS.VENDOR_BILL.ENTITY, value: vendorId });

                        if (lineItems) {
                            const parsedLineItems = JSON.parse(lineItems);
                            log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Parsed Line Items: ${JSON.stringify(parsedLineItems)}`);
                            processLineItems(objRecord, parsedLineItems, config);
                        } else {
                            log.debug(`${DEBUG_TITLE} (beforeLoad)`, 'No line items found in custrecord_lstcptr_json_item_data');
                        }
                    }

                    const inlineHTMLField = form.addField({
                        id: constants.CUSTOM_FIELDS.INLINE_HTML,
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Inline HTML'
                    });
                    inlineHTMLField.defaultValue = generateFileViewerHTML(fileUrl, fileType, fileExtension, constants.FILE_VIEWER.SUPPORTED_TYPES, accountId);
                    form.addButton({
                        id: constants.CUSTOM_FIELDS.TOGGLE_FILE_BUTTON,
                        label: 'Hide/Show File',
                        functionName: 'togglePdfVisibility'
                    });
                } else if (strType === context.UserEventType.EDIT && showPdfOnEdit && isValidContext) {
                    const billProcessId = objRecord.getValue(constants.STANDARD_FIELDS.VENDOR_BILL.PROCESS);
                    log.debug(`${DEBUG_TITLE} (beforeLoad)`, `Bill Process ID: ${billProcessId}`);

                    let fileUrl = '';
                    let fileObj;
                    if (isValidValue(billProcessId)) {
                        try {
                            const billProcessRecord = record.load({
                                type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                                id: billProcessId,
                                isDynamic: false
                            });
                            const fileId = billProcessRecord.getValue(constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE);
                            log.audit(`${DEBUG_TITLE} (beforeLoad)`, `File ID from Vendor Bill Process Record: ${fileId}`);
                            if (fileId) {
                                fileObj = file.load({ id: fileId });
                                fileUrl = `https://${accountId}.app.netsuite.com${fileObj.url}`;
                                log.audit(`${DEBUG_TITLE} (beforeLoad)`, `File URL: ${fileUrl}`);
                            }
                        } catch (err) {
                            log.error(`${DEBUG_TITLE} (beforeLoad)`, `Error loading Vendor Bill Process record: ${err.message}`);
                        }
                    } else {
                        log.debug(`${DEBUG_TITLE} (beforeLoad)`, `No Vendor Bill Process record found for billProcessId: ${billProcessId}`);
                    }

                    setVendorBillFields(objRecord, config);

                    const { fileType, fileExtension } = addHiddenFields(form, fileUrl, fileObj, showPdfOnEdit);

                    const inlineHTMLField = form.addField({
                        id: constants.CUSTOM_FIELDS.INLINE_HTML,
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Inline HTML'
                    });
                    inlineHTMLField.defaultValue = generateFileViewerHTML(fileUrl, fileType, fileExtension, constants.FILE_VIEWER.SUPPORTED_TYPES, accountId);
                    form.addButton({
                        id: constants.CUSTOM_FIELDS.TOGGLE_FILE_BUTTON,
                        label: 'Hide/Show File',
                        functionName: 'togglePdfVisibility'
                    });
                }
            } catch (err) {
                log.error({
                    title: `${DEBUG_TITLE} (beforeLoad) Error`,
                    details: `Error in beforeLoad: ${err.message}`
                });
            }
        };

        return {
            beforeLoad
        };
    });