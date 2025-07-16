/*********************************************************************************************
 * Copyright © 2023, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Authorization Suitelet (lstcptr_authorization_sl.js)
 *
 * Version:         1.0.0   -   16-Apr-2025  - RS       Initial Development
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
define(['N/crypto', 'N/search', 'N/format', 'N/record', 'N/config', 'N/encode', 'N/runtime', 'N/url', './lstcptr_constants'],
    function (crypto, search, format, record, config, encode, runtime, url, constants) 
    {
        const strDebugTitle = constants.AUTHORIZATION_SL_DEBUG_TITLE;
    
        function onRequest(context) 
        {
            try 
            {
                const request = context.request;
                const response = context.response;
                const accountID = runtime.accountId;
                log.debug({ title: strDebugTitle, details: `Account Id: ${accountID}` });
                log.debug({ title: strDebugTitle, details: 'Script Started' });
                log.debug({ title: strDebugTitle, details: `Request Method: ${request.method}` });
    
                if (request.method === 'GET') 
                {
                    try 
                    {
                        log.debug({ title: strDebugTitle, details: `Account ID: ${accountID}` });
                        if (isValidString(accountID)) 
                        {
                            const clientLicenseSearchGetMethod = search.create({
                                type: constants.RECORD_TYPES.CLIENT_LICENSE,
                                filters: [
                                    [constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID, 'is', accountID],
                                    'AND',
                                    ['isinactive', 'is', 'F']
                                ],
                                columns: [
                                    constants.STANDARD_FIELDS.FILE.INTERNAL_ID,
                                    constants.CLIENT_LICENSE_FIELDS.LICENSE_KEY,
                                    constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID,
                                    constants.CLIENT_LICENSE_FIELDS.START_DATE,
                                    constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE,
                                    constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS,
                                    constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN,
                                    constants.CLIENT_LICENSE_FIELDS.COMPANY_NAME,
                                    constants.CLIENT_LICENSE_FIELDS.COMPANY_EMAIL,
                                    constants.CLIENT_LICENSE_FIELDS.COMPANY_WEBSITE,
                                    constants.CLIENT_LICENSE_FIELDS.INSTALL_USER_NAME,
                                    constants.CLIENT_LICENSE_FIELDS.USER_EMAIL,
                                    constants.CLIENT_LICENSE_FIELDS.USER_ROLE,
                                    constants.CLIENT_LICENSE_FIELDS.PRODUCT_VERSION,
                                    constants.CLIENT_LICENSE_FIELDS.PRODUCT_NAME,
                                    constants.CLIENT_LICENSE_FIELDS.BUNDLE_ID,
                                    constants.CLIENT_LICENSE_FIELDS.USAGE_LIMIT,
                                    constants.CLIENT_LICENSE_FIELDS.DURATION_LIMIT,
                                    constants.CLIENT_LICENSE_FIELDS.API_KEY,
                                    constants.CLIENT_LICENSE_FIELDS.MODEL_ID,
                                    constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE
                                ]
                            });
    
                            const clientSearchResult = clientLicenseSearchGetMethod.run().getRange({ start: 0, end: 1 })[0];
                            if (isValidString(clientSearchResult)) {
                                const clientLicenseData = {
                                    internalId: clientSearchResult.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID),
                                    licenseKey: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_KEY),
                                    accountID: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID),
                                    startDate: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.START_DATE),
                                    endDate: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE),
                                    licenseStatus: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS) ? 'Active' : 'Inactive',
                                    licensePlan: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN),
                                    companyName: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_NAME),
                                    email: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_EMAIL),
                                    website: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_WEBSITE),
                                    userName: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.INSTALL_USER_NAME),
                                    userEmail: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.USER_EMAIL),
                                    userRole: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.USER_ROLE),
                                    productVersion: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.PRODUCT_VERSION),
                                    productName: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.PRODUCT_NAME),
                                    bundleId: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.BUNDLE_ID),
                                    usageLimit: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.USAGE_LIMIT),
                                    durationLimit: clientSearchResult.getText(constants.CLIENT_LICENSE_FIELDS.DURATION_LIMIT),
                                    apiKey: clientSearchResult.getText(constants.CLIENT_LICENSE_FIELDS.API_KEY),
                                    modelId: clientSearchResult.getText(constants.CLIENT_LICENSE_FIELDS.MODEL_ID),
                                    expiredLicense: clientSearchResult.getValue(constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE)
                                };
    
                                log.debug({ title: strDebugTitle, details: `Client License Data: ${JSON.stringify(clientLicenseData)}` });
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
                    let accountID = '';
                    let recordId = '';
                    try {
                        const nCompanyObjRecord = config.load({ type: config.Type.COMPANY_PREFERENCES });
                        const nDateFormat = nCompanyObjRecord.getValue({ fieldId: "DATEFORMAT" });
                        const rawBody = context.request.body;
                        log.audit({ title: 'Raw Body Received', details: rawBody });
                        
                        let licenseData;
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
                        log.debug({ title: strDebugTitle, details: `Client License Data: ${JSON.stringify(licenseData)}` });
                        accountID = licenseData.companyid || '';
                        const bundleId = licenseData.bundleId || '';
                        const productVersion = licenseData.bundleversion || '';
                        const productName = "LSTCapture" || '';
                        const companyName = licenseData.companyname || '';
                        const clientLicenseStartDate = licenseData.startDate || new Date();
                        const startDate = getISODateFormat(clientLicenseStartDate);
                        log.debug({ title: strDebugTitle, details: `Client License Start Date: ${startDate}` });
                        let clientLicenseEndDate = licenseData.endDate || null;
                        let endDate = '';
                        
                        // Validate start and end dates
                        if (endDate && new Date(endDate) <= startDate) {
                            log.error({ title: strDebugTitle, details: 'End date must be greater than start date.' });
                            response.write(JSON.stringify({ error: 'End date must be greater than start date.' }));
                            return;
                        }

                        let isExpired = false;
                        if (endDate) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0); // Strip time
                            const parsedEndDate = new Date(endDate);
                            parsedEndDate.setHours(0, 0, 0, 0);
                        
                            isExpired = parsedEndDate < today;
                        }
                        
                        const licenseStatus = !isExpired;
                        const licensePlan = 1;
                        const rawUrl = licenseData.url || '';
                        let urlVal = rawUrl;
                        if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
                            urlVal = 'https://' + rawUrl;
                        }
                        const licenseKey = licenseData.licenseKey || '';
                        const decodeLicensekey = getLicenseKey(licenseKey);
                        log.debug({ title: strDebugTitle, details: `License Key: ${licenseKey}` });
                        log.debug({ title: strDebugTitle, details: `License Data: ${JSON.stringify(licenseData)}` });
                        log.debug({ title: strDebugTitle, details: `Account ID: ${accountID}` });
    
                        // Search for existing Client License record
                        const clientLicenseSearchForSetValue = search.create({
                            type: constants.RECORD_TYPES.CLIENT_LICENSE,
                            filters: [
                                [constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID, 'is', accountID],
                                'AND',
                                ['isinactive', 'is', 'F']
                            ],
                            columns: [constants.STANDARD_FIELDS.FILE.INTERNAL_ID]
                        });
    
                        let clientLicenseId;
                        const clientSearchResult = clientLicenseSearchForSetValue.run().getRange({ start: 0, end: 1 })[0];
                        let clientLicenseSearch;
                        if (isValidString(clientSearchResult)) {
                            // Update existing record
                            clientLicenseId = clientSearchResult.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                            clientLicenseSearch = record.load({
                                type: constants.RECORD_TYPES.CLIENT_LICENSE,
                                id: clientLicenseId
                            });

                            if (!clientLicenseEndDate) {
                                clientLicenseEndDate = clientLicenseSearch.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE });
                                log.debug({ title: strDebugTitle, details: `Fetched End Date from record (raw): ${clientLicenseEndDate}` });
                                endDate = getISODateFormat(clientLicenseEndDate);
                                log.debug({ title: strDebugTitle, details: `Client License End Date from record: ${endDate}` });
                            } else {
                                endDate = getISODateFormat(clientLicenseEndDate);
                                log.debug({ title: strDebugTitle, details: `Client License End Date from response: ${endDate}` });
                            }
                            
                        } else {
                            // Create new record
                            clientLicenseSearch = record.create({
                                type: constants.RECORD_TYPES.CLIENT_LICENSE,
                                isDynamic: true
                            });
                        }
                        const currentUserName = getUserEntityId(licenseData.currentuser);
                        log.debug({ title: strDebugTitle, details: `Current User Name: ${currentUserName}` });

                        // Set record values
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_KEY, licenseKey);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID, accountID);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.START_DATE, startDate);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE, endDate ? new Date(endDate) : null);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS, licenseStatus);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN, licensePlan);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_NAME, companyName);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_EMAIL, licenseData.email);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_WEBSITE, urlVal);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.INSTALL_USER_NAME, currentUserName);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.USER_EMAIL, licenseData.useremail);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.USER_ROLE, licenseData.userrole);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.PRODUCT_VERSION, productVersion);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.PRODUCT_NAME, productName);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.BUNDLE_ID, bundleId);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.USAGE_LIMIT, licenseData.usageLimit);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.DURATION_LIMIT, licenseData.durationLimit);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.API_KEY, licenseData.apiKey);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.MODEL_ID, licenseData.modelId);
                        clientLicenseSearch.setValue(constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE, isExpired);
                        recordId = clientLicenseSearch.save();
    
                        // Fetch updated record
                        const clientLicenseSearchForGetValue = search.create({
                            type: constants.RECORD_TYPES.CLIENT_LICENSE,
                            filters: [
                                [constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID, 'is', accountID],
                                'AND',
                                ['isinactive', 'is', 'F']
                            ],
                            columns: [
                                constants.STANDARD_FIELDS.FILE.INTERNAL_ID,
                                constants.CLIENT_LICENSE_FIELDS.LICENSE_KEY,
                                constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID,
                                constants.CLIENT_LICENSE_FIELDS.START_DATE,
                                constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE,
                                constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS,
                                constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN,
                                constants.CLIENT_LICENSE_FIELDS.COMPANY_NAME,
                                constants.CLIENT_LICENSE_FIELDS.COMPANY_EMAIL,
                                constants.CLIENT_LICENSE_FIELDS.COMPANY_WEBSITE,
                                constants.CLIENT_LICENSE_FIELDS.INSTALL_USER_NAME,
                                constants.CLIENT_LICENSE_FIELDS.USER_EMAIL,
                                constants.CLIENT_LICENSE_FIELDS.USER_ROLE,
                                constants.CLIENT_LICENSE_FIELDS.PRODUCT_VERSION,
                                constants.CLIENT_LICENSE_FIELDS.PRODUCT_NAME,
                                constants.CLIENT_LICENSE_FIELDS.BUNDLE_ID,
                                constants.CLIENT_LICENSE_FIELDS.USAGE_LIMIT,
                                constants.CLIENT_LICENSE_FIELDS.DURATION_LIMIT,
                                constants.CLIENT_LICENSE_FIELDS.API_KEY,
                                constants.CLIENT_LICENSE_FIELDS.MODEL_ID,
                                constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE
                            ]
                        });
    
                        const clientSearchResultGet = clientLicenseSearchForGetValue.run().getRange({ start: 0, end: 1 })[0];
                        if (isValidString(clientSearchResultGet)) {
                            const startDateISO = getISODateFormat(clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.START_DATE));
                            const endDateISO = getISODateFormat(clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE));
                            const clientLicenseData = {
                                internalId: clientSearchResultGet.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID) || '',
                                licenseKey: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_KEY) || '',
                                accountID: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.ACCOUNT_ID) || '',
                                startDate: startDateISO,
                                endDate: endDateISO,
                                licenseStatus: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS) ? 'Active' : 'Inactive',
                                companyName: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_NAME) || '',
                                email: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_EMAIL) || '',
                                website: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.COMPANY_WEBSITE) || '',
                                userName: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.INSTALL_USER_NAME) || '',
                                userEmail: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.USER_EMAIL) || '',
                                userRole: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.USER_ROLE) || '',
                                licensePlan: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN),
                                productVersion: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.PRODUCT_VERSION) || '',
                                productName: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.PRODUCT_NAME) || '',
                                bundleId: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.BUNDLE_ID) || '',
                                usageLimit: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.USAGE_LIMIT) || '',
                                durationLimit: clientSearchResultGet.getText(constants.CLIENT_LICENSE_FIELDS.DURATION_LIMIT) || '',
                                apiKey: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.API_KEY) || '',
                                modelId: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.MODEL_ID) || '',
                                expiredLicense: clientSearchResultGet.getValue(constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE)
                            };
    
                            log.debug({ title: strDebugTitle, details: `Client License Data: ${JSON.stringify(clientLicenseData)}` });
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
                log.error({ title: `${strDebugTitle} (onRequest) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
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
                log.error({ title: `${strDebugTitle} (getLicenseKey) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
                return null;
            }
        }

        /**
         * Returns the entityid of a user by internal ID.
         * @param {number} userId
         * @returns {string|null}
         */
        function getUserEntityId(userId) {
            const debugTitle = 'getUserEntityId';

            try {
                if (!userId || userId < 0) {
                    log.debug(debugTitle, 'User ID not available');
                    return "System";
                }

                const userFields = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: userId,
                    columns: [constants.STANDARD_FIELDS.VENDOR.ENTITY_ID]
                });

                const entityid = userFields[constants.STANDARD_FIELDS.VENDOR.ENTITY_ID] || null;
                log.debug(debugTitle, `User entityid: ${entityid}`);
                return entityid;
            } catch (e) {
                log.error(`${debugTitle} Error`, e.message);
                return null;
            }
        }

        function getISODateFormat(date) {
            try {
                if (!date || (typeof date === 'string' && date.trim() === '')) {
                    log.error({ title: 'Invalid Input', details: 'The provided date is null, undefined, or empty string.' });
                    return null;
                }

                const dateObj = (date instanceof Date) ? date : new Date(date);
                if (isNaN(dateObj.getTime())) {
                    log.error({ title: 'Invalid Date', details: `The provided date is invalid: ${date}` });
                    return null;
                }

                const formattedDate = format.format({ value: dateObj, type: format.Type.DATE });
                const parsedDate = format.parse({ value: formattedDate, type: format.Type.DATE });

                return parsedDate;
            } catch (err) {
                log.error({
                    title: `${strDebugTitle} (getISODateFormat) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return null;
            }
        }
    
        function isValidString(value) {
            return value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN';
        }
    
        return {
            onRequest: onRequest
        };
    });