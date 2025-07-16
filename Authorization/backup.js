/*********************************************************************************************
 * Copyright © 2023, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Authorization Suitelet (lstcptr_authorization_sl.js)
 *
 * Version:         2.1.0   -   28-Nov-2024  -   PB.     -   Initial development.
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This Suitelet script is used to authorize the client license key and return the license details.
 *
 * Script:          customscript_lstcptr_authorization_sl
 * Deploy:          customdeploy_lstcptr_authorization_sl
 *
 * Notes:
 *
 * Dependencies:
 *
 * Libraries:
 *********************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/crypto', 'N/search', 'N/format', 'N/record', 'N/config', 'N/encode', 'N/runtime'],
    function (crypto, search, format, record, config, encode, runtime) {
        const strDebugTitle = 'lstcptr_authorization_sl';
    
      function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
    
            log.debug('Suitelet Triggered', 'Method: ' + request.method);
    
            if (request.method === 'GET') {
                log.debug('GET Request Triggered', 'Checking for accountID parameter');
    
                var accountID = runtime.accountId;
                log.debug("Account ID: ", accountID);
    
                if (isValidString(accountID)) {
                    log.debug('accountID Received', accountID);
    
                    var searchResult = getClientLicenseRecord(accountID);
                    if (searchResult) {
                        var licenseData = extractLicenseData(searchResult);
                        log.debug('GET License Data', JSON.stringify(licenseData));
                        response.write(JSON.stringify(licenseData));
                    } else {
                        log.debug('GET License Data', 'No record found for accountID: ' + accountID);
                        response.write(JSON.stringify({ success: false, message: 'No license record found for accountID: ' + accountID }));
                    }
                } else {
                    log.debug('GET Missing Param', 'accountID is missing or invalid');
                    response.write(JSON.stringify({ success: false, message: 'Missing or invalid accountID in GET request' }));
                }
            }
    
            if (request.method === 'POST') {
                var rawBody = request.body;
                log.debug('Raw POST Body', rawBody);
    
                var licenseData;
                try {
                    licenseData = JSON.parse(rawBody);
                } catch (e) {
                    log.error('POST JSON Parse Error', e.message);
                    response.write(JSON.stringify({ success: false, message: 'Invalid JSON format' }));
                    return;
                }
    
                log.debug('Parsed POST Data', JSON.stringify(licenseData));
    
                var accountID = licenseData.companyid || '';
                var licenseKey = licenseData.licenseKey || '';
                var companyName = licenseData.companyname || '';
                var email = licenseData.email || '';
                var rawUrl = licenseData.url || '';
                var urlVal = rawUrl;
                // Add protocol if missing
                if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
                    urlVal = 'https://' + rawUrl;
                }
                var currentUser = licenseData.currentuser || '';
                var userEmail = licenseData.useremail || '';
                var userRole = licenseData.userRole || '';
                var productVersion = licenseData.productVersion || '';
                var productName = licenseData.productName || '';
                var bundleId = licenseData.bundleId || '';
                var usageLimit = licenseData.usageLimit || '';
                var durationLimit = licenseData.durationLimit || '';
    
                if (!accountID || !licenseKey) {
                    log.debug('POST Missing Required Fields', 'companyid or licenseKey not provided');
                    response.write(JSON.stringify({ success: false, message: 'Missing required fields: companyid or licenseKey' }));
                    return;
                }
    
                log.debug('POST AccountID', accountID);
    
                var existing = getClientLicenseRecord(accountID);
                if (existing) {
                    var rec = record.load({ type: 'customrecord_lstcptr_client_license', id: existing.getValue('internalid') });
                    setLicenseFields(rec, {
                        licenseKey, accountID, companyName, email, urlVal,
                        currentUser, userEmail, userRole, productVersion, productName,
                        bundleId, usageLimit, durationLimit
                    });
                    rec.save();
                    log.debug('POST Update', 'License record updated');
                } else {
                    var rec = record.create({ type: 'customrecord_lstcptr_client_license', isDynamic: true });
                    setLicenseFields(rec, {
                        licenseKey, accountID, companyName, email, urlVal,
                        currentUser, userEmail, userRole, productVersion, productName,
                        bundleId, usageLimit, durationLimit
                    });
                    rec.save();
                    log.debug('POST Create', 'New license record created');
                }
    
                var updated = getClientLicenseRecord(accountID);
                if (updated) {
                    var finalData = extractLicenseData(updated);
                    log.debug('POST Final Data', JSON.stringify(finalData));
                    response.write(JSON.stringify({ success: true, data: finalData }));
                } else {
                    log.debug('POST Retrieve After Save Failed', 'Could not fetch license record after saving');
                    response.write(JSON.stringify({ success: false, message: 'Could not retrieve license data after save' }));
                }
            }
        } catch (err) {
            log.error(strDebugTitle + ' (onRequest) Error', JSON.stringify({ code: err.name, message: err.message }));
            context.response.write(JSON.stringify({ success: false, message: 'Internal server error' }));
        }
    }
    
        function getClientLicenseRecord(accountID) {
            const searchObj = search.create({
                type: 'customrecord_lstcptr_client_license',
                filters: [['custrecord_lstcptr_client_license_acc_id', 'is', accountID], 'AND', ['isinactive', 'is', 'F']],
                columns: ['internalid']
            });
            return searchObj.run().getRange({ start: 0, end: 1 })[0];
        }
    
        function extractLicenseData(result) {
            return {
                internalId: result.getValue('internalid'),
                licenseKey: result.getValue('custrecord_lstcptr_license_key') || '',
                accountID: result.getValue('custrecord_lstcptr_client_license_acc_id') || '',
                startDate: getISODateFormat(result.getValue('custrecord_lstcptr_client_lic_start_date')),
                endDate: getISODateFormat(result.getValue('custrecord_lstcptr_client_licen_end_date')),
                licenseStatus: result.getValue('custrecord_lstcptr_license_key') ? 'Active' : 'Inactive',
                companyName: result.getValue('custrecord_lstcptr_company_name') || '',
                email: result.getValue('custrecord_lstcptr_company_email') || '',
                website: result.getValue('custrecord_lstcptr_company_website') || '',
                userName: result.getValue('custrecord_lstcptr_install_user_name') || '',
                userEmail: result.getValue('custrecord_lstcptr_user_email') || '',
                userRole: result.getValue('custrecord_lstcptr_user_role') || '',
                productVersion: result.getValue('custrecord_lstcptr_client_product_ver') || '',
                productName: result.getValue('custrecord_lstcptr_client_product_name') || '',
                bundleId: result.getValue('custrecord_lstcptr_client_bundle_id') || '',
                usageLimit: result.getValue('custrecord_lstcptr_client_usage_limit') || '',
                durationLimit: result.getText('custrecord_lstcptr_client_duration_limit') || ''
            };
        }
    
        function setLicenseFields(rec, data) {
            rec.setValue({ fieldId: 'custrecord_lstcptr_license_key', value: data.licenseKey });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_license_acc_id', value: data.accountID });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_lic_start_date', value: new Date() });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_license_status', value: 1 });
            rec.setValue({ fieldId: 'custrecord_lstcptr_company_name', value: data.companyName });
            rec.setValue({ fieldId: 'custrecord_lstcptr_company_email', value: data.email });
            rec.setValue({ fieldId: 'custrecord_lstcptr_company_website', value: data.urlVal });
            rec.setValue({ fieldId: 'custrecord_lstcptr_install_user_name', value: data.currentUser });
            rec.setValue({ fieldId: 'custrecord_lstcptr_user_email', value: data.userEmail });
            rec.setValue({ fieldId: 'custrecord_lstcptr_user_role', value: data.userRole });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_product_ver', value: data.productVersion });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_product_name', value: data.productName });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_bundle_id', value: data.bundleId });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_usage_limit', value: data.usageLimit });
            rec.setValue({ fieldId: 'custrecord_lstcptr_client_duration_limit', value: data.durationLimit });
        }
    
        function getISODateFormat(date) {
            try {
                if (!date) return null;
                const parsed = new Date(date);
                return isNaN(parsed) ? null : parsed.toISOString();
            } catch (e) {
                return null;
            }
        }
    
        function isValidString(value) {
            return value && value !== 'null' && value !== 'undefined' && value.trim() !== '';
        }
    
        return {
            onRequest: onRequest
        };
    });