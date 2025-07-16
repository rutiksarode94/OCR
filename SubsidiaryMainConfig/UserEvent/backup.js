/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:           LSTCapture Subsidiary Configuration UE (lstcptr_subsidiary_configuration_ue.js)
*
* Version:         2.1.1   -   [Current Date]   -   PB.     -   Updated to auto-set folder ID from main configuration.
*
* Author:          LiveStrong Technologies
*
* Purpose:         The purpose of this script is to populate the custom form into sales order form field and auto-set folder ID from main configuration.
*
* Script:          customscript_lstcptr_subsidiary_con_ue
* Deploy:          customdeploy_lstcptr_subsidiary_con_ue
*
* Notes:
* 
* Dependencies:
*
* Libraries:
*************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @FileName lstcptr_subsidiary_configuration_ue.js
 */
define(['N/search', 'N/record', 'N/runtime', 'N/ui/serverWidget'],
    /**
     * @param {search} search
     * @param {record} record 
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     */
    function (search, record, runtime, serverWidget) 
    {
        var strDebugTitle = 'lstcptr_subsidiary_configuration_ue';
        var strDebugMsg = '';

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {string} context.type - Trigger type 
         * @param {Form} context.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(context) 
        {
            try 
            {
                var strType = context.type;
                var objRecord = context.newRecord;
                var nRecType = objRecord.type;
                var objForm = context.form;
                var nUserObj = runtime.getCurrentUser();
                var nUserId = nUserObj.id;
                var nUserRoleId = nUserObj.role;
                strDebugMsg = 'Type [' + strType + ']; Rec Type [' + nRecType + ']; User ID [' + nUserId + ']; User Role ID [' + nUserRoleId + ']';
                log.debug({ title: strDebugTitle, details: strDebugMsg });

                objForm.addField({
                    id: 'custpage_lstcptr_configured_subsidiaries',
                    type: serverWidget.FieldType.LONGTEXT,
                    label: 'Configured Subsidiaries'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN 
                });

                if (strType == context.UserEventType.CREATE || strType == context.UserEventType.COPY || strType == context.UserEventType.EDIT) 
                {
                    try 
                    {
                        // Get the selected main configuration record ID
                        var mainConfigRecordId = objRecord.getValue({ fieldId: 'custrecord_lstcptr_sub_con_main_config' });

                        if (mainConfigRecordId) 
                        {
                            // Retrieve the folder internal ID from the main configuration record
                            var folderInternalId = getFolderInternalIdFromMainConfig(mainConfigRecordId);
                            log.debug("Folder Internal ID from Main Config: ", folderInternalId);

                            // Set the folder internal ID in the subsidiary configuration record
                            objRecord.setValue({
                                fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                                value: folderInternalId
                            });
                        }

                        objForm.clientScriptFileId = getClientScriptID('lstcptr_subsidiary_con_cs.js');
                        log.debug("Client Script Id: ", objRecord.clientScriptFileId);

                    } catch (err) {
                        log.error({ title: strDebugTitle, details: JSON.stringify({ code: err.name, message: err.message}) });
                    }
                }

                if(strType == context.UserEventType.EDIT)
                {
                    objForm.getField({
                        id: 'custrecord_lstcptr_sub_config_subsidiary'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });

                    objForm.getField({
                        id: 'custrecord_lstcptr_sub_con_main_config'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                }

            } catch (err) {
                log.error({ title: strDebugTitle + " (beforeLoad) Error", details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }

        /**
         * Retrieves the folder internal ID from a specific main configuration record
         * @param {String} mainConfigId - The internal ID of the main configuration record
         * @returns {String} - The folder internal ID
         */
        function getFolderInternalIdFromMainConfig(mainConfigId) 
        {
            var rtnData = '';
            try 
            {
                var mainConfigSearch = search.create({
                    type: 'customrecord_lstcptr_main_configuration',
                    filters: [
                        ['internalid', 'anyof', mainConfigId]
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_folder_internal_id', label: 'Folder ID' })
                    ]
                });

                var searchResult = mainConfigSearch.run().getRange(0, 1);

                if (searchResult.length > 0) {
                    rtnData = searchResult[0].getValue({ name: 'custrecord_lstcptr_folder_internal_id' });
                }

            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFolderInternalIdFromMainConfig) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }

        /**
         * Defines the function to get the internal ID of a client script by name
         * @param {String} fileName - The name of the client script file
         * @returns {String} - Returns the internal ID of the client script file
         * since 2015.2
         */
        function getClientScriptID(fileName) 
        { 
            var rtnData = '';
            try 
            {
                var fileSearch = search.create({
                    type: "file",
                    filters: 
                    [
                        ['name', 'is', fileName]
                    ],
                    columns: 
                    [
                        search.createColumn({ name: 'internalid', label: "Internal ID" })
                    ]
                });

                var resultSet = fileSearch.run();
                var results = resultSet.getRange({ start: 0, end: 1 });
                if (results.length > 0) {
                    rtnData = results[0].getValue({ name: 'internalid' });
                } 
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getClientScriptID) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }

        return {
            beforeLoad: beforeLoad,
        };
    });