/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture License (lstcptr_license_sl.js)
 *
 * Version:         1.1.0   -   26-Nov-2024  -   PB.     -   Initial development.
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
define(['N/https', 'N/config', 'N/search', 'N/record', 'N/format', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget', 'N/url'],
    /**
     * @param {https} https
     * @param {config} config
     * @param {search} search
     * @param {record} record
     * @param {format} format
     * @param {runtime} runtime
     * @param {message} message 
     * @param {serverWidget} serverWidget
     */
    function (https, config, search, record, format, runtime, message, serverWidget, url) 
    {
        var strDebugTitle = "lstcptr_liccense_sl";
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
        **/
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
                log.debug({ title: strDebugTitle, details: "nCurrentUserId : " + nCurrentUserId + " || nUserRoleId : " + nUserRoleId + " || nUserName : " + nUserName });
    
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
    
                    // Add License Details Sublist
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
    
                    // Set field values
                    licenseKeyField.defaultValue = licenseData.licenseKey || '';
                    accountIDField.defaultValue = licenseData.accountId || '';
                    includedUsage.defaultValue = licenseData.includedUsage || '';
                    productName.defaultValue = licenseData.productName || '';
                    productVersion.defaultValue = licenseData.productVersion || '';
                    bundleId.defaultValue = licenseData.bundleId || '';

                    log.debug("Start Date: ",  licenseData.startDate);
                    log.debug("End Date: ", licenseData.endDate);
                    log.debug("License Status: ", licenseData.licenseStatus);
                    log.debug("license Plan: ",  licenseData.licensePlan);
                   
                     var nResponse = fetchLicenseResponse(accountIDField.defaultValue); // Fetch license response
                     handleLicenseResponse(nResponse, form, licenseSublist, usageLimitField, licenseData); // Process and handle the response
    
                    form.addSubmitButton({
                        label: 'Submit',
                    });
    
                    // Write the form to the response
                    response.writePage(form);
                } 
    
            } catch (e) {
                log.error({ title: strDebugTitle, details: 'Error processing request: ' + e.message });
            }
            
        }
    
        /**
         * Defines the function to get the formatted date
         *  @param {Date} date - The date to be formatted
         * @returns {String} - Returns the formatted date
         * since 2015.2
         */
        function getFormattedDate(date) 
        {
            try 
            {
                // If the input date is a string, ensure it's converted to a valid Date object
                if (!date) {
                    log.error({ title: 'Invalid Input', details: 'The provided date is null, undefined, or empty.' });
                    return null; // Return null for invalid input
                }
                var dateObj = new Date(date);
                // Check if the date is valid
                if (isNaN(dateObj.getTime())) {
                    log.error({ title: 'Invalid Date', details: 'The provided date is invalid: ' + date });
                    return null; // Return null for invalid dates
                }
                // Format the date to NetSuite's expected format (DD-Mon-YYYY)
                var formattedDate = format.format({
                    value: dateObj,
                    type: format.Type.DATE
                });
    
                log.debug({ title: strDebugTitle, details: 'Formatted Date: ' + formattedDate });
                return formattedDate; // Return the formatted date
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFormattedDate) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return null; // Return null in case of an error
            }
        }
    
        /**
         * Defines the function to get the count of Sales Order Staging records based on the duration limit
         * @param {String} durationLimit - The duration limit to filter the records
         * @returns {Number} - Returns the count of Sales Order Staging records
         * since 2015.2
         */
        function getLSTCPTRStagingRecordCount(durationLimit) 
        {
            var rtnData = "";
            try
            {
                var filters = [
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_lstcptr_process_status", "noneof", "2"]
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
                log.error({ title: strDebugTitle + ' (getLSTCPTRStagingRecordCount) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }
    
        /**
         * Fetches the license data from the custom record.
         * @returns {Object} licenseData - The license data object.
         */
        function fetchLicenseData() 
        {
            var licenseData = {};
            try
            {
                var orderCaptureLicenseSearch = search.create({
                    type: 'customrecord_lstcptr_license',
                    filters: [], // Add filters if needed
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
                        search.createColumn({ name: 'custrecord_lstcptr_license_start_date', label: 'Start Date' }),
                        search.createColumn({ name: 'custrecord_lstcptr_license_end_date', label: 'End Date' }),
                        search.createColumn({ name: 'custrecord_lstcptr_license_plan', label: 'License Plan' }),
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
                    licenseData.usageLimit = searchResult.getValue('custrecord_lstcptr_license_usage_limit');
                    licenseData.startDate = searchResult.getValue('custrecord_lstcptr_license_start_date');
                    licenseData.endDate = searchResult.getValue('custrecord_lstcptr_license_end_date');
                    licenseData.licensePlan = searchResult.getValue('custrecord_lstcptr_license_plan');
                }
    
                log.debug({ title: strDebugTitle, details: 'License Data: ' + JSON.stringify(licenseData) });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fetchLicenseData) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return licenseData;
        }
    
        /**
         * Handles the license response from the external Suitelet.
         * @param {Object} nResponse - The response object from the external Suitelet.
         * @param {Form} form - The Suitelet form object.
         * @param {Sublist} licenseSublist - The license sublist object.
         * @param {Field} usageLimitField - The usage limit field object.
         * @param {Object} licenseData - The license data object.
         * @returns {void}
         * since 2015.2
         */
        function handleLicenseResponse(nResponse, form, licenseSublist, usageLimitField, licenseData) 
        {
            try 
            {
                log.debug({ title: strDebugTitle, details: 'Parsed Response Body: ' + JSON.stringify(nResponse.body) });
                var nResponseData = JSON.parse(nResponse.body);
                log.debug({ title: strDebugTitle, details: 'Parsed Response Data: ' + JSON.stringify(nResponseData) });
    
                var { formattedStartDate, formattedEndDate, clientLicenseStatus } = formatAndLogLicenseDates(nResponseData);
                var { usageLimit, durationLimit, soStagingRecordCount } = displayUsageInfo(nResponseData, usageLimitField);
    
                displayWarnings(form, clientLicenseStatus, soStagingRecordCount, usageLimit);
                updateLicenseRecord(licenseData.internalId, formattedStartDate, formattedEndDate, clientLicenseStatus, usageLimit, durationLimit);
                setLicenseSublistValues(licenseSublist, formattedStartDate, formattedEndDate, clientLicenseStatus, licenseData.licensePlan);
               
            } catch (err) {
                log.error({ title: strDebugTitle + ' (handleLicenseResponse) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
   
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
            }
        }
        
        

        /**
         * Formats and logs the license dates.
         * @param {Object} nResponseData - The response data object from the external Suitelet.
         * @returns {Object} - The formatted license dates object.
         * since 2015.2
         */
        function formatAndLogLicenseDates(nResponseData) 
        {
            try
            {
                var clientLicenseStartDate = nResponseData.startDate;
                var clientLicenseEndDate = nResponseData.endDate;
                var clientLicenseStatus = nResponseData.licenseStatus;
    
                log.debug({ title: strDebugTitle, details: 'Client License Start Date: ' + clientLicenseStartDate });
    
                var formattedStartDate = isValidString(clientLicenseStartDate) ? getFormattedDate(clientLicenseStartDate) : null;
                var formattedEndDate = isValidString(clientLicenseEndDate) ? getFormattedDate(clientLicenseEndDate) : null;
    
                log.debug({ title: strDebugTitle, details: 'Formatted Start Date: ' + formattedStartDate });
                log.debug({ title: strDebugTitle, details: 'Formatted End Date: ' + formattedEndDate });
    
                return { formattedStartDate, formattedEndDate, clientLicenseStatus };
            } catch (err) {
                log.error({ title: strDebugTitle + ' (formatAndLogLicenseDates) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        /**
         * Displays the usage information on the Suitelet form.
         * @param {Object} nResponseData - The response data object from the external Suitelet.
         * @param {Field} usageLimitField - The usage limit field object.
         * @returns {Object} - The usage information object.
         * since 2015.2
         */
        function displayUsageInfo(nResponseData, usageLimitField) 
        {
            try
            {
                var usageLimit = nResponseData.usageLimit;
                var durationLimit = nResponseData.durationLimit;
                var soStagingRecordCount = getLSTCPTRStagingRecordCount(durationLimit);
    
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
                        ${soStagingRecordCount}
                        <div style="color: #7f7f82; font-size: 12px;">
                        ${usageLimit}/${durationLimit}
                        </div>
                    </div>`;
    
                return { usageLimit, durationLimit, soStagingRecordCount };
            } catch (err) {
                log.error({ title: strDebugTitle + ' (displayUsageInfo) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        /**
         * Displays warning messages on the Suitelet form based on the license status and usage limit.
         * @param {Form} form - The Suitelet form object.
         * @param {String} clientLicenseStatus - The client license status.
         * @param {Number} soStagingRecordCount - The count of Sales Order Staging records.
         * @param {Number} usageLimit - The usage limit.
         * @returns {void}
         * since 2015.2
         */
        function displayWarnings(form, clientLicenseStatus, soStagingRecordCount, usageLimit) 
        {
            try
            {
                if (clientLicenseStatus === 'Inactive' && soStagingRecordCount > usageLimit) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your LSTCapture license is inactive and your usage limit has been exceeded. Please contact support to reactivate your license and request an increase in your usage limit.',
                        title: 'License Expired and Usage Limit Exceeded'
                    });
                } else if (clientLicenseStatus === 'Inactive') {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your LSTCapture license is inactive. Please contact support to reactivate your license.',
                        title: 'License Expired'
                    });
                } else if (soStagingRecordCount > usageLimit) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your LSTCapture license usage limit has been exceeded. Please contact support to request an increase in your usage limit.',
                        title: 'Usage Limit Exceeded'
                    });
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (displayWarnings) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        /**
         * Sets the values of the license sublist fields.
         * @param {Sublist} licenseSublist - The license sublist object.
         * @param {String} formattedStartDate - The formatted start date.
         * @param {String} formattedEndDate - The formatted end date.
         * @param {String} clientLicenseStatus - The client license status.
         * @returns {void}
         * since 2015.2
         */
        function setLicenseSublistValues(licenseSublist, formattedStartDate, formattedEndDate, clientLicenseStatus, licensePlanId) 
        {
            var licensePlanText = getLicensePlanName(licensePlanId);
            log.debug("License Plan: ", licensePlanText);
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
                    id: 'custpage_lstcptr_license_plan',
                    line: 0,
                    value: licensePlanText || null
                });
    
                licenseSublist.setSublistValue({
                    id: 'custpage_lstcptr_license_status',
                    line: 0,
                    value: clientLicenseStatus === 'Active' 
                        ? '<p style="color:#32CD32; margin-left: 5px;">Active</p>' 
                        : '<p style="color:red; margin-left: 5px;">Inactive</p>'
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setLicenseSublistValues) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function getLicensePlanName(licenseplanId) {
            var strDebugTitle = 'getLicensePlanName';
            var planName = '';
        
            try {
                if (!licenseplanId) {
                    log.error({ title: strDebugTitle, details: 'No license plan ID provided' });
                    return '';
                }
        
                planName = search.lookupFields({
                    type: 'customlist_lstcptr_license_plan',
                    id: licenseplanId,
                    columns: ['name']
                }).name;
        
                log.debug({ title: strDebugTitle, details: 'License Plan Name: ' + planName });
            } catch (err) {
                log.error({
                    title: strDebugTitle + ' Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
        
            return planName;
        }
        
    
        /**
         * Updates the license record with the formatted start and end dates, client license status, usage limit, and duration limit.
         * @param {String} recordId - The internal ID of the license record.
         * @param {String} formattedStartDate - The formatted start date.
         * @param {String} formattedEndDate - The formatted end date.
         * @param {String} clientLicenseStatus - The client license status.
         * @param {Number} usageLimit - The usage limit.
         * @param {String} durationLimit - The duration limit.
         * @returns {void}
         * since 2015.2
         */
        function updateLicenseRecord(recordId, formattedStartDate, formattedEndDate, clientLicenseStatus, usageLimit, durationLimit) 
        {
            try {
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

                // Validation: End Date must be after Start Date
                if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
                    log.debug('DateValliddation','End Date must be greater than Start Date.');
                }

                // Check for expiration
                var isExpired = false;
                clientLicenseStatus = 'Active';
                var today = new Date();
                if (parsedEndDate && parsedEndDate <= today) {
                    isExpired = true;
                    clientLicenseStatus = 'Inactive';
                }

                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_license_start_date', parsedStartDate);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_license_end_date', parsedEndDate);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_license_status', clientLicenseStatus);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_client_usage_limit', usageLimit);
                orderCaptureLicenseRecord.setText('custrecord_lstcptr_client_duration_limit', durationLimit);
                orderCaptureLicenseRecord.setValue('custrecord_lstcptr_expired_license', isExpired); // New checkbox handling

                orderCaptureLicenseRecord.save();

                log.debug({ title: strDebugTitle, details: 'License record updated successfully.' });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (updateLicenseRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });

            }
        }
  
    
        /**
         * Helper function to check if a string is valid (non-empty and not null).
         * @param {string} value - String to be checked
         * @returns {boolean} True if the string is valid, false otherwise
         */
        function isValidString (value) 
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