/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            OCR Testing Bundle Installation (lstcptr_test_bundle_installlation.js)
 *
 * Version:         2.1.0   -   04-Dec-2024  -   PB.     -   Initial development.
 *
 * Author:          LiveStrong Technologies.
 *
 * Purpose:         This script is used to install the Order Capture Bundle in the client account.
 *
 * Script:          customscript_lstcptr_testing_bundle_inst
 * Deploy:          customdeploy_lstcptr_testing_bundle_inst
 *
 * Notes:
 *
 * Dependencies:
 *
 *
 *********************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 * @FileName lstcptr_test_bundle_installlation.js
 */
define(['N/file', 'N/https', 'N/format', 'N/config', 'N/search', 'N/record', 'N/runtime', 'N/encode'],
    /**
     * @param {file} file
     * @param {https} https
     * @param {format} format
     * @param {config} config 
     * @param {search} search
     * @param {record} record 
     * @param {runtime} runtime
     * @param {encode} encode
     */
    function (file, https, format, config, search, record, runtime, encode) 
    {
        var strDebugTitle = 'lstcptr_test_bundle_installlation';
        function execute(context) 
        {
            try 
            {
                var bundleVersion = "2025.1.0";
                var productName = "LSTCapture"
                var ocrStagingFilesFolder = createOCRStagingFilesFolder();
                log.debug({ title: strDebugTitle, details: 'OCR Staging Files Folder: ' + ocrStagingFilesFolder });
                var htmlTemplates = getTemplateFileId();
                log.debug({ title: strDebugTitle, details: 'HTML Templates: ' + JSON.stringify(htmlTemplates) });
                if(isValidString(htmlTemplates.template1_id) && isValidString(htmlTemplates.template2_id)) {
                    createMainConfigRecord(ocrStagingFilesFolder, htmlTemplates);
                }
                var nConfigUserObj = config.load({ type: config.Type.USER_PREFERENCES });
                var currentUser = runtime.getCurrentUser();
                var nConfigCompanyObj = config.load({ type: config.Type.COMPANY_INFORMATION });
                var clientAccountID = nConfigCompanyObj.getValue({ fieldId: 'companyid' });
                var clientCompanyName = nConfigCompanyObj.getValue({ fieldId: 'companyname' });
                var licenseKey = createLicenseKey(clientAccountID, clientCompanyName, new Date());
                var nReBodyData = {};
                nReBodyData['licenseKey'] = licenseKey;
                nReBodyData['companyname'] = nConfigCompanyObj.getValue({ fieldId: 'companyname' });
                nReBodyData['companyid'] = nConfigCompanyObj.getValue({ fieldId: 'companyid' });
                nReBodyData['email'] = nConfigCompanyObj.getValue({ fieldId: 'email' });
                nReBodyData['url'] = nConfigCompanyObj.getValue({ fieldId: 'url' });
                nReBodyData['dateformat'] = nConfigUserObj.getValue({ fieldId: 'DATEFORMAT' });
                nReBodyData['currentuser'] = currentUser.id;
                nReBodyData['useremail'] = currentUser.email;
                nReBodyData['userrole'] = currentUser.role;
                nReBodyData['bundleversion'] = bundleVersion;
                nReBodyData['productname'] = productName;
                var nHeaders = new Array();
                nHeaders['Content-type'] = 'application/json';
               // var ownerSuiteletUrl = `https://tstdrv1423092.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=3849&deploy=3&compid=TSTDRV1423092&ns-at=AAEJ7tMQUuR_zvtPQaPzZ-abRCT5VT7Zl_TM755_7L0IWJGMDMc`;
               
                var nResponse = https.requestSuitelet({
                    scriptId: 'customscript_lstcptr_authorization_sl', // Replace with your actual Suitelet script ID
                    deploymentId: 'customdeploy_lstcptr_authorization_sl', // Replace with your actual deployment ID
                    method: https.Method.POST,
                    body: JSON.stringify(nReBodyData),
                    headers: nHeaders
                });
                log.debug({ title: strDebugTitle + ' Response Body', details: nResponse.body });
                var nResponseCode = nResponse.code;
                log.debug({ title: strDebugTitle + ' Response Code', details: nResponseCode });
    
                if (nResponseCode == 200) 
                {
                    var nResponseData = JSON.parse(nResponse.body);
                    log.debug({ title: strDebugTitle, details: 'Response data is ' + JSON.stringify(nResponseData) });
                    var accountID = nResponseData.accountID;
                    log.debug({ title: strDebugTitle, details: 'Account ID is ' + accountID });
                    var clientLicenseStartDate = nResponseData.startDate;
                    var clientLicenseEndDate = nResponseData.endDate;
                    var parsedStartDate = getFormattedDate(clientLicenseStartDate);
                    log.debug({ title: strDebugTitle, details: 'Client License Start Date: ' + parsedStartDate });
                    var parsedEndDate;
    
                    // Create/Update OrderCapture License in Client Account
                    var orderCaptureLicenseSearch = search.create({
                        type: 'customrecord_lstcptr_license',
                        filters: [['custrecord_lstcptr_account_id', 'is', accountID]],
                        columns: ['internalid']
                    });
    
                    var searchResult = orderCaptureLicenseSearch.run().getRange({ start: 0, end: 1 })[0];
                    if (isValidString(searchResult)) {
                        // Update existing record
                        var lstCaptureLicenseRecord = record.load({
                            type: 'customrecord_lstcptr_license',
                            id: searchResult.getValue('internalid')
                        });

                       if (!clientLicenseEndDate) {
                            clientLicenseEndDate = lstCaptureLicenseRecord.getValue({ fieldId: 'custrecord_lstcptr_license_end_date' });
                            log.debug({ title: strDebugTitle, details: 'Fetched End Date from record (raw): ' + clientLicenseEndDate });
                            parsedEndDate = getFormattedDate(clientLicenseEndDate);
                            log.debug({ title: strDebugTitle, details: 'Client License End Date from record: ' + parsedEndDate });
                        }
                        else {
                            parsedEndDate = getFormattedDate(clientLicenseEndDate);
                            log.debug({ title: strDebugTitle, details: 'Client License End Date from response: ' + parsedEndDate });
                        }
    
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_system_gen_licensekey', nResponseData.licenseKey);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_status',   nResponseData.licenseStatus === "Active" ? true : false );
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_account_id', clientAccountID);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_start_date', parsedStartDate);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_end_date', parsedEndDate);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_product_name', nResponseData.productName);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_product_version', bundleVersion);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_included_usage', nResponseData.includedUsage);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_plan', nResponseData.licenseplan);
                        var lstCaptureLicenseRecordCreate = lstCaptureLicenseRecord.save();
                        log.debug({ title: strDebugTitle, details: 'LSTCapture License Record Updated: ' + lstCaptureLicenseRecordCreate });
                    } else {
                        // Create new record
                        var lstCaptureLicenseRecord = record.create({
                            type: 'customrecord_lstcptr_license',
                            isDynamic: true
                        });
    
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_system_gen_licensekey', nResponseData.licenseKey);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_status',  nResponseData.licenseStatus === "Active" ? true : false);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_account_id', clientAccountID);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_start_date', parsedStartDate);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_end_date', parsedEndDate);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_product_name', nResponseData.productName);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_product_version', bundleVersion);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_included_usage', nResponseData.includedUsage);
                        lstCaptureLicenseRecord.setValue('custrecord_lstcptr_license_plan', nResponseData.licenseplan);
                        var lstCaptureLicenseRecordCreate = lstCaptureLicenseRecord.save();
                        log.debug({ title: strDebugTitle, details: 'LSTCapture License Record Created: ' + lstCaptureLicenseRecordCreate });
                    }
                } else {
                    log.error({ title: strDebugTitle + ' POST Response Error', details: 'Response Code: ' + nResponseCode + ', Response Body: ' + nResponse.body });
                }
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (execute) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        function createOCRStagingFilesFolder() 
        {
            try 
            {
                var folderName = 'LSTCapture  Vendor Bil Files';
    
                // Check if the folder already exists
                var folderSearch = search.create({
                    type: search.Type.FOLDER,
                    filters: [
                        ['name', search.Operator.IS, folderName]
                    ],
                    columns: ['internalid']
                });
    
                var folderSearchResult = folderSearch.run().getRange({ start: 0, end: 1 });
                if (folderSearchResult.length > 0) {
                    log.debug({ title: strDebugTitle, details: 'Folder already exists with internal ID: ' + folderSearchResult[0].getValue('internalid') });
                    return folderSearchResult[0].getValue('internalid');
                } else {
                    // Create the folder if it does not exist
                    var folderRecord = record.create({
                        type: record.Type.FOLDER,
                        isDynamic: true
                    });
                    folderRecord.setValue({
                        fieldId: 'name',
                        value: folderName
                    });
    
                    var folderId = folderRecord.save();
                    log.debug({ title: strDebugTitle, details: 'Folder created with internal ID: ' + folderId });
                    return folderId;
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (createOCRStagingFilesFolder) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        function createMainConfigRecord (ocrStagingFilesFolder, htmlTemplates)
        {
            try 
            {
                // Check if the main configuration record already exists
                var mainConfigSearch = search.create({
                    type: 'customrecord_lstcptr_main_configuration',
                    filters: [],
                    columns: ['internalid']
                });
    
                var mainConfigSearchResult = mainConfigSearch.run().getRange({ start: 0, end: 1 });
                if (mainConfigSearchResult.length > 0) {
                    log.debug({ title: strDebugTitle, details: 'Main Configuration Record already exists with internal ID: ' + mainConfigSearchResult[0].getValue('internalid') });
                    return mainConfigSearchResult[0].getValue('internalid');
                }  else {
                    try {
                        var mainConfigRecord = record.create({
                            type: 'customrecord_lstcptr_main_configuration',
                            isDynamic: true
                        });
            
                        mainConfigRecord.setValue('custrecord_lstcptr_folder_internal_id', ocrStagingFilesFolder);
                        mainConfigRecord.setValue({ fieldId: 'custrecord_lstcptr_html_temp_1', value: htmlTemplates.template1_id });
                        mainConfigRecord.setValue({ fieldId: 'custrecord_lstcptr_html_temp_2', value: htmlTemplates.template2_id });
                        mainConfigRecord.setValue({ fieldId: 'custrecord_lstcptr_bill_split_creation', value: true });
                        mainConfigRecord.setValue({ fieldId: 'custrecord_lstcptr_bill_split_edit', value: true });
                        mainConfigRecord.setValue({ fieldId: 'custrecord_lstcptr_bill_split_view', value: true });
                        var recordId = mainConfigRecord.save();
                        return recordId;
    
                    } catch (err) {
                        log.error({ title: strDebugTitle + ' (createMainConfigRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (createMainConfigRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        /**
         * Defines the function to get the internal ID of a template file by name
         * @returns {String} - Returns the internal ID of the template file
         * since 2015.2
         */
        function getTemplateFileId() 
        {
            var rtnData = {"template1_id": "", "template2_id": ""};
            try 
            {
                var fileSearch = search.create({
                    type: "file",
                    filters: [
                        ["name","is","vendor_bill_to_process_html.html"]
                    ],
                    columns: [
                        search.createColumn({ name: 'name', label: "Name" }),
                        search.createColumn({ name: 'internalid', label: "Internal ID" })
                    ]
                });
    
                var resultSet = fileSearch.run();
                var results = resultSet.getRange({ start: 0, end: 1000 });
                results.forEach(function(result) {
                    var fileName = result.getValue({ name: 'name' });
                    var fileId = result.getValue({ name: 'internalid' });
                    if (fileName == 'vendor_bill_to_process_html.html') {
                        rtnData.template1_id = fileId;
                    } 
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFileIdByName) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }
    
        /**
         * Defines the function to create a license key
         * @returns {String} - Returns the generated license key
         * since 2015.2
         */
        function createLicenseKey(accountID, companyName, date) 
        {
        try
            {
                // Construct the data string
                const data = `${accountID} π ${companyName} π ${date}`;
                // Encode to Base64
                const base64Encoded = encode.convert({
                    string: data,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                });
    
                log.debug({ title: strDebugTitle, details: 'Base64 Encoded: ' + base64Encoded });
    
                return base64Encoded;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (createLicenseKey) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
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
                // Format the date to NetSuite's expected format (MM/DD/YYYY)
                var formattedDate = format.format({
                    value: dateObj,
                    type: format.Type.DATE
                });
                var formattedDateparse = format.parse({
                    value: formattedDate,
                    type: format.Type.DATE
                });
    
                log.debug({ title: strDebugTitle, details: 'Formatted Date: ' + formattedDateparse });
                return formattedDateparse; // Return the formatted date
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFormattedDate) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return null; // Return null in case of an error
            }
        }
    
        /**
         * Helper function to check if a string is valid (non-empty and not null).
         * @param {string} value - String to be checked
         * @returns {boolean} True if the string is valid, false otherwise
         */
        function isValidString(value) {
            if (value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN)
                return true;
            else
                return false;
        }
    
        return {
            execute: execute
        };
    });