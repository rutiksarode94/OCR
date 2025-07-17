/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Send Mail CS (lstcptr_send_email_cs.js)
*
* Version:         1.0.0   -   14-Apr-2025  -   Initial Development
*
* Author:          LiveStrong Technologies
*
* Purpose:         This client script validates the license start date and end date and updates the license status based on the specified dates.
*
* Script:          customscript_lstcptr_send_email_cs
* Deploy:          customdeploy_lstcptr_send_email_cs
* Notes:
*
* Dependencies:
*
* Libraries:
*************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @FileName lstcptr_liccense_cs.js
 */
define(['N/email', 'N/ui/message', 'N/runtime'], function (email, message, runtime) {
    var debugTitle = "PageInt Function"
    function pageInit() {
        log.debug(debugTitle, "Script Started");
    }
    function sendEmail() {
        try {
            email.send({
                author: runtime.getCurrentUser().id,
                recipients: 'rutik.sarode@lstconsultancy.com',
                subject: 'OrderPilot License Issue',
                body: 'Dear Support Team,\n\nThe OrderPilot license is either expired or inactive. Please assist with reactivating or renewing the license.\n\nAccount ID: ' +
                    document.getElementById('custpage_lstcptr_account_id_val').innerText +
                    '\nLicense Key: ' + document.getElementById('custpage_lstcptr_license_key_val').innerText +
                    '\nBundle Id: ' + document.getElementById('custpage_lstcptr_bundle_id_val').innerText +
                    '\nProduct Name: ' + document.getElementById('custpage_lstcptr_product_name_val').innerText +
                    '\nBundle Version: ' + document.getElementById('custpage_lstcptr_product_version_val').innerText +
                    '\n\nThank you,\n' + runtime.getCurrentUser().name
            });

            log.debug("Send Email Function", "Email Send Successfully");

            showMessage({
                type: message.Type.CONFIRMATION,
                title: 'Email Sent',
                message: 'Email successfully sent to support.'
            });
        } catch (e) {
            showMessage({
                type: message.Type.ERROR,
                title: 'Email Error',
                message: 'Failed to send email: ' + e.message
            });
        }
    }

    function showMessage(options) {
        var msg = message.create(options);
        msg.show();
        setTimeout(function () { msg.hide(); }, 5000);
    }

    return {
        pageInit: pageInit,
        sendEmail: sendEmail
    };
});