/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCPTR Vendor Bill Utilities (lstcptr_bill_to_process_utils.js)
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
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/https', 'N/encode', './lstcptr_constants'], function (search, https, encode, lstcptr_constants) {
    var strDebugTitle = lstcptr_constants.DEBUG_TITLE;

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
            columns: [lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_INTERNAL_ID, lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_NAME],
            filters: [['isinactive', 'is', 'false']]
        });

        subsidiarySearch.run().each(result => {
            subsidiaries.push({
                id: result.getValue(lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_INTERNAL_ID),
                name: result.getValue(lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_NAME)
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
                lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_INTERNAL_ID,
                lstcptr_constants.STANDARD_FIELDS.VENDOR_ENTITY_ID,
                lstcptr_constants.STANDARD_FIELDS.VENDOR_COMPANY_NAME,
                lstcptr_constants.STANDARD_FIELDS.VENDOR_SUBSIDIARY
            ],
            filters: [['isinactive', 'is', 'false']]
        });

        let pagedResults = vendorSearch.runPaged({ pageSize: 1000 });

        pagedResults.pageRanges.forEach(function(pageRange) {
            let page = pagedResults.fetch({ index: pageRange.index });
            page.data.forEach(function(result) {
                vendors.push({
                    id: result.getValue(lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_INTERNAL_ID),
                    name: result.getValue(lstcptr_constants.STANDARD_FIELDS.VENDOR_ENTITY_ID) + ' ' + (result.getValue(lstcptr_constants.STANDARD_FIELDS.VENDOR_COMPANY_NAME) || ''),
                    subsidiaryId: result.getValue(lstcptr_constants.STANDARD_FIELDS.VENDOR_SUBSIDIARY)
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
                scriptId: lstcptr_constants.AUTHORIZATION_SUITELET.SCRIPT_ID,
                deploymentId: lstcptr_constants.AUTHORIZATION_SUITELET.DEPLOYMENT_ID,
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
                type: 'customrecord_lstcptr_client_license',
                filters: [],
                columns: [
                    search.createColumn({ name: lstcptr_constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS, label: 'License Status' }),
                    search.createColumn({ name: lstcptr_constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE, label: 'License End Date' }),
                    search.createColumn({ name: lstcptr_constants.CLIENT_LICENSE_FIELDS.API_KEY, label: 'API Key' }),
                    search.createColumn({ name: lstcptr_constants.CLIENT_LICENSE_FIELDS.MODEL_ID, label: 'Model ID' })
                ]
            });

            var searchResult = lstCaptureLicenseSearch.run().getRange({ start: 0, end: 1 })[0];
            if (searchResult) {
                rtnData.licenseStatus = searchResult.getValue(lstcptr_constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS);
                rtnData.licenseEndDate = searchResult.getValue(lstcptr_constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE);
                rtnData.apiKey = searchResult.getValue(lstcptr_constants.CLIENT_LICENSE_FIELDS.API_KEY);
                rtnData.modelId = searchResult.getValue(lstcptr_constants.CLIENT_LICENSE_FIELDS.MODEL_ID);
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
                    [lstcptr_constants.STANDARD_FIELDS.EXPENSE_CATEGORY_NAME, 'contains', itemName],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: [lstcptr_constants.STANDARD_FIELDS.EXPENSE_CATEGORY_INTERNAL_ID, lstcptr_constants.STANDARD_FIELDS.EXPENSE_CATEGORY_NAME]
            });

            let internalId = null;

            expenseSearch.run().each(function (result) {
                let name = result.getValue({ name: lstcptr_constants.STANDARD_FIELDS.EXPENSE_CATEGORY_NAME });
                log.debug({ title: 'Matching Expense Category', details: name });
                internalId = result.getValue({ name: lstcptr_constants.STANDARD_FIELDS.EXPENSE_CATEGORY_INTERNAL_ID });
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
                columns: [lstcptr_constants.STANDARD_FIELDS.VENDOR_ENTITY_ID]
            });

            vendorName = vendorFields[lstcptr_constants.STANDARD_FIELDS.VENDOR_ENTITY_ID] || null;

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
                    [lstcptr_constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR, "anyof", vendor]
                ],
                columns: [
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.DEPARTMENT,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.CLASS,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.LOCATION,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.AP_ACCOUNT,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.CURRENCY,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.ITEM,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.TAX_CODE,
                    lstcptr_constants.VENDOR_CONFIG_FIELDS.CATEGORY,
                    search.createColumn({ name: lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_INTERNAL_ID, sort: search.Sort.DESC })
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
                    search.createColumn({ name: lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_CREATION, label: 'Vendor Bill Split View On Creation' }),
                    search.createColumn({ name: lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_EDIT, label: 'Vendor Bill Split View On Edit' }),
                    search.createColumn({ name: lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_VIEW, label: 'Vendor Bill Split View On View' }),
                    search.createColumn({ name: lstcptr_constants.STANDARD_FIELDS.SUBSIDIARY_INTERNAL_ID, sort: search.Sort.DESC, label: 'Internal ID' })
                ]
            });

            var mainConfigSearchResult = mainConfigSearch.run().getRange({ start: 0, end: 1 });
            if (mainConfigSearchResult.length > 0) {
                return {
                    [lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_CREATION]: mainConfigSearchResult[0].getValue({ name: lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_CREATION }),
                    [lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_EDIT]: mainConfigSearchResult[0].getValue({ name: lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_EDIT }),
                    [lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_VIEW]: mainConfigSearchResult[0].getValue({ name: lstcptr_constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_VIEW })
                };
            }
            return {};
        } catch (err) {
            log.error({ title: strDebugTitle + ' (getMainConfigRecordFields) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        }
    }

    function isThereValue(value) {
        if (value != null && value != 'null' && value != '' && value != undefined && value != 'undefined' && value != 'NaN' && value != ' ') {
            return true;
        } else {
            return false;
        }
    }

    return {
        getAuthenticationToken: getAuthenticationToken,
        getSubsidiaryOptions: getSubsidiaryOptions,
        getAllVendors: getAllVendors,
        checkLicenseStatus: checkLicenseStatus,
        getSTCaptureLicenseDetails: getSTCaptureLicenseDetails,
        getExpenseItemId: getExpenseItemId,
        pairLineItems: pairLineItems,
        getVendorNameById: getVendorNameById,
        getVendorConfigRecord: getVendorConfigRecord,
        getMainConfigRecordFields: getMainConfigRecordFields,
        isThereValue: isThereValue
    };
});