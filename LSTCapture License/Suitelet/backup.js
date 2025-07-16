/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture License (lstcptr_license_sl.js)
 *
 * Version:         2.1.0   -   26-Nov-2024  -   PB.     -   Initial development.
 *
 * Author:          LiveStrong Technologies.
 *
 * Purpose:         This Suitelet script is used to retrieve the license information for the LSTCapture Bundle.
 *
 * Script:          customscript_lstcptr_liccense_sl
 * Deploy:          customdeploy_lstcptr_liccense_sl
 *
 * Notes:
 *
 * Dependencies:
 *
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @FileName lstcptr_liccense_sl.js
 */
define(['N/https', 'N/config', 'N/search', 'N/record', 'N/format', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget'],
    function (https, config, search, record, format, runtime, message, serverWidget) 
    {
        var strDebugTitle = "lstcptr_liccense_sl";

        function onRequest(context) 
        {
            try 
            {
                var request = context.request;
                var response = context.response;
                var nUserObj = runtime.getCurrentUser();
                var nCurrentUserId = nUserObj.id;
                var nUserRoleId = nUserObj.role;
                var nUserName = nUserObj.name;
                var accountId = runtime.accountId;
                log.debug({ title: strDebugTitle, details: "nCurrentUserId : " + nCurrentUserId + " || nUserRoleId : " + nUserRoleId + " || nUserName : " + nUserName + " || accountId : " + accountId });

                if (request.method === 'GET') 
                {   
                    var form = serverWidget.createForm({
                        title: 'License Overview',
                    });

                    var licenseKeyField = form.addField({
                        id: 'custpage_lstcptr_license_key',
                        type: serverWidget.FieldType.TEXT,
                        label: 'License Key',
                    });
                    licenseKeyField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                    var accountIDField = form.addField({
                        id: 'custpage_lstcptr_account_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Account ID',
                    });
                    accountIDField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                    var includedUsage = form.addField({
                        id: 'custpage_lstcptr_included_usage',
                        type: serverWidget.FieldType.LABEL,
                        label: 'Included Usage',
                    });

                    var usageLimitField = form.addField({
                        id: 'custpage_lstcptr_usage_limit',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Included Usage',
                    });

                    var productName = form.addField({
                        id: 'custpage_lstcptr_product_name',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Product Name',
                    });
                    productName.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                    var productVersion = form.addField({
                        id: 'custpage_lstcptr_product_version',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Product Version',
                    });
                    productVersion.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                    var bundleId = form.addField({
                        id: 'custpage_lstcptr_bundle_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'Bundle ID',
                    });
                    bundleId.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE,
                    });

                    var licensingTab = form.addTab({
                        id: 'custpage_lstcptr_licensing_tab',
                        label: 'Licensing',
                    });

                    var licenseSublist = form.addSublist({
                        id: 'custpage_lstcptr_license',
                        type: serverWidget.SublistType.LIST,
                        label: 'License',
                        tab: 'custpage_lstcptr_licensing_tab',
                    });

                    var licenseStartDate = licenseSublist.addField({
                        id: 'custpage_lstcptr_license_start_date',
                        type: serverWidget.FieldType.DATE,
                        label: 'License Start Date'
                    });

                    var licenseEndDate = licenseSublist.addField({
                        id: 'custpage_lstcptr_license_end_date',
                        type: serverWidget.FieldType.DATE,
                        label: 'License End Date'
                    });

                    var licenseStatus = licenseSublist.addField({
                        id: 'custpage_lstcptr_license_status',
                        type: serverWidget.FieldType.TEXT,
                        label: 'License Status'
                    });

                    var licensePlan = licenseSublist.addField({
                        id: 'custpage_lstcptr_license_plan',
                        type: serverWidget.FieldType.TEXT,
                        label: 'License Plan'
                    });

                    var licenseData = fetchLicenseData();

                    licenseKeyField.defaultValue = licenseData.licenseKey || '';
                    accountIDField.defaultValue = licenseData.accountId || '';
                    includedUsage.defaultValue = licenseData.includedUsage || '';
                    productName.defaultValue = licenseData.productName || '';
                    productVersion.defaultValue = licenseData.productVersion || '';
                    bundleId.defaultValue = licenseData.bundleId || '';
            
                    var nResponse = fetchLicenseResponse(accountIDField.defaultValue);
                    handleLicenseResponse(nResponse, form, licenseSublist, usageLimitField, licenseData);

                    var nResponseData = nResponse && nResponse.body ? JSON.parse(nResponse.body) : {};
                    var isExpired = nResponseData.expiredLicense === 'T' || (nResponseData.endDate && new Date(nResponseData.endDate) < new Date());
                    var clientLicenseStatus = nResponseData.licenseStatus || '';
                    if (isExpired || clientLicenseStatus === 'Inactive') {
                        form.addButton({
                            id: 'custpage_send_email',
                            label: 'Send Email',
                            functionName: 'sendEmail'
                        });
                    }

                    // Add client script to handle button click
                    form.clientScriptModulePath = './lstcptr_send_email.js ';

                    response.writePage(form);
                } else if (request.method === 'POST') 
                {
                    // [Existing POST handling code remains unchanged]
                    try 
                    {
                        var apiKey = request.parameters.custpage_lstcptr_ai_api_key;
                        var modelId = request.parameters.custpage_lstcptr_ai_model_id;

                        var orderCaptureLicenseSearch = search.create({
                            type: 'customrecord_lstcptr_license',
                            filters: [],
                            columns: ['internalid'],
                        });

                        var searchResult = orderCaptureLicenseSearch.run().getRange({ start: 0, end: 1 });
                        if (searchResult.length) {
                            var recordId = searchResult[0].getValue('internalid');

                            record.submitFields({
                                type: 'customrecord_lstcptr_license',
                                id: recordId,
                                values: {
                                    custrecord_lstcptr_api_key: apiKey,
                                    custrecord_lstcptr_model_id: modelId,
                                },
                            });

                            log.debug({ title: strDebugTitle, details: `Record ID: ${recordId}, API Key: ${apiKey}, Model ID: ${modelId}` });
                        }

                        context.response.sendRedirect({
                            type: 'SUITELET',
                            identifier: 'customscript_lstcptr_liccense_sl',
                            id: 'customdeploy_lstcptr_liccense_sl',
                        });
                    } catch (e) {
                        log.error({ title: strDebugTitle, details: 'Error processing POST request: ' + e.message });
                    }
                }

            } catch (e) {
                log.error({ title: strDebugTitle, details: 'Error processing request: ' + e.message });
                context.response.writePage({
                    title: 'Error',
                    contents: '<p>An error occurred while processing the request: ' + e.message + '</p>'
                });
            }
        }

        // Replaced fetchLicenseResponse function
        function fetchLicenseResponse(accountIDValue) {
            var strDebugTitle = 'fetchLicenseResponse';
            try {
                var nResponse = https.requestSuitelet({
                    scriptId: 'customscript_lstcptr_authorization_sl',
                    deploymentId: 'customdeploy_lstcptr_authorization_sl',
                    method: https.Method.GET,
                    urlParams: {
                        accountID: accountIDValue 
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                log.debug({ title: strDebugTitle, details: 'Raw Response Body: ' + nResponse.body });

                if (nResponse.code !== 200) {
                    log.error({ title: strDebugTitle, details: 'Non-200 Response Code: ' + nResponse.code });
                    throw new Error('Failed to fetch license data: Non-200 response.');
                }

                return nResponse;
            } catch (err) {
                log.error({
                    title: strDebugTitle + ' (fetchLicenseResponse) Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return null;
            }
        }

        // [Remaining functions remain unchanged]
        function getFormattedDate(date) 
        {
            try 
            {
                if (!date) {
                    log.error({ title: 'Invalid Input', details: 'The provided date is null, undefined, or empty.' });
                    return null;
                }
                var dateObj = new Date(date);
                if (isNaN(dateObj.getTime())) {
                    log.error({ title: 'Invalid Date', details: 'The provided date is invalid: ' + date });
                    return null;
                }
                var formattedDate = format.format({
                    value: dateObj,
                    type: format.Type.DATE
                });

                log.debug({ title: strDebugTitle, details: 'Formatted Date: ' + formattedDate });
                return formattedDate;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFormattedDate) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return null;
            }
        }

        function getLSTCPTRRecordCount(durationLimit) 
        {
            var rtnData = 0;
            try
            {
                var filters = [
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_lstcptr_process_status", "noneof", "6", "7", "1"]
                ];

                if (durationLimit === "Month") {
                    filters.push("AND", ["created","within","thismonth"]);
                } else if (durationLimit === "Year") {
                    filters.push("AND", ["created","within","thisyear"]);
                }

                var soStagingSearch = search.create({
                    type: "customrecord_lstcptr_vendor_bill_process",
                    filters: filters,
                    columns: [
                        search.createColumn({ name: "internalid", label: "Internal ID" })
                    ]
                });
                log.debug({ title: strDebugTitle, details: JSON.stringify(soStagingSearch)});

                rtnData = soStagingSearch.runPaged().count;
                log.debug({ title: strDebugTitle, details: "SO Staging record count: " + rtnData});
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getLSTCPTRRecordCount) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        function fetchLicenseData() 
        {
            var licenseData = {};
            try
            {
                var orderCaptureLicenseSearch = search.create({
                    type: 'customrecord_lstcptr_license',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC, label: 'Internal ID' }),
                        search.createColumn({ name: 'custrecord_lstcptr_system_gen_licensekey', label: 'System Generated License Key' }),
                        search.createColumn({ name: 'custrecord_lstcptr_account_id', label: 'Account ID' }),
                        search.createColumn({ name: 'custrecord_lstcptr_license_status', label: 'License Status' }),
                        search.createColumn({ name: 'custrecord_lstcptr_included_usage', label: 'Included Usage' }),
                        search.createColumn({ name: 'custrecord_lstcptr_license_product_name', label: 'Product Name' }),
                        search.createColumn({ name: 'custrecord_lstcptr_product_version', label: 'Product Version' }),
                        search.createColumn({ name: 'custrecord_lstcptr_bundle_id', label: 'Bundle ID' }),
                        search.createColumn({ name: 'custrecord_lstcptr_license_usage_limit', label: 'Usage Limit' }),
                        search.createColumn({ name: 'custrecord_lstcptr_duration_limit', label: 'Duration Limit' }),
                        search.createColumn({ name: 'custrecord_lstcptr_expired_license', label: 'Expired License' })
                    ]
                });

                var searchResult = orderCaptureLicenseSearch.run().getRange({ start: 0, end: 1 })[0];
                if (searchResult) {
                    licenseData.licenseKey = searchResult.getValue('custrecord_lstcptr_system_gen_licensekey');
                    licenseData.accountId = searchResult.getValue('custrecord_lstcptr_account_id');
                    licenseData.licenseStatus = searchResult.getValue('custrecord_lstcptr_license_status') ? 'Active' : 'Inactive';
                    licenseData.includedUsage = searchResult.getValue('custrecord_lstcptr_included_usage');
                    licenseData.productName = searchResult.getValue('custrecord_lstcptr_license_product_name');
                    licenseData.productVersion = searchResult.getValue('custrecord_lstcptr_product_version');
                    licenseData.bundleId = searchResult.getValue('custrecord_lstcptr_bundle_id');
                    licenseData.internalId = searchResult.getValue('internalid');
                    licenseData.apiKey = searchResult.getValue('custrecord_lstcptr_api_key');
                    licenseData.modelId = searchResult.getValue('custrecord_lstcptr_model_id');
                    licenseData.expiredLicense = searchResult.getValue('custrecord_lstcptr_expired_license');
                }

                log.debug({ title: strDebugTitle, details: 'License Data: ' + JSON.stringify(licenseData) });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fetchLicenseData) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return licenseData;
        }

        function handleLicenseResponse(nResponse, form, licenseSublist, usageLimitField, licenseData) 
        {
            try 
            {
                if (!nResponse || !nResponse.body) {
                    log.error({ title: strDebugTitle, details: 'Invalid or undefined response from fetchLicenseResponse' });
                    form.addPageInitMessage({
                        type: message.Type.ERROR,
                        message: 'Failed to fetch license data. Please try again or contact support.',
                        title: 'Error Fetching License Data'
                    });
                    return;
                }

                var nResponseData = JSON.parse(nResponse.body);
                log.debug({ title: strDebugTitle, details: 'Parsed Response Data: ' + JSON.stringify(nResponseData) });

                var { formattedStartDate, formattedEndDate, clientLicenseStatus, isExpired, licensePlan } = formatAndLogLicenseDates(nResponseData);
                var { usageLimit, durationLimit, lstcptrRecordCount } = displayUsageInfo(nResponseData, usageLimitField);

                displayWarnings(form, clientLicenseStatus, lstcptrRecordCount, usageLimit, isExpired);
                setLicenseSublistValues(licenseSublist, formattedStartDate, formattedEndDate, clientLicenseStatus, licensePlan);
                updateLicenseRecord(licenseData.internalId, formattedStartDate, formattedEndDate, clientLicenseStatus, usageLimit, durationLimit, isExpired);
            } catch (err) {
                log.error({ title: strDebugTitle + ' (handleLicenseResponse) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                form.addPageInitMessage({
                    type: message.Type.ERROR,
                    message: 'An error occurred while processing the license data: ' + err.message,
                    title: 'Error Processing License Data'
                });
            }
        }

        function formatAndLogLicenseDates(nResponseData) 
        {
            try
            {
                var clientLicenseStartDate = nResponseData.startDate;
                var clientLicenseEndDate = nResponseData.endDate;
                var clientLicenseStatus = nResponseData.licenseStatus;
                var licensePlan = nResponseData.licensePlan || '';
                var isExpired = nResponseData.expiredLicense === 'T' || (clientLicenseEndDate && new Date(clientLicenseEndDate) < new Date());
                if (isExpired) {
                    clientLicenseStatus = 'Inactive';
                }

                log.debug({ title: strDebugTitle, details: 'Client License Start Date: ' + clientLicenseStartDate });

                var formattedStartDate = isValidString(clientLicenseStartDate) ? getFormattedDate(clientLicenseStartDate) : null;
                var formattedEndDate = isValidString(clientLicenseEndDate) ? getFormattedDate(clientLicenseEndDate) : null;

                if (formattedStartDate && formattedEndDate && new Date(formattedEndDate) <= new Date(formattedStartDate)) {
                    throw new Error('End date must be greater than start date.');
                }

                log.debug({ title: strDebugTitle, details: 'Formatted Start Date: ' + formattedStartDate });
                log.debug({ title: strDebugTitle, details: 'Formatted End Date: ' + formattedEndDate });

                return { formattedStartDate, formattedEndDate, clientLicenseStatus, isExpired, licensePlan };
            } catch (err) {
                log.error({ title: strDebugTitle + ' (formatAndLogLicenseDates) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                throw err;
            }
        }

        function displayUsageInfo(nResponseData, usageLimitField) 
        {
            try
            {
                var usageLimit = nResponseData.usageLimit || 0;
                var durationLimit = nResponseData.durationLimit || '';
                var lstcptrRecordCount = getLSTCPTRRecordCount(durationLimit);

                log.debug({ title: strDebugTitle, details: 'Usage Limit: ' + usageLimit + '; Duration Limit: ' + durationLimit });

                usageLimitField.defaultValue = `
                    <div style="
                        border: 1px solid #ccc;
                        padding: 10px;
                        background-color: #f9f9f9;
                        border-radius: 5px;
                        width: 110px;
                        font-size: 16px;
                        color: black;">
                        ${lstcptrRecordCount}
                        <div style="color: #7f7f82; font-size: 12px;">
                        ${usageLimit}/${durationLimit}
                        </div>
                    </div>`;

                return { usageLimit, durationLimit, lstcptrRecordCount };
            } catch (err) {
                log.error({ title: strDebugTitle + ' (displayUsageInfo) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return { usageLimit: 0, durationLimit: '', lstcptrRecordCount: 0 };
            }
        }

        function displayWarnings(form, clientLicenseStatus, lstcptrRecordCount, usageLimit, isExpired) 
        {
            try
            {
                if (isExpired) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license has expired. Please contact support to renew your license.',
                        title: 'License Expired'
                    });
                } else if (clientLicenseStatus === 'Inactive' && lstcptrRecordCount > usageLimit) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license is inactive and your usage limit has been exceeded. Please contact support to reactivate your license and request an increase in your usage limit.',
                        title: 'License Inactive and Usage Limit Exceeded'
                    });
                } else if (clientLicenseStatus === 'Inactive') {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license is inactive. Please contact support to reactivate your license.',
                        title: 'License Inactive'
                    });
                } else if (lstcptrRecordCount > usageLimit) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license usage limit has been exceeded. Please contact support to request an increase in your usage limit.',
                        title: 'Usage Limit Exceeded'
                    });
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (displayWarnings) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function setLicenseSublistValues(licenseSublist, formattedStartDate, formattedEndDate, clientLicenseStatus, licensePlan) 
        {
            try
            {
                licenseSublist.setSublistValue({
                    id: 'custpage_lstcptr_license_start_date',
                    line: 0,
                    value: formattedStartDate || null
                });

                licenseSublist.setSublistValue({
                    id: 'custpage_lstcptr_license_end_date',
                    line: 0,
                    value: formattedEndDate || null
                });

                licenseSublist.setSublistValue({
                    id: 'custpage_lstcptr_license_status',
                    line: 0,
                    value: clientLicenseStatus === 'Active' 
                        ? '<p style="color:#32CD32; margin-left: 5px;">Active</p>' 
                        : '<p style="color:red; margin-left: 5px;">Inactive</p>'
                });

                licenseSublist.setSublistValue({
                    id: 'custpage_lstcptr_license_plan',
                    line: 0,
                    value: licensePlan || ''
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setLicenseSublistValues) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function updateLicenseRecord(recordId, formattedStartDate, formattedEndDate, clientLicenseStatus, usageLimit, durationLimit, isExpired) 
        {
            try 
            {
                var orderCaptureLicenseRecord = record.load({
                    type: 'customrecord_lstcptr_license',
                    id: recordId
                });

                var parsedStartDate = formattedStartDate ? format.parse({
                    value: formattedStartDate,
                    type: format.Type.DATE
                }) : null;

                var parsedEndDate = formattedEndDate ? format.parse({
                    value: formattedEndDate,
                    type: format.Type.DATE
                }) : null;

                if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
                    throw new Error('End date must be greater than start date.');
                }

                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_license_start_date', parsedStartDate);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_license_end_date', parsedEndDate);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_license_status', clientLicenseStatus === 'Active');
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_usage_limit', usageLimit);
                orderCaptureLicenseRecord.setText('custrecord_lstcptr_client_duration_limit', durationLimit);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_expired_license', !!isExpired);
                orderCaptureLicenseRecord.save();

                log.debug({ title: strDebugTitle, details: 'License record updated successfully.' });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (updateLicenseRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                throw err;
            }
        }    

        function isValidString(value) 
        {
            if (value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN)
                return true;
            else
                return false;
        }

        return {
            onRequest: onRequest
        };
    });