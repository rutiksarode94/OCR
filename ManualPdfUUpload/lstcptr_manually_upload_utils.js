/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCPTR Utilities (lstcptr_manually_upload_utils.js)
 *
 * Version:         1.0.0   -   14-July-2025 - RS      Initial Development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Utility functions for LSTCPTR scripts, providing reusable functionality.
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 */
define(['N/search', 'N/https', 'N/encode', './lstcptr_constants'], function (search, https, encode, CONSTANTS) {
    var strDebugTitle = CONSTANTS.DEBUG_TITLE;

    function getFolderID(folderName) {
        try {
            var folderSearch = search.create({
                type: search.Type.FOLDER,
                filters: [
                    ['name', 'is', folderName]
                ],
                columns: [
                    search.createColumn({ name: 'internalid' })
                ]
            });

            var searchResult = folderSearch.run().getRange({ start: 0, end: 1 });

            if (searchResult.length > 0) {
                var folderId = searchResult[0].getValue({ name: 'internalid' });
                log.debug({ title: strDebugTitle + ' (getFolderID)', details: 'Folder ID found: ' + folderId });
                return folderId;
            } else {
                log.error({ title: strDebugTitle + ' (getFolderID) Error', details: 'Folder not found with name: ' + folderName });
                return null;
            }
        } catch (error) {
            log.error({ title: strDebugTitle + ' (getFolderID) Error', details: JSON.stringify({ code: error.name, message: error.message }) });
            return null;
        }
    }

    function getAuthenticationToken(apiKey) {
        try {
            return encode.convert({
                string: apiKey + ":",
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            });
        } catch (error) {
            log.error('getAuthenticationToken Error', error);
            return '';
        }
    }

    function getSubsidiaryOptions() {
        let subsidiaries = [];
        let subsidiarySearch = search.create({
            type: search.Type.SUBSIDIARY,
            columns: [
                search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID }),
                search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.SUBSIDIARY.NAME })
            ],
            filters: [['isinactive', 'is', 'false']]
        });

        subsidiarySearch.run().each(result => {
            subsidiaries.push({
                id: result.getValue(CONSTANTS.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID),
                name: result.getValue(CONSTANTS.STANDARD_FIELDS.SUBSIDIARY.NAME)
            });
            return true;
        });

        return subsidiaries;
    }

    function getAllVendors() {
        let vendors = [];
        let vendorSearch = search.create({
            type: search.Type.VENDOR,
            columns: [
                search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.VENDOR.INTERNAL_ID }),
                search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.VENDOR.ENTITY_ID }),
                search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.VENDOR.COMPANY_NAME }),
                search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.VENDOR.SUBSIDIARY })
            ],
            filters: [['isinactive', 'is', 'false']]
        });

        let pagedResults = vendorSearch.runPaged({ pageSize: 1000 });

        pagedResults.pageRanges.forEach(function(pageRange) {
            let page = pagedResults.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                vendors.push({
                    id: result.getValue(CONSTANTS.STANDARD_FIELDS.VENDOR.INTERNAL_ID),
                    name: result.getValue(CONSTANTS.STANDARD_FIELDS.VENDOR.ENTITY_ID) + ' ' + (result.getValue(CONSTANTS.STANDARD_FIELDS.VENDOR.COMPANY_NAME) || ''),
                    subsidiaryId: result.getValue(CONSTANTS.STANDARD_FIELDS.VENDOR.SUBSIDIARY)
                });
            });
        });

        log.debug({ title: 'All Vendors', details: 'Fetched vendors count: ' + vendors.length });
        return vendors;
    }

    function checkLicenseStatus(accountId) {
        var rtnData = { "licenseStatus": "" };
        try {
            var nHeaders = new Array();
            nHeaders['Content-type'] = 'application/json';
            var accountIDValue = accountId;
            var nResponse = https.requestSuitelet({
                scriptId: CONSTANTS.AUTHORIZATION_SUITELET.SCRIPT_ID,
                deploymentId: CONSTANTS.AUTHORIZATION_SUITELET.DEPLOYMENT_ID,
                method: https.Method.GET,
                urlParams: {
                    accountID: accountIDValue
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            log.debug({ title: strDebugTitle, details: 'Raw Response Body: ' + nResponse.body });

            if (nResponse.code == 200) {
                var nResponseObj = JSON.parse(nResponse.body);
                var clientLicenseStatus = nResponseObj.licenseStatus;
                rtnData.licenseStatus = clientLicenseStatus;
            } else {
                log.error({ title: strDebugTitle, details: 'Error occurred while fetching the active status.' });
                return null;
            }
        } catch (err) {
            log.error({ title: strDebugTitle + ' (checkLicenseStatus) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        }
        return rtnData;
    }

    function getSTCaptureLicenseDetails() {
        var rtnData = {};
        try {
            var lstCaptureLicenseSearch = search.create({
                type: CONSTANTS.RECORD_TYPES.CLIENT_LICENSE,
                filters: [],
                columns: [
                    search.createColumn({ name: CONSTANTS.CLIENT_LICENSE_FIELDS.LICENSE_STATUS, label: 'License Status' }),
                    search.createColumn({ name: CONSTANTS.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE, label: 'License End Date' }),
                    search.createColumn({ name: CONSTANTS.CLIENT_LICENSE_FIELDS.API_KEY, label: 'API Key' }),
                    search.createColumn({ name: CONSTANTS.CLIENT_LICENSE_FIELDS.MODEL_ID, label: 'Model ID' })
                ]
            });

            var searchResult = lstCaptureLicenseSearch.run().getRange({ start: 0, end: 1 })[0];
            if (searchResult) {
                rtnData.licenseStatus = searchResult.getValue(CONSTANTS.CLIENT_LICENSE_FIELDS.LICENSE_STATUS);
                rtnData.licenseEndDate = searchResult.getValue(CONSTANTS.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE);
                rtnData.apiKey = searchResult.getValue(CONSTANTS.CLIENT_LICENSE_FIELDS.API_KEY);
                rtnData.modelId = searchResult.getValue(CONSTANTS.CLIENT_LICENSE_FIELDS.MODEL_ID);
            }
        } catch (err) {
            log.error({ title: strDebugTitle + ' (getSTCaptureLicenseDetails) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        }
        return rtnData;
    }

    function getExpenseItemId(itemName) {
        try {
            var expenseSearch = search.create({
                type: 'expensecategory',
                filters: [
                    [CONSTANTS.STANDARD_FIELDS.EXPENSE_CATEGORY.NAME, 'contains', itemName],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.EXPENSE_CATEGORY.INTERNAL_ID }),
                    search.createColumn({ name: CONSTANTS.STANDARD_FIELDS.EXPENSE_CATEGORY.NAME })
                ]
            });

            let internalId = null;

            expenseSearch.run().each(function (result) {
                let name = result.getValue({ name: CONSTANTS.STANDARD_FIELDS.EXPENSE_CATEGORY.NAME });
                log.debug({ title: 'Matching Expense Category', details: name });
                internalId = result.getValue({ name: CONSTANTS.STANDARD_FIELDS.EXPENSE_CATEGORY.INTERNAL_ID });
                return false;
            });

            if (internalId) {
                log.debug({
                    title: 'Expense Category Found',
                    details: 'ID: ' + internalId + ' for Approx Name: ' + itemName
                });
            } else {
                log.debug({
                    title: 'Expense Category Not Found',
                    details: 'No match found for approx name: ' + itemName
                });
            }

            return internalId;
        } catch (error) {
            log.error({
                title: 'getExpenseItemId Error',
                details: error.message
            });
            return null;
        }
    }

    function isValidString(value) {
        if (value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN)
            return true;
        else
            return false;
    }

    function pairLineItems(items) {
        let pairedItems = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].label === 'description' && i + 1 < items.length && items[i + 1].label === 'amount') {
                let cleanedAmount = (items[i + 1].text || '').replace('*', '').trim();
                cleanedAmount = cleanedAmount.replace(/[₹,]/g, '').trim();
                if (items[i].text.trim()) {
                    pairedItems.push({
                        description: items[i].text.trim(),
                        amount: cleanedAmount || '0.00'
                    });
                }
                i++;
            }
        }
        return pairedItems;
    }

    return {
        getFolderID: getFolderID,
        getAuthenticationToken: getAuthenticationToken,
        getSubsidiaryOptions: getSubsidiaryOptions,
        getAllVendors: getAllVendors,
        checkLicenseStatus: checkLicenseStatus,
        getSTCaptureLicenseDetails: getSTCaptureLicenseDetails,
        getExpenseItemId: getExpenseItemId,
        isValidString: isValidString,
        pairLineItems: pairLineItems
    };
});