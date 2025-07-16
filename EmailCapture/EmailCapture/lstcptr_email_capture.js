/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LST Email Capture Plugin (emaillcapture_for_record_v2.js)
 *
 * Version:         1.0.0   -   14-Jul-2025  -RS   Initial Development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Processes an incoming email with attachments, saves them to the file cabinet,
 *                  creates a custom vendor bill record for each attachment with email details,
 *                  sends supported attachments to Nanonets for OCR, and attaches files to records.
 *
 * Script:          customscript_lstcptr_email_capture
 * Deploy:          
 *
 * Notes:           Uses lstcptr_email_utils.js library, dynamically loaded by file name for bundle compatibility.
 *                  Supports any NetSuite file type for record attachment, limits Nanonets uploads to PDF, JPG, PNG, etc.
 *
 *********************************************************************************************/

var logTitle = 'customscript_lstcptr_email_capture';

/**
 * Retrieves the internal ID of a file in the File Cabinet by name and folder.
 * @param {string} fileName - Name of the file to find
 * @param {string} [folderId] - Optional folder ID to narrow the search
 * @returns {string|null} File ID or null if not found
 */
function getFileIdByName(fileName, folderId) {
    try {
        var filters = [['name', 'is', fileName]];
        if (folderId) {
            filters.push('AND', ['folder', 'is', folderId]);
        }
        var searchResults = nlapiSearchRecord(
            'file',
            null,
            filters,
            [new nlobjSearchColumn('internalid')]
        );
        if (searchResults && searchResults.length > 0) {
            var fileId = searchResults[0].getValue('internalid');
            nlapiLogExecution('DEBUG', logTitle, 'Found file ' + fileName + ' with ID: ' + fileId);
            return fileId;
        } else {
            nlapiLogExecution('ERROR', logTitle, 'File ' + fileName + ' not found in File Cabinet');
            return null;
        }
    } catch (e) {
        nlapiLogExecution('ERROR', logTitle, 'Error searching for file ' + fileName + ': ' + e.toString());
        return null;
    }
}

/**
 * Main function to process incoming email and create vendor bill records for each attachment.
 * @param {Object} email - The email object to process
 */
function process(email) {
    try {
        // Dynamically load the library
        var libraryFileId = getFileIdByName('lstcptr_email_utils.js');
        if (!libraryFileId) {
            nlapiLogExecution('ERROR', logTitle, 'Cannot proceed: Library file lstcptr_email_utils.js not found');
            return;
        }
        var libraryFile = nlapiLoadFile(libraryFileId);
        if (!libraryFile) {
            nlapiLogExecution('ERROR', logTitle, 'Failed to load library file with ID: ' + libraryFileId);
            return;
        }
        var libraryContent = libraryFile.getValue();
        if (!libraryContent) {
            nlapiLogExecution('ERROR', logTitle, 'Library file lstcptr_email_utils.js is empty or invalid');
            return;
        }

        var utils;
        try {
            utils = eval(libraryContent);
        } catch (evalErr) {
            nlapiLogExecution('ERROR', logTitle, 'Error evaluating library file: ' + evalErr.toString());
            return;
        }
        if (!utils || typeof utils !== 'object') {
            nlapiLogExecution('ERROR', logTitle, 'Library file did not return a valid object');
            return;
        }

        var accountId = nlapiGetContext().getCompany();
        nlapiLogExecution('DEBUG', logTitle, 'Account ID: ' + accountId);

        // Extract email details using library
        var emailDetails = utils.extractEmailDetails(email);
        nlapiLogExecution('DEBUG', logTitle, 'Email Details: From=' + emailDetails.fromAddress + ', To=' + emailDetails.toAddresses.join(', ') + ', Subject=' + emailDetails.subject + ', Attachments=' + emailDetails.attachments.length);

        // Check license
        var licenseRec = checkClientLicense(accountId);
        if (!licenseRec.length || licenseRec[0].licenseStatus === 'F' || licenseRec[0].licenseExpiredStatus === 'T') {
            nlapiLogExecution('ERROR', logTitle, 'Invalid license: Status=' + (licenseRec[0] ? licenseRec[0].licenseStatus : 'undefined') + ', Expired=' + (licenseRec[0] ? licenseRec[0].licenseExpiredStatus : 'undefined'));
            return;
        }

        // Get subsidiary configuration
        var subsidiaryData = getSubsidiary(emailDetails.netsuiteEmail);
        if (!subsidiaryData.length) {
            nlapiLogExecution('DEBUG', logTitle, 'No subsidiary configuration found for email: ' + emailDetails.netsuiteEmail);
            return;
        }

        var folderId = subsidiaryData[0].folderId;
        var author = subsidiaryData[0].employee;
        var inboxEmail = subsidiaryData[0].inboxEmail;
        nlapiLogExecution('DEBUG', logTitle, 'Subsidiary Config: Folder ID=' + folderId + ', Author=' + author + ', Inbox Email=' + inboxEmail);

        // Save attachments using library
        var fileIds = utils.saveAttachments(emailDetails.attachments, folderId);
        nlapiLogExecution('DEBUG', logTitle, 'Saved Files (' + fileIds.length + '): ' + JSON.stringify(fileIds));

        // Create vendor bill records for each file using library
        var vendorBillRecordIds = utils.createVendorBillRecords(fileIds, emailDetails, subsidiaryData[0].subsidiary);
        nlapiLogExecution('DEBUG', logTitle, 'Created Vendor Bill Records: ' + vendorBillRecordIds.join(', '));

        // Forward supported attachments to Nanonets using library
        utils.forwardToNanonets(emailDetails, author, inboxEmail);

    } catch (err) {
        nlapiLogExecution('ERROR', logTitle, 'Main process error: ' + err.toString());
    }
}

/**
 * Checks the client license status for the given account ID.
 * @param {string} accountId - NetSuite account ID
 * @returns {Array} License data
 */
function checkClientLicense(accountId) {
    var logTitle = 'checkClientLicense';
    var licenseData = [];

    if (!isValidString(accountId)) {
        nlapiLogExecution('ERROR', logTitle, 'Invalid Account ID');
        return licenseData;
    }

    try {
        var searchResults = nlapiSearchRecord(
            'customrecord_lstcptr_client_license',
            null,
            [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_lstcptr_client_license_acc_id', 'is', accountId]
            ],
            [
                new nlobjSearchColumn('internalid').setSort(true),
                new nlobjSearchColumn('custrecord_lstcptr_client_license_status'),
                new nlobjSearchColumn('custrecord_lstcptr_client_expire_license')
            ]
        );

        if (searchResults) {
            searchResults.forEach(function(result) {
                licenseData.push({
                    id: result.getValue('internalid'),
                    licenseStatus: result.getValue('custrecord_lstcptr_client_license_status'),
                    licenseExpiredStatus: result.getValue('custrecord_lstcptr_client_expire_license')
                });
            });
        }
    } catch (e) {
        nlapiLogExecution('ERROR', logTitle, 'Error in license search: ' + e.toString());
    }

    return licenseData;
}

/**
 * Retrieves subsidiary configuration for the given NetSuite email.
 * @param {string} netsuiteEmail - NetSuite email address
 * @returns {Array} Subsidiary data
 */
function getSubsidiary(netsuiteEmail) {
    var logTitle = 'getSubsidiary';
    var subsidiaryData = [];
    try {
        if (isValidString(netsuiteEmail)) {
            var search = nlapiCreateSearch(
                'customrecord_lstcptr_subsidiary_config',
                [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_lstcptr_nsplugin_inboundemail', 'is', netsuiteEmail]
                ],
                [
                    new nlobjSearchColumn('internalid').setSort(true),
                    new nlobjSearchColumn('custrecord_lstcptr_sub_config_subsidiary'),
                    new nlobjSearchColumn('custrecord_lstcptr_sub_order_inbox_email'),
                    new nlobjSearchColumn('custrecord_lstcptr_sub_con_folder_id'),
                    new nlobjSearchColumn('custrecord_lstcptr_outbound_user')
                ]
            );
            var searchResults = search.runSearch().getResults(0, 1);
            searchResults.forEach(function(result) {
                subsidiaryData.push({
                    id: result.getValue('internalid'),
                    subsidiary: result.getValue('custrecord_lstcptr_sub_config_subsidiary'),
                    inboxEmail: result.getValue('custrecord_lstcptr_sub_order_inbox_email'),
                    folderId: result.getValue('custrecord_lstcptr_sub_con_folder_id'),
                    employee: result.getValue('custrecord_lstcptr_outbound_user')
                });
            });
            nlapiLogExecution('DEBUG', logTitle, 'Subsidiary Config Results: ' + subsidiaryData.length);
        }
    } catch (e) {
        nlapiLogExecution('ERROR', logTitle, 'Error in subsidiary search: ' + e.toString());
    }
    return subsidiaryData;
}

/**
 * Helper function to check if a value is a valid string.
 * @param {any} value - Value to check
 * @returns {boolean} True if valid, false otherwise
 */
function isValidString(value) {
    return (value !== null && value !== undefined && value !== '' && value !== ' ' && value !== 'null' && value !== 'undefined' && value !== 'NaN');
}