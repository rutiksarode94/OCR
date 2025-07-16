/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LST Email Capture Plugin (emaillcapture_for_record.js)
 *
 * Version:         1.0.2   -   14-Jul-2025  -RS   Refactored for clarity and one record per attachment
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Processes an incoming email with attachments, saves them to the NetSuite File Cabinet,
 *                  creates a custom vendor bill record for each attachment with email details,
 *                  sends supported attachments to Nanonets for OCR, and attaches files to records.
 *
 * Script:          customscript_lstcptr_email_capture
 * Deploy:          
 *
 * Notes:           Supports any NetSuite file type for record attachment, but limits Nanonets uploads to PDF, JPG, PNG, etc.
 *                  Uses NetSuite account ID to query client license record for active status, API key, and model ID.
 *
 *********************************************************************************************/

var logTitle = 'customscript_lstcptr_email_capture';

// Configuration object for field IDs and constants
const CONFIG = {
    RECORD_TYPE: 'customrecord_lstcptr_vendor_bill_process',
    FIELDS: {
        RECIPIENT_EMAIL: 'custrecord_lstcptr_recipient_email',
        ORIGINAL_EMAIL: 'custrecord_lstcptr_original_email',
        EMAIL_SUBJECT: 'custrecord_lstcptr_email_subject',
        EMAIL_BODY_HTML: 'custrecord_lstcptr_email_body_html_text',
        EMAIL_BODY_TEXT: 'custrecord_lstcptr_email_body_plane_text',
        CREATED_BY_EMAIL: 'custrecord_lstcptr_created_by_email',
        TRAN_STATUS: 'custrecord_lstcptr_tran_status',
        PROCESS_STATUS: 'custrecord_lstcptr_process_status',
        PROVIDER: 'custrecord_lstcptr_provider',
        TRANSACTION_TYPE: 'custrecord_lstcptr_transaction_type',
        DATE_SENT_TO_OCR: 'custrecord_lstcptr_date_sent_to_ocr',
        SUBSIDIARY: 'custrecord_lstcptr_subsidiary',
        FILE_ID: 'custrecord_lstcptr_file_id' // Consolidated from redundant fields
    },
    NANONETS_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png'],
    IST_OFFSET_MINUTES: 330 // 5 hours 30 minutes for IST
};

/**
 * Main function to process incoming email and create vendor bill records for each attachment.
 * @param {Object} email - The email object to process
 */
function process(email) {
    try {
        var accountId = nlapiGetContext().getCompany();
        nlapiLogExecution('DEBUG', logTitle, `Account ID: ${accountId}`);

        // Extract email details
        var emailDetails = extractEmailDetails(email);
        nlapiLogExecution('DEBUG', logTitle, `Email Details: From=${emailDetails.fromAddress}, To=${emailDetails.toAddresses.join(', ')}, Subject=${emailDetails.subject}, Attachments=${emailDetails.attachments.length}`);

        // Check license and subsidiary
        var licenseRec = checkClientLicense(accountId);
        if (!licenseRec.length || licenseRec[0].licenseStatus === 'F' || licenseRec[0].licenseExpiredStatus === 'T') {
            nlapiLogExecution('ERROR', logTitle, `Invalid license: Status=${licenseRec[0]?.licenseStatus}, Expired=${licenseRec[0]?.licenseExpiredStatus}`);
            return;
        }

        var subsidiaryData = getSubsidiary(emailDetails.netsuiteEmail);
        if (!subsidiaryData.length) {
            nlapiLogExecution('DEBUG', logTitle, `No subsidiary configuration found for email: ${emailDetails.netsuiteEmail}`);
            return;
        }

        var { folderId, employee: author, inboxEmail } = subsidiaryData[0];
        nlapiLogExecution('DEBUG', logTitle, `Subsidiary Config: Folder ID=${folderId}, Author=${author}, Inbox Email=${inboxEmail}`);

        // Save attachments to File Cabinet
        var fileIds = saveAttachments(emailDetails.attachments, folderId);
        nlapiLogExecution('DEBUG', logTitle, `Saved Files (${fileIds.length}): ${JSON.stringify(fileIds)}`);

        // Create vendor bill records for each file
        var vendorBillRecordIds = createVendorBillRecords(fileIds, emailDetails, subsidiaryData[0].subsidiary);
        nlapiLogExecution('DEBUG', logTitle, `Created Vendor Bill Records: ${vendorBillRecordIds.join(', ')}`);

        // Forward supported attachments to Nanonets
        forwardToNanonets(emailDetails, author, inboxEmail);

    } catch (err) {
        nlapiLogExecution('ERROR', logTitle, `Main process error: ${err.toString()}`);
    }
}

/**
 * Extracts email details (from, to, cc, subject, body, attachments).
 * @param {Object} email - The email object
 * @returns {Object} Email details
 */
function extractEmailDetails(email) {
    var fromAddress = email.getFrom() || '';
    var toAddresses = parseEmailAddresses(email.getTo() || [], 'toAddress');
    var netsuiteEmail = toAddresses.find(addr => isValidString(addr) && addr.includes('.email.netsuite.com')) || '';
    var ccAddresses = parseEmailAddresses(email.getCc() || [], 'ccAddress');
    var subject = email.getSubject() || '';
    var textBody = email.getTextBody() || '';
    var htmlBody = email.getHtmlBody() || '';
    var attachments = email.getAttachments() || [];

    return {
        fromAddress,
        toAddresses,
        netsuiteEmail,
        ccAddresses,
        subject,
        textBody,
        htmlBody,
        attachments
    };
}

/**
 * Parses email addresses from a list (to or cc).
 * @param {Array} addressList - List of addresses
 * @param {string} logPrefix - Prefix for logging (e.g., 'toAddress')
 * @returns {Array} Valid email addresses
 */
function parseEmailAddresses(addressList, logPrefix) {
    var addresses = [];
    for (var i = 0; i < addressList.length; i++) {
        var emailAddr = '';
        if (typeof addressList[i] === 'string') {
            emailAddr = addressList[i];
        } else if (addressList[i] && typeof addressList[i] === 'object') {
            emailAddr = addressList[i].email || (addressList[i].getAddress && addressList[i].getAddress()) || '';
            if (!emailAddr) {
                nlapiLogExecution('ERROR', logTitle, `Invalid ${logPrefix} format at index ${i}: ${JSON.stringify(addressList[i])}`);
                continue;
            }
        } else {
            nlapiLogExecution('ERROR', logTitle, `Invalid ${logPrefix} format at index ${i}: ${JSON.stringify(addressList[i])}`);
            continue;
        }
        if (isValidString(emailAddr)) {
            addresses.push(emailAddr);
        }
    }
    return addresses;
}

/**
 * Saves attachments to the NetSuite File Cabinet.
 * @param {Array} attachments - List of attachment objects
 * @param {string} folderId - Folder ID for saving files
 * @returns {Array} Array of saved file IDs, types, and names
 */
function saveAttachments(attachments, folderId) {
    var fileIds = [];
    for (var i = 0; i < attachments.length; i++) {
        try {
            var file = attachments[i];
            var fileName = file.getName() || 'Unnamed';
            var fileType = file.getType() || 'Unknown';
            file.setFolder(folderId);
            var fileId = nlapiSubmitFile(file);
            if (isValidString(fileId)) {
                fileIds.push({ id: fileId, type: fileType, name: fileName });
                nlapiLogExecution('DEBUG', logTitle, `Saved file: ${fileName} (ID: ${fileId})`);
            } else {
                nlapiLogExecution('ERROR', logTitle, `Failed to upload file: ${fileName}`);
            }
        } catch (fileErr) {
            nlapiLogExecution('ERROR', logTitle, `Error uploading file ${attachments[i].getName() || 'Unnamed'}: ${fileErr.toString()}`);
        }
    }
    return fileIds;
}

/**
 * Creates a vendor bill record for each file and attaches the file.
 * @param {Array} fileIds - Array of file IDs, types, and names
 * @param {Object} emailDetails - Email details
 * @param {string} subsidiary - Subsidiary ID
 * @returns {Array} Created record IDs
 */
function createVendorBillRecords(fileIds, emailDetails, subsidiary) {
    var recordIds = [];
    fileIds.forEach(function(file) {
        try {
            var rec = nlapiCreateRecord(CONFIG.RECORD_TYPE);
            rec.setFieldValue(CONFIG.FIELDS.RECIPIENT_EMAIL, emailDetails.toAddresses.toString());
            rec.setFieldValue(CONFIG.FIELDS.ORIGINAL_EMAIL, emailDetails.fromAddress);
            rec.setFieldValue(CONFIG.FIELDS.EMAIL_SUBJECT, emailDetails.subject);
            rec.setFieldValue(CONFIG.FIELDS.EMAIL_BODY_HTML, emailDetails.htmlBody);
            rec.setFieldValue(CONFIG.FIELDS.EMAIL_BODY_TEXT, emailDetails.textBody);
            rec.setFieldValue(CONFIG.FIELDS.CREATED_BY_EMAIL, 'T');
            rec.setFieldValue(CONFIG.FIELDS.TRAN_STATUS, '2');
            rec.setFieldValue(CONFIG.FIELDS.PROCESS_STATUS, '2');
            rec.setFieldValue(CONFIG.FIELDS.PROVIDER, '3');
            rec.setFieldValue(CONFIG.FIELDS.TRANSACTION_TYPE, '1');
            rec.setFieldValue(CONFIG.FIELDS.DATE_SENT_TO_OCR, getISTDateTime());
            rec.setFieldValue(CONFIG.FIELDS.SUBSIDIARY, subsidiary);
            rec.setFieldValue(CONFIG.FIELDS.FILE_ID, file.id);

            var recordId = nlapiSubmitRecord(rec);
            try {
                nlapiAttachRecord('file', file.id, CONFIG.RECORD_TYPE, recordId);
                nlapiLogExecution('DEBUG', logTitle, `Created record ${recordId} with file ${file.name} (ID: ${file.id})`);
            } catch (attachErr) {
                nlapiLogExecution('ERROR', logTitle, `Error attaching file ${file.name} to record ${recordId}: ${attachErr.toString()}`);
            }
            recordIds.push(recordId);
        } catch (recErr) {
            nlapiLogExecution('ERROR', logTitle, `Error creating record for file ${file.name}: ${recErr.toString()}`);
        }
    });
    return recordIds;
}

/**
 * Forwards supported attachments to Nanonets.
 * @param {Object} emailDetails - Email details
 * @param {string} author - Author ID for sending email
 * @param {string} inboxEmail - Nanonets inbox email
 */
function forwardToNanonets(emailDetails, author, inboxEmail) {
    if (!isValidString(author) || !isValidString(inboxEmail) || !isValidString(emailDetails.subject)) {
        nlapiLogExecution('ERROR', logTitle, `Cannot forward to Nanonets: Missing fields (author: ${author}, inboxEmail: ${inboxEmail}, subject: ${emailDetails.subject})`);
        return;
    }

    var nanonetsAttachments = emailDetails.attachments.filter(file => 
        CONFIG.NANONETS_FILE_TYPES.includes((file.getType() || '').toLowerCase())
    );
    nlapiLogExecution('DEBUG', logTitle, `Nanonets Attachments (${nanonetsAttachments.length}): ${JSON.stringify(nanonetsAttachments.map((file, i) => ({
        index: i,
        name: file.getName() || 'Unnamed',
        type: file.getType() || 'Unknown'
    })))}`);

    if (nanonetsAttachments.length > 0) {
        try {
            nlapiSendEmail(
                author,
                inboxEmail,
                `Fwd: ${emailDetails.subject}`,
                emailDetails.textBody, // Use textBody to avoid HTML issues
                null,
                null,
                null,
                nanonetsAttachments
            );
            nlapiLogExecution('DEBUG', logTitle, `Forwarded ${nanonetsAttachments.length} attachments to Nanonets`);
        } catch (emailErr) {
            nlapiLogExecution('ERROR', logTitle, `Error forwarding email to Nanonets: ${emailErr.toString()}`);
        }
    } else {
        nlapiLogExecution('DEBUG', logTitle, 'No Nanonets-supported attachments to forward.');
    }
}

/**
 * Gets the current date and time in IST.
 * @returns {string} Formatted IST datetime
 */
function getISTDateTime() {
    var nowUTC = new Date();
    nowUTC.setMinutes(nowUTC.getMinutes() + CONFIG.IST_OFFSET_MINUTES);
    return nlapiDateToString(nowUTC, 'datetimetz');
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
        nlapiLogExecution('ERROR', logTitle, `Error in license search: ${e.toString()}`);
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
            nlapiLogExecution('DEBUG', logTitle, `Subsidiary Config Results: ${subsidiaryData.length}`);
        }
    } catch (e) {
        nlapiLogExecution('ERROR', logTitle, `Error in subsidiary search: ${e.toString()}`);
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