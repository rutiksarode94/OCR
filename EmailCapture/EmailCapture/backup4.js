/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LST Email Capture Plugin (emaillcapture_for_record.js)
 *
 * Version:         1.0.0   -   14-Jul-2025  -RS   Initial Development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This script processes an incoming email with attachments, saves them to the file cabinet,
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

function process(email) {
    try {
        var accountId = nlapiGetContext().getCompany();
        nlapiLogExecution('DEBUG', logTitle, 'Account ID: ' + accountId);
        // Get email details
        var fromAddress = email.getFrom() || '';
        nlapiLogExecution('DEBUG', logTitle, 'Sender: ' + fromAddress);

        var toAddress = email.getTo() || [];
        nlapiLogExecution('DEBUG', logTitle, 'Recipient (raw): ' + JSON.stringify(toAddress));

        var netsuiteEmail = '';
        var toAddresses = [];
        if (toAddress.length > 0) {
            for (var i = 0; i < toAddress.length; i++) {
                var emailAddr = '';
                if (typeof toAddress[i] === 'string') {
                    emailAddr = toAddress[i];
                } else if (toAddress[i] && typeof toAddress[i] === 'object') {
                    if (toAddress[i].email) {
                        emailAddr = toAddress[i].email;
                    } else if (toAddress[i].getAddress) {
                        emailAddr = toAddress[i].getAddress();
                    } else {
                        nlapiLogExecution('ERROR', logTitle, 'Invalid toAddress format at index ' + i + ': ' + JSON.stringify(toAddress[i]));
                        continue;
                    }
                } else {
                    nlapiLogExecution('ERROR', logTitle, 'Invalid toAddress format at index ' + i + ': ' + JSON.stringify(toAddress[i]));
                    continue;
                }
                nlapiLogExecution('DEBUG', logTitle, 'Processing toAddress[' + i + ']: ' + emailAddr);
                if (isValidString(emailAddr) && emailAddr.indexOf('.email.netsuite.com') !== -1) {
                    netsuiteEmail = emailAddr;
                }
                toAddresses.push(emailAddr);
            }
        }
        nlapiLogExecution('DEBUG', logTitle, 'NetsuiteEmail: ' + netsuiteEmail);
        nlapiLogExecution('DEBUG', logTitle, 'To Addresses: ' + toAddresses.join(', '));

        var ccList = email.getCc() || [];
        nlapiLogExecution('DEBUG', logTitle, 'CC List (raw): ' + JSON.stringify(ccList));
        var ccAddresses = [];
        if (ccList.length > 0) {
            for (var j = 0; j < ccList.length; j++) {
                var ccEmailAddr = '';
                if (typeof ccList[j] === 'string') {
                    ccEmailAddr = ccList[j];
                } else if (ccList[j] && typeof ccList[j] === 'object') {
                    if (ccList[j].email) {
                        ccEmailAddr = ccList[j].email;
                    } else if (ccList[j].getAddress) {
                        ccEmailAddr = ccList[j].getAddress();
                    } else {
                        nlapiLogExecution('ERROR', logTitle, 'Invalid ccAddress format at index ' + j + ': ' + JSON.stringify(ccList[j]));
                        continue;
                    }
                } else {
                    nlapiLogExecution('ERROR', logTitle, 'Invalid ccAddress format at index ' + j + ': ' + JSON.stringify(ccList[j]));
                    continue;
                }
                if (isValidString(ccEmailAddr)) {
                    ccAddresses.push(ccEmailAddr);
                }
            }
        }
        nlapiLogExecution('DEBUG', logTitle, 'CC Addresses: ' + ccAddresses.join(', '));

        var subject = email.getSubject() || '';
        nlapiLogExecution('DEBUG', logTitle, 'Subject: ' + subject);

        var emailDate = email.getSentDate();
        nlapiLogExecution('DEBUG', logTitle, 'Email Date: ' + emailDate);

        var textBody = email.getTextBody() || '';
        var htmlBody = email.getHtmlBody() || '';
        nlapiLogExecution('DEBUG', logTitle, 'Text Body: ' + textBody);
        nlapiLogExecution('DEBUG', logTitle, 'HTML Body: ' + htmlBody);

        var attachments = email.getAttachments() || [];
        nlapiLogExecution('DEBUG', logTitle, 'Attachments Count: ' + attachments.length);

        var subsidiaryData = getSubsidiary(netsuiteEmail);
        nlapiLogExecution('DEBUG', logTitle, 'Subsidiary Data (' + subsidiaryData.length + '): ' + JSON.stringify(subsidiaryData));

        var licenseRec = checkClientLicense(accountId);
        nlapiLogExecution('DEBUG', logTitle, 'License Record: ' + JSON.stringify(licenseRec));

        var licenseStatus = licenseRec && licenseRec.length > 0 ? licenseRec[0].licenseStatus : '';
        nlapiLogExecution('DEBUG', logTitle, 'License Status: ' + licenseStatus);

        var licenseExpiredStatus = licenseRec && licenseRec.length > 0 ? licenseRec[0].licenseExpiredStatus : '';
        nlapiLogExecution('DEBUG', logTitle, 'License Expired Status: ' + licenseExpiredStatus);

        if (licenseStatus !== 'F' && licenseExpiredStatus !== 'T') {
            nlapiLogExecution('DEBUG', logTitle, 'Client license is active. License Status: ' + licenseStatus);

            if (subsidiaryData.length > 0) {
                var folderId = subsidiaryData[0].folderId;
                var author = subsidiaryData[0].employee;
                var inboxEmail = subsidiaryData[0].inboxEmail;

                nlapiLogExecution('DEBUG', logTitle, 'Folder ID: ' + folderId);

                // Save attachments to File Cabinet and create vendor bill records
                var fileIds = [];
                if (attachments.length > 0) {
                    for (var i = 0; i < attachments.length; i++) {
                        try {
                            var file = attachments[i];
                            var filetype = file.getType();
                            var fileName = file.getName();
                            file.setFolder(folderId);
                            var fileId = nlapiSubmitFile(file);
                            if (isValidString(fileId)) {
                                fileIds.push({
                                    id: fileId,
                                    type: filetype,
                                    name: fileName
                                });
                            } else {
                                nlapiLogExecution('ERROR', logTitle, 'Failed to upload file: ' + fileName);
                            }
                        } catch (fileErr) {
                            nlapiLogExecution('ERROR', logTitle, 'Error uploading file ' + (file.getName() || 'Unnamed') + ': ' + fileErr.toString());
                        }
                    }
                }
                nlapiLogExecution('DEBUG', logTitle, 'File IDs (' + fileIds.length + '): ' + JSON.stringify(fileIds));

                // Create a vendor bill record for each file
                var vendorBillRecordIds = [];
                for (var f = 0; f < fileIds.length; f++) {
                    try {
                        var vendorBillRec = nlapiCreateRecord('customrecord_lstcptr_vendor_bill_process');
                        vendorBillRec.setFieldValue('custrecord_lstcptr_recipient_email', toAddresses.toString());
                        vendorBillRec.setFieldValue('custrecord_lstcptr_original_email', fromAddress);
                        vendorBillRec.setFieldValue('custrecord_lstcptr_email_subject', subject);
                        vendorBillRec.setFieldValue('custrecord_lstcptr_email_body_html_text', htmlBody);
                        vendorBillRec.setFieldValue('custrecord_lstcptr_email_body_plane_text', textBody);
                        vendorBillRec.setFieldValue('custrecord_lstcptr_created_by_email', 'T');
                        vendorBillRec.setFieldValue('custrecord_lstcptr_tran_status', '2');
                        vendorBillRec.setFieldValue('custrecord_lstcptr_process_status', '2');
                        vendorBillRec.setFieldValue('custrecord_lstcptr_provider', '3');
                        vendorBillRec.setFieldValue('custrecord_lstcptr_transaction_type', '1');
                        vendorBillRec.setFieldValue('custrecord_lstcptr_date_sent_to_ocr', getISTDateTime());
                        vendorBillRec.setFieldValue('custrecord_lstcptr_subsidiary', subsidiaryData[0].subsidiary);
                        vendorBillRec.setFieldValue('custrecord_lstcptr_pdf_file', fileIds[f].id);
                        vendorBillRec.setFieldValue('custrecord_lstcptr_file_id', fileIds[f].id);
                        // Note: Removed redundant custrecord_lstcptr_email_pdf_attachment field for simplicity

                        // Submit vendor bill record
                        var vendorBillRecordId = nlapiSubmitRecord(vendorBillRec);
                        nlapiLogExecution('DEBUG', logTitle, 'Vendor Bill Record Created for file ' + fileIds[f].name + '. Record ID: ' + vendorBillRecordId);

                        // Attach file to vendor bill record
                        try {
                            nlapiAttachRecord(
                                'file',
                                fileIds[f].id,
                                'customrecord_lstcptr_vendor_bill_process',
                                vendorBillRecordId
                            );
                            nlapiLogExecution('DEBUG', logTitle, 'File attached to Vendor Bill Record. File ID: ' + fileIds[f].id + ', Record ID: ' + vendorBillRecordId);
                        } catch (attachErr) {
                            nlapiLogExecution('ERROR', logTitle, 'Error attaching file ' + fileIds[f].name + ' to record ' + vendorBillRecordId + ': ' + attachErr.toString());
                        }

                        vendorBillRecordIds.push(vendorBillRecordId);
                    } catch (recErr) {
                        nlapiLogExecution('ERROR', logTitle, 'Error creating vendor bill record for file ' + fileIds[f].name + ': ' + recErr.toString());
                    }
                }
                nlapiLogExecution('DEBUG', logTitle, 'Created Vendor Bill Records: ' + vendorBillRecordIds.join(', '));

                // Forward email to Nanonets
                if (isValidString(author) && isValidString(inboxEmail) && isValidString(subject)) {
                    // Filter attachments for Nanonets-supported file types (PDF, JPG, PNG)
                    var nanonetsAttachments = attachments.filter(function (file) {
                        var fileType = (file.getType() || '').toLowerCase();
                        return ['pdf', 'jpg', 'jpeg', 'png'].indexOf(fileType) !== -1;
                    });

                    // Log details of attachments being forwarded
                    var forwardedAttachmentDetails = nanonetsAttachments.map(function (file, index) {
                        return {
                            index: index,
                            name: file.getName() || 'Unnamed',
                            type: file.getType() || 'Unknown'
                        };
                    });
                    nlapiLogExecution('DEBUG', logTitle, 'Forwarding Attachments to Nanonets (' + nanonetsAttachments.length + '): ' + JSON.stringify(forwardedAttachmentDetails));

                    if (nanonetsAttachments.length > 0) {
                        try {
                            nlapiSendEmail(
                                author,
                                inboxEmail,
                                'Fwd: ' + subject,
                                textBody, // Use textBody only to avoid HTML/plain text issues
                                null,
                                null,
                                null,
                                nanonetsAttachments
                            );
                            nlapiLogExecution('DEBUG', logTitle, 'Email forwarded to Nanonets with ' + nanonetsAttachments.length + ' attachments.');
                        } catch (emailErr) {
                            nlapiLogExecution('ERROR', logTitle, 'Error forwarding email to Nanonets: ' + emailErr.toString());
                        }
                    } else {
                        nlapiLogExecution('DEBUG', logTitle, 'No Nanonets-supported attachments to forward.');
                    }
                } else {
                    nlapiLogExecution('ERROR', logTitle, 'Email not forwarded: Missing required fields (author: ' + author + ', inboxEmail: ' + inboxEmail + ', subject: ' + subject + ')');
                }
            } else {
                nlapiLogExecution('DEBUG', logTitle, 'No subsidiary configuration found for email: ' + netsuiteEmail);
            }
        } else {
            nlapiLogExecution('ERROR', logTitle, 'Client license is not active or has expired. License Status: ' + licenseStatus + ', License Expired Status: ' + licenseExpiredStatus);
        }
    } catch (err) {
        nlapiLogExecution('ERROR', logTitle + ' (Main Process)', 'Error: ' + JSON.stringify(err));
    }
}

function getISTDateTime() {
    var nowUTC = new Date();
    // Add 330 minutes (5 hours 30 minutes) for IST
    nowUTC.setMinutes(nowUTC.getMinutes() + 330); // Corrected from 750 to 330
    return nlapiDateToString(nowUTC, 'datetimetz');
}

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

        if (searchResults && searchResults.length > 0) {
            for (var i = 0; i < searchResults.length; i++) {
                licenseData.push({
                    id: searchResults[i].getValue('internalid'),
                    licenseStatus: searchResults[i].getValue('custrecord_lstcptr_client_license_status'),
                    licenseExpiredStatus: searchResults[i].getValue('custrecord_lstcptr_client_expire_license'),
                });
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', logTitle, 'Error in license search: ' + e.message);
    }

    return licenseData;
}

function getSubsidiary(netsuiteEmail) {
    var logTitle = 'getSubsidiary';
    var subsidiaryData = [];
    try {
        if (isValidString(netsuiteEmail)) {
            var subsidiaryConfigSearchResults = nlapiCreateSearch(
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
            ).runSearch().getResults(0, 1);
            nlapiLogExecution('DEBUG', logTitle, 'subsidiaryConfigSearchResults: ' + subsidiaryConfigSearchResults.length);
            if (subsidiaryConfigSearchResults.length > 0) {
                for (var i = 0; i < subsidiaryConfigSearchResults.length; i++) {
                    subsidiaryData.push({
                        id: subsidiaryConfigSearchResults[i].getValue('internalid'),
                        subsidiary: subsidiaryConfigSearchResults[i].getValue('custrecord_lstcptr_sub_config_subsidiary'),
                        inboxEmail: subsidiaryConfigSearchResults[i].getValue('custrecord_lstcptr_sub_order_inbox_email'),
                        folderId: subsidiaryConfigSearchResults[i].getValue('custrecord_lstcptr_sub_con_folder_id'),
                        employee: subsidiaryConfigSearchResults[i].getValue('custrecord_lstcptr_outbound_user')
                    });
                }
            }
        }
    } catch (e) {
        nlapiLogExecution('ERROR', logTitle + ' (getSubsidiary) Error', JSON.stringify(e));
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