/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Send Mail CS (lstcptr_send_email_cs.js)
 *
 * Version:         1.0.0   -   17-July-2025 - RS - Initial Developement
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This client script sends an email to the support team when the OrderPilot license is expired or inactive, including license details.
 *
 * Script:          customscript_lstcptr_send_email_cs
 * Deploy:          customdeploy_lstcptr_send_email_cs
 *
 * Dependencies:    ./lstcptr_constants.js
 *
 * Libraries:       N/email, N/ui/message, N/runtime
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/email', 'N/ui/message', 'N/runtime', './lstcptr_constants'], function (email, message, runtime, constants) {
    const debugTitle = constants.CLIENT_LICENSE_CS_DEBUG_TITLE;
    const SUPPORT_EMAIL = constants.SUPPORT_EMAIL; 

    function pageInit() {
        log.debug({ title: `${debugTitle} - Page Init`, details: 'Script Started' });
    }

    function sendEmail() {
        try {
            // Retrieve field values
            const fieldIds = [
                { id: constants.CUSTOM_FIELDS.ACCOUNT_ID, name: 'Account ID' },
                { id: constants.CUSTOM_FIELDS.LICENSE_KEY, name: 'License Key' },
                { id: constants.CUSTOM_FIELDS.BUNDLE_ID, name: 'Bundle ID' },
                { id: constants.CUSTOM_FIELDS.PRODUCT_NAME, name: 'Product Name' },
                { id: constants.CUSTOM_FIELDS.PRODUCT_VERSION, name: 'Bundle Version' }
            ];

            const fieldValues = {};
            for (const field of fieldIds) {
                const element = document.getElementById(`${field.id}_val`);
                if (!element) {
                    throw new Error(`Field ${field.name} not found in the form.`);
                }
                fieldValues[field.id] = element.innerText || '';
            }

            // Construct email body
            const emailBody = `Dear Support Team,\n\nThe OrderPilot license is either expired or inactive. Please assist with reactivating or renewing the license.\n\n` +
                `Account ID: ${fieldValues[constants.CUSTOM_FIELDS.ACCOUNT_ID]}\n` +
                `License Key: ${fieldValues[constants.CUSTOM_FIELDS.LICENSE_KEY]}\n` +
                `Bundle ID: ${fieldValues[constants.CUSTOM_FIELDS.BUNDLE_ID]}\n` +
                `Product Name: ${fieldValues[constants.CUSTOM_FIELDS.PRODUCT_NAME]}\n` +
                `Bundle Version: ${fieldValues[constants.CUSTOM_FIELDS.PRODUCT_VERSION]}\n\n` +
                `Thank you,\n${runtime.getCurrentUser().name}`;

            email.send({
                author: runtime.getCurrentUser().id,
                recipients: SUPPORT_EMAIL,
                subject: 'OrderPilot License Issue',
                body: emailBody
            });

            log.debug({ title: `${debugTitle} - Send Email`, details: 'Email sent successfully' });

            showMessage({
                type: message.Type.CONFIRMATION,
                title: 'Email Sent',
                message: 'Email successfully sent to support.'
            });
        } catch (e) {
            log.error({ title: `${debugTitle} - Email Error`, details: e.message });
            showMessage({
                type: message.Type.ERROR,
                title: 'Email Error',
                message: `Failed to send email: ${e.message}`
            });
        }
    }

    function showMessage(options) {
        const msg = message.create(options);
        msg.show();
        setTimeout(() => msg.hide(), 5000);
    }

    return {
        pageInit: pageInit,
        sendEmail: sendEmail
    };
});