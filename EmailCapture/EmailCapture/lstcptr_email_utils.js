/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LST Email Utilities (lstcptr_email_utils.js)
 *
 * Version:         1.0.0   -   14-Jul-2025  -RS   Initial Development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Library of reusable functions for email processing, file handling, and record creation in NetSuite.
 *
 * Notes:           Designed for use with SuiteScript 1.0 scripts, such as email capture plugins.
 *                  Simplified for ES3 compatibility, added custrecord_lstcptr_pdf_file for Document field.
 *
 *********************************************************************************************/

var logTitle = 'lstcptr_email_utils';

/**
 * Configuration object for field IDs and constants.
 */
var CONFIG = {
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
        FILE_ID: 'custrecord_lstcptr_file_id',
        PDF_FILE: 'custrecord_lstcptr_pdf_file'
    },
    NANONETS_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png'],
    IST_OFFSET_MINUTES: 750 // 5 hours 30 minutes for IST
};

/**
 * Checks if a value is a valid string.
 * @param {any} value - Value to check
 * @returns {boolean} True if valid, false otherwise
 */
function isValidString(value) {
    return (value !== null && value !== undefined && value !== '' && value !== ' ' && value !== 'null' && value !== 'undefined' && value !== 'NaN');
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
                nlapiLogExecution('ERROR', logTitle, 'Invalid ' + logPrefix + ' at index ' + i);
                continue;
            }
        } else {
            nlapiLogExecution('ERROR', logTitle, 'Invalid ' + logPrefix + ' at index ' + i);
            continue;
        }
        if (isValidString(emailAddr)) {
            addresses.push(emailAddr);
        }
    }
    return addresses;
}

/**
 * Extracts email details (from, to, cc, subject, body, attachments).
 * @param {Object} email - The email object
 * @returns {Object} Email details
 */
function extractEmailDetails(email) {
    var fromAddress = email.getFrom() || '';
    var toAddresses = parseEmailAddresses(email.getTo() || [], 'toAddress');
    var netsuiteEmail = '';
    for (var i = 0; i < toAddresses.length; i++) {
        if (isValidString(toAddresses[i]) && toAddresses[i].indexOf('.email.netsuite.com') !== -1) {
            netsuiteEmail = toAddresses[i];
            break;
        }
    }
    var ccAddresses = parseEmailAddresses(email.getCc() || [], 'ccAddress');
    var subject = email.getSubject() || '';
    var textBody = email.getTextBody() || '';
    var htmlBody = email.getHtmlBody() || '';
    var attachments = email.getAttachments() || [];

    return {
        fromAddress: fromAddress,
        toAddresses: toAddresses,
        netsuiteEmail: netsuiteEmail,
        ccAddresses: ccAddresses,
        subject: subject,
        textBody: textBody,
        htmlBody: htmlBody,
        attachments: attachments
    };
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
                nlapiLogExecution('DEBUG', logTitle, 'Saved file: ' + fileName + ' (ID: ' + fileId + ')');
            } else {
                nlapiLogExecution('ERROR', logTitle, 'Failed to upload file: ' + fileName);
            }
        } catch (fileErr) {
            nlapiLogExecution('ERROR', logTitle, 'Error uploading file: ' + (attachments[i].getName() || 'Unnamed'));
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
    for (var i = 0; i < fileIds.length; i++) {
        try {
            var file = fileIds[i];
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
            rec.setFieldValue(CONFIG.FIELDS.PDF_FILE, file.id);

            var recordId = nlapiSubmitRecord(rec);
            try {
                nlapiAttachRecord('file', file.id, CONFIG.RECORD_TYPE, recordId);
                nlapiLogExecution('DEBUG', logTitle, 'Created record ' + recordId + ' with file ' + file.name + ' (ID: ' + file.id + ')');
            } catch (attachErr) {
                nlapiLogExecution('ERROR', logTitle, 'Error attaching file ' + file.name + ' to record ' + recordId);
            }
            recordIds.push(recordId);
        } catch (recErr) {
            nlapiLogExecution('ERROR', logTitle, 'Error creating record for file ' + file.name);
        }
    }
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
        nlapiLogExecution('ERROR', logTitle, 'Cannot forward to Nanonets: Missing fields');
        return;
    }

    var nanonetsAttachments = [];
    for (var i = 0; i < emailDetails.attachments.length; i++) {
        var file = emailDetails.attachments[i];
        if (CONFIG.NANONETS_FILE_TYPES.indexOf((file.getType() || '').toLowerCase()) !== -1) {
            nanonetsAttachments.push(file);
        }
    }
    nlapiLogExecution('DEBUG', logTitle, 'Nanonets Attachments: ' + nanonetsAttachments.length);

    if (nanonetsAttachments.length > 0) {
        try {
            nlapiSendEmail(
                author,
                inboxEmail,
                'Fwd: ' + emailDetails.subject,
                emailDetails.textBody,
                null,
                null,
                null,
                nanonetsAttachments
            );
            nlapiLogExecution('DEBUG', logTitle, 'Forwarded ' + nanonetsAttachments.length + ' attachments to Nanonets');
        } catch (emailErr) {
            nlapiLogExecution('ERROR', logTitle, 'Error forwarding email to Nanonets');
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
 * Expose library functions
*/
var library = {
    CONFIG: CONFIG,
    isValidString: isValidString,
    parseEmailAddresses: parseEmailAddresses,
    extractEmailDetails: extractEmailDetails,
    saveAttachments: saveAttachments,
    createVendorBillRecords: createVendorBillRecords,
    forwardToNanonets: forwardToNanonets,
    getISTDateTime: getISTDateTime
};

library;