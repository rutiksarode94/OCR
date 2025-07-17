/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            Redirect to Split Screen on View(lstcptr_called_suitelet_on_view_ue.js)
*
* Version:         1.0.0   -   12-March-2025 -      
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

define(['N/record', 'N/log', 'N/url', 'N/redirect', './lstcptr_constants'], function(record, log, url, redirect, constant) {
    function beforeLoad(context) {
        var debugTitle = constant.STAGING_RECORD_SPLIT_ON_VIEW;
        try {
            log.debug(debugTitle+"Started");
            if (context.type !== context.UserEventType.VIEW) {
                return;
            }

            var recordId = context.newRecord.id;

            // Redirect user to the Suitelet when they try to view the record
            redirect.toSuitelet({
                scriptId: constant.STAGING_RECORD_SPLIT_SUITLET.SCRIPT_ID, 
                deploymentId: constant.STAGING_RECORD_SPLIT_SUITLET.DEPLOYMENT_ID,  
                parameters: {
                    internalId: recordId
                }
            });

            log.debug(debugTitle+"Redirecting to Suitelet", "Record ID: " + recordId);

        } catch (e) {
            log.error(debugTitle+"Failed to redirect to Suitelet", e.message);
        }
    }

    return {
        beforeLoad: beforeLoad
    };
});
