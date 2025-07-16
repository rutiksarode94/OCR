/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            Redirect to Split Screen on View(called_suitelet_on_view.js)
*
* Version:         2.1.0   -   12-March-2025 -      
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script is used to redirect splitscreen suitelet when user try to view record.
*
* Script:          customscript_lst_called_suitelet_view_ue
* Deploy:          customdeploy_lst_called_suitelet_view_ue
*
*********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */

define(['N/record', 'N/log', 'N/url', 'N/redirect'], function(record, log, url, redirect) {
    function beforeLoad(context) {
        try {
            if (context.type !== context.UserEventType.VIEW) {
                return;
            }

            var recordId = context.newRecord.id;

            // Redirect user to the Suitelet when they try to view the record
            redirect.toSuitelet({
                scriptId: 'customscript_lstcptr_split_screen_su',  // Your Suitelet Script ID
                deploymentId: 'customdeploy_lstcptr_split_screen_su',  // Your Suitelet Deployment ID
                parameters: {
                    internalId: recordId
                }
            });

            log.debug("Redirecting to Suitelet", "Record ID: " + recordId);

        } catch (e) {
            log.error("Failed to redirect to Suitelet", e.message);
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});
