/*********************************************************************************************
 * Copyright © 2023, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Authorization Suitelet (lstcptr_authorization_sl.js)
 *
 * Version:         2.1.1   -   16-Apr-2025  -   Modified for expiration and date validation
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This Suitelet script is used to authorize the client license key and return the license details.
 *
 * Script:          customscript_lstcptr_authorization_sl
 * Deploy:          customdeploy_lstcptr_authorization_sl
 *
 *********************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @FileName lstcptr_authorization_sl.js
 */
define(['N/crypto', 'N/search', 'N/format', 'N/record', 'N/config', 'N/encode', 'N/runtime', 'N/url'],
    function (crypto, search, format, record, config, encode, runtime, url) 
    {
        var strDebugTitle = 'lstcptr_authorization_sl';
    
        function onRequest(context) 
        {
            try 
            {
                var request = context.request;
                var response = context.response;
                var accountID = runtime.accountId;
                log.debug("Account Id: ", accountID)
                log.debug("Script Started", "Script started");
                log.debug({ title: strDebugTitle, details: 'Request Method: ' + request.method });
    
                if (request.method === 'GET') 
                {
                    try 
                    {
                        if (isValidString(accountID)) 
                        {
                            log.debug({ title: strDebugTitle, details: 'Account ID: ' + accountID });
                            var clientLicenseSearchGetMethod = search.create({
                                type: 'customrecord_lstcptr_client_license',
                                filters: [
                                    ['custrecord_lstcptr_client_license_acc_id', 'is', accountID],
                                    'AND',
                                    ['isinactive', 'is', 'F']
                                ],
                                columns: [
                                    'internalid',
                                    'custrecord_lstcptr_license_key',
                                    'custrecord_lstcptr_client_license_acc_id',
                                    'custrecord_lstcptr_client_lic_start_date',
                                    'custrecord_lstcptr_client_licen_end_date',
                                    'custrecord_lstcptr_client_license_status',
                                    'custrecord_lstcptr_client_license_plan',
                                    'custrecord_lstcptr_company_name',
                                    'custrecord_lstcptr_company_email',
                                    'custrecord_lstcptr_company_website',
                                    'custrecord_lstcptr_install_user_name',
                                    'custrecord_lstcptr_user_email',
                                    'custrecord_lstcptr_user_role',
                                    'custrecord_lstcptr_client_product_ver',
                                    'custrecord_lstcptr_client_product_name',
                                    'custrecord_lstcptr_client_bundle_id',
                                    'custrecord_lstcptr_client_usage_limit',
                                    'custrecord_lstcptr_client_duration_limit',
                                    'custrecord_lstcptr_nanonet_api_key',
                                    'custrecord_lstcptr_nanonet_model_id',
                                    'custrecord_lstcptr_client_expire_license' // Added field
                                ]
                            });
    
                            var clientSearchResult = clientLicenseSearchGetMethod.run().getRange({ start: 0, end: 1 })[0];
                            if (isValidString(clientSearchResult)) {
                                var clientLicenseData = {
                                    internalId: clientSearchResult.getValue('internalid'),
                                    licenseKey: clientSearchResult.getValue('custrecord_lstcptr_license_key'),
                                    accountID: clientSearchResult.getValue('custrecord_lstcptr_client_license_acc_id'),
                                    startDate: clientSearchResult.getValue('custrecord_lstcptr_client_lic_start_date'),
                                    endDate: clientSearchResult.getValue('custrecord_lstcptr_client_licen_end_date'),
                                    licenseStatus: clientSearchResult.getValue('custrecord_lstcptr_client_license_status') ? 'Active' : 'Inactive',
                                    licensePlan: clientSearchResult.getValue('custrecord_lstcptr_client_license_plan'),
                                    companyName: clientSearchResult.getValue('custrecord_lstcptr_company_name'),
                                    email: clientSearchResult.getValue('custrecord_lstcptr_company_email'),
                                    website: clientSearchResult.getValue('custrecord_lstcptr_company_website'),
                                    userName: clientSearchResult.getValue('custrecord_lstcptr_install_user_name'),
                                    userEmail: clientSearchResult.getValue('custrecord_lstcptr_user_email'),
                                    userRole: clientSearchResult.getValue('custrecord_lstcptr_user_role'),
                                    productVersion: clientSearchResult.getValue('custrecord_lstcptr_client_product_ver'),
                                    productName: clientSearchResult.getValue('custrecord_lstcptr_client_product_name'),
                                    bundleId: clientSearchResult.getValue('custrecord_lstcptr_client_bundle_id'),
                                    usageLimit: clientSearchResult.getValue('custrecord_lstcptr_client_usage_limit'),
                                    durationLimit: clientSearchResult.getText('custrecord_lstcptr_client_duration_limit'),
                                    apiKey: clientSearchResult.getText('custrecord_lstcptr_nanonet_api_key'),
                                    modelId: clientSearchResult.getText('custrecord_lstcptr_nanonet_model_id'),
                                    expiredLicense: clientSearchResult.getValue('custrecord_lstcptr_client_expire_license') // Added field
                                };
    
                                log.debug({ title: strDebugTitle, details: 'Client License Data: ' + JSON.stringify(clientLicenseData) });
                                response.write(JSON.stringify(clientLicenseData));
                            } else {
                                log.error({ title: strDebugTitle, details: 'No license record found for the provided account ID.' });
                                response.write(JSON.stringify({ error: 'No license record found.' }));
                            }
                        } else {
                            log.error({ title: strDebugTitle, details: 'Invalid account ID.' });
                            response.write(JSON.stringify({ error: 'Invalid account ID.' }));
                        }
    
                    } catch (err) {
                        log.error({ title: strDebugTitle, details: JSON.stringify({ code: err.name, message: err.message }) });
                        response.write(JSON.stringify({ error: err.message }));
                    }
                }
    
                if (request.method === 'POST') 
                {
                    var accountID = '';
                    var recordId = '';
                    try {
                        var nCompanyObjRecord = config.load({ type: config.Type.COMPANY_PREFERENCES });
                        var nDateFormat = nCompanyObjRecord.getValue({ fieldId: "DATEFORMAT" });
                        var rawBody = context.request.body;
                        log.audit({ title: 'Raw Body Received', details: rawBody });
                        
                        var licenseData;
                        try {
                            licenseData = JSON.parse(rawBody);
                        } catch (parseErr) {
                            log.error({
                                title: 'Invalid JSON body received',
                                details: JSON.stringify({ message: parseErr.message, body: rawBody })
                            });
                            response.write(JSON.stringify({ error: 'Invalid JSON format.' }));
                            return;
                        }                        
                        log.debug({ title: strDebugTitle, details: 'Client License Data: ' + JSON.stringify(licenseData) });
                        accountID = licenseData.companyid || '';
                        var bundleId = licenseData.bundleId || '';
                        var productVersion = licenseData.bundleversion || '';
                        var productName = "LSTCapture" || '';
                        var companyName = licenseData.companyname || '';
                        var clientLicenseStartDate = licenseData.startDate || new Date();
                        var startDate = getISODateFormat(clientLicenseStartDate);
                        log.debug({ title: strDebugTitle, details: 'Client License Start Date: ' + startDate });
                        var clientLicenseEndDate = licenseData.endDate || null;
                        var endDate = '';
                        
                        // Validate start and end dates
                        if (endDate && new Date(endDate) <= startDate) {
                            log.error({ title: strDebugTitle, details: 'End date must be greater than start date.' });
                            response.write(JSON.stringify({ error: 'End date must be greater than start date.' }));
                            return;
                        }

                        var isExpired = false;
                        if (endDate) {
                            var today = new Date();
                            today.setHours(0, 0, 0, 0); // Strip time
                            var parsedEndDate = new Date(endDate);
                            parsedEndDate.setHours(0, 0, 0, 0);
                        
                            isExpired = parsedEndDate < today;
                        }
                        
                        var licenseStatus = !isExpired;

                        var licensePlan = 1;
                        var rawUrl = licenseData.url || '';
                        var urlVal = rawUrl;
                        if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
                            urlVal = 'https://' + rawUrl;
                        }
                        var licenseKey = licenseData.licenseKey || '';
                        var decodeLicensekey = getLicenseKey(licenseData.licenseKey);
                        log.debug({ title: strDebugTitle, details: 'License Key: ' + licenseKey });
                        log.debug({ title: strDebugTitle, details: 'License Data: ' + JSON.stringify(licenseData) });
                        log.debug({ title: strDebugTitle, details: 'Account ID: ' + accountID });
    
                        // Search for existing Client License record
                        var clientLicenseSearchForSetValue = search.create({
                            type: 'customrecord_lstcptr_client_license',
                            filters: [
                                ['custrecord_lstcptr_client_license_acc_id', 'is', accountID],
                                'AND',
                                ['isinactive', 'is', 'F']
                            ],
                            columns: ['internalid']
                        });
    
                        var clientLicenseId;
                        var clientSearchResult = clientLicenseSearchForSetValue.run().getRange({ start: 0, end: 1 })[0];
                        var clientLicenseSearch;
                        if (isValidString(clientSearchResult)) {
                            // Update existing record
                            clientLicenseId = clientSearchResult.getValue('internalid');
                            clientLicenseSearch = record.load({
                                type: 'customrecord_lstcptr_client_license',
                                id: clientLicenseId
                            });

                            if (!clientLicenseEndDate) {
                                clientLicenseEndDate = clientLicenseSearch.getValue({ fieldId: 'custrecord_lstcptr_client_licen_end_date' });
                                log.debug({ title: strDebugTitle, details: 'Fetched End Date from record (raw): ' + clientLicenseEndDate });
                                endDate = getISODateFormat(clientLicenseEndDate);
                                log.debug({ title: strDebugTitle, details: 'Client License End Date from record: ' + parsedEndDate });
                            } else {
                                endDate = getISODateFormat(clientLicenseEndDate);
                                log.debug({ title: strDebugTitle, details: 'Client License End Date from response: ' + parsedEndDate });
                            }
                            
                        } else {
                            // Create new record
                            clientLicenseSearch = record.create({
                                type: 'customrecord_lstcptr_client_license',
                                isDynamic: true
                            });
                        }
                        var currentUserName = getUserEntityId(licenseData.currentuser);
                        log.debug("Current User Name: ", currentUserName);

                        // Set record values
                        clientLicenseSearch.setValue('custrecord_lstcptr_license_key', licenseKey);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_license_acc_id', accountID);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_lic_start_date', startDate);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_licen_end_date', endDate ? new Date(endDate) : null);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_license_status', false);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_license_plan', licensePlan);
                        clientLicenseSearch.setValue('custrecord_lstcptr_company_name', companyName);
                        clientLicenseSearch.setValue('custrecord_lstcptr_company_email', licenseData.email);
                        clientLicenseSearch.setValue('custrecord_lstcptr_company_website', urlVal);
                        clientLicenseSearch.setValue('custrecord_lstcptr_install_user_name', currentUserName);
                        clientLicenseSearch.setValue('custrecord_lstcptr_user_email', licenseData.useremail);
                        clientLicenseSearch.setValue('custrecord_lstcptr_user_role', licenseData.userrole);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_product_ver', productVersion);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_product_name', productName);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_bundle_id', bundleId);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_usage_limit', licenseData.usageLimit);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_duration_limit', licenseData.durationLimit);
                        clientLicenseSearch.setValue('custrecord_lstcptr_client_expire_license', isExpired); // Set expiration flag
                        recordId = clientLicenseSearch.save();
    
                        // Fetch updated record
                        var clientLicenseSearchForGetValue = search.create({
                            type: 'customrecord_lstcptr_client_license',
                            filters: [
                                ['custrecord_lstcptr_client_license_acc_id', 'is', accountID],
                                'AND',
                                ['isinactive', 'is', 'F']
                            ],
                            columns: [
                                'internalid',
                                'custrecord_lstcptr_license_key',
                                'custrecord_lstcptr_client_license_acc_id',
                                'custrecord_lstcptr_client_lic_start_date',
                                'custrecord_lstcptr_client_licen_end_date',
                                'custrecord_lstcptr_client_license_status',
                                'custrecord_lstcptr_client_license_plan',
                                'custrecord_lstcptr_company_name',
                                'custrecord_lstcptr_company_email',
                                'custrecord_lstcptr_company_website',
                                'custrecord_lstcptr_install_user_name',
                                'custrecord_lstcptr_user_email',
                                'custrecord_lstcptr_user_role',
                                'custrecord_lstcptr_client_product_ver',
                                'custrecord_lstcptr_client_product_name',
                                'custrecord_lstcptr_client_bundle_id',
                                'custrecord_lstcptr_client_usage_limit',
                                'custrecord_lstcptr_client_duration_limit',
                                'custrecord_lstcptr_nanonet_model_id',
                                'custrecord_lstcptr_nanonet_api_key',
                                'custrecord_lstcptr_client_expire_license' // Added field
                            ]
                        });
    
                        var clientSearchResult = clientLicenseSearchForGetValue.run().getRange({ start: 0, end: 1 })[0];
                        if (isValidString(clientSearchResult)) {
                            var startDateISO = getISODateFormat(clientSearchResult.getValue('custrecord_lstcptr_client_lic_start_date'));
                            var endDateISO = getISODateFormat(clientSearchResult.getValue('custrecord_lstcptr_client_licen_end_date'));
                            var clientLicenseData = {
                                internalId: clientSearchResult.getValue('internalid'),
                                licenseKey: clientSearchResult.getValue('custrecord_lstcptr_license_key') || '',
                                accountID: clientSearchResult.getValue('custrecord_lstcptr_client_license_acc_id') || '',
                                startDate: startDateISO,
                                endDate: endDateISO,
                                licenseStatus: clientSearchResult.getValue('custrecord_lstcptr_client_license_status') ? 'Active' : 'Inactive',
                                companyName: clientSearchResult.getValue('custrecord_lstcptr_company_name') || '',
                                email: clientSearchResult.getValue('custrecord_lstcptr_company_email') || '',
                                website: clientSearchResult.getValue('custrecord_lstcptr_company_website') || '',
                                userName: clientSearchResult.getValue('custrecord_lstcptr_install_user_name') || '',
                                userEmail: clientSearchResult.getValue('custrecord_lstcptr_user_email') || '',
                                userRole: clientSearchResult.getValue('custrecord_lstcptr_user_role') || '',
                                licensePlan: clientSearchResult.getValue('custrecord_lstcptr_client_license_plan'),
                                productVersion: clientSearchResult.getValue('custrecord_lstcptr_client_product_ver') || '',
                                productName: clientSearchResult.getValue('custrecord_lstcptr_client_product_name') || '',
                                bundleId: clientSearchResult.getValue('custrecord_lstcptr_client_bundle_id') || '',
                                usageLimit: clientSearchResult.getValue('custrecord_lstcptr_client_usage_limit') || '',
                                durationLimit: clientSearchResult.getText('custrecord_lstcptr_client_duration_limit') || '',
                                apiKey: clientSearchResult.getValue('custrecord_lstcptr_nanonet_api_key') || '',
                                modelId: clientSearchResult.getValue('custrecord_lstcptr_nanonet_model_id') || '',
                                expiredLicense: clientSearchResult.getValue('custrecord_lstcptr_client_expire_license') // Added field
                            };
    
                            log.debug({ title: strDebugTitle, details: 'Client License Data: ' + JSON.stringify(clientLicenseData) });
                            response.write(JSON.stringify(clientLicenseData));
                        } else {
                            log.error({ title: strDebugTitle, details: 'Unable to get result of clientSearchResult saved search.' });
                            response.write(JSON.stringify({ error: 'Unable to retrieve saved record.' }));
                        }
                    } catch (err) {
                        log.error({ title: strDebugTitle, details: JSON.stringify({ code: err.name, message: err.message }) });
                        response.write(JSON.stringify({ error: err.message }));
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (onRequest) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                response.write(JSON.stringify({ error: err.message }));
            }
        }
    
        function getLicenseKey(licenseKey) 
        {
            try {
                const decodedString = encode.convert({
                    string: licenseKey,
                    inputEncoding: encode.Encoding.BASE_64,
                    outputEncoding: encode.Encoding.UTF_8
                });
                return decodedString;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getLicenseKey) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }

/**
 * Returns the entityid of a user by internal ID.
 * @param {number} userId
 * @returns {string|null}
 */
function getUserEntityId(userId) {
    var debugTitle = 'getUserEntityId';

    try {
        if (!userId || userId < 0) {
            log.debug(debugTitle, 'User ID not available ');
            return "System";
        }

        var userFields = search.lookupFields({
            type: search.Type.EMPLOYEE,
            id: userId,
            columns: ['entityid']
        });

        var entityid = userFields.entityid || null;
        log.debug(debugTitle, 'User entityid: ' + entityid);
        return entityid;
    } catch (e) {
        log.error(debugTitle + ' Error', e.message);
        return null;
    }
}

            
function getISODateFormat(date) {
    try {
        if (!date || (typeof date === 'string' && date.trim() === '')) {
            log.error({ title: 'Invalid Input', details: 'The provided date is null, undefined, or empty string.' });
            return null;
        }

        var dateObj = (date instanceof Date) ? date : new Date(date);
        if (isNaN(dateObj.getTime())) {
            log.error({ title: 'Invalid Date', details: 'The provided date is invalid: ' + date });
            return null;
        }

        var formattedDate = format.format({ value: dateObj, type: format.Type.DATE });
        var parsedDate = format.parse({ value: formattedDate, type: format.Type.DATE });

        return parsedDate;
    } catch (err) {
        log.error({
            title: strDebugTitle + ' (getISODateFormat) Error',
            details: JSON.stringify({ code: err.name, message: err.message })
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
    
        return {
            onRequest: onRequest
        };
    });