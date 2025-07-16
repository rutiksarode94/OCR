/*************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:           LSTCapture Subsidiary Configuration UE (lstcptr_subsidiary_configuration_ue.js)
 *
 * Version:         1.0.0   -   29-Oct-2024  -   RS.     -   Initial development.
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         The purpose of this script is to populate the custom form into sales order form field
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
define(['N/search', 'N/record', 'N/runtime', 'N/ui/serverWidget', './lstcptr_constants'],
    /**
     * @param {search} search
     * @param {record} record 
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     * @param {Object} constants
     */
    function (search, record, runtime, serverWidget, constants) 
    {
        var strDebugTitle = constants.SUBSIDIARY_CONFIG_UE_DEBUG_TITLE;
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
                    id: constants.CUSTOM_FIELDS.CONFIGURED_SUBSIDIARIES,
                    type: serverWidget.FieldType.LONGTEXT,
                    label: 'Configured Subsidiaries'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN 
                });
    
                if (strType == context.UserEventType.CREATE || strType == context.UserEventType.COPY || strType == context.UserEventType.EDIT) 
                {
                    try 
                    {
                        var mainConfigFolderID = getMainConfigFolderID();
                        log.debug("Main Configuration Folder Id: ", mainConfigFolderID);
                        objRecord.setValue({ fieldId: constants.SUBSIDIARY_CONFIG_FIELDS.FOLDER_ID, value: mainConfigFolderID });
                       
                        objForm.clientScriptFileId = getClientScriptID(constants.SCRIPT_FILES.SUBSIDIARY_CONFIG_CS);
                        log.debug("Client Script Id: ", objForm.clientScriptFileId);
    
                    } catch (err) {
                        log.error({ title: strDebugTitle, details: JSON.stringify({ code: err.name, message: err.message}) });
                    }
                }
    
                if (strType == context.UserEventType.EDIT)
                {
                    objForm.getField({
                        id: constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
    
                    objForm.getField({
                        id: constants.SUBSIDIARY_CONFIG_FIELDS.MAIN_CONFIG
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.DISABLED
                    });
                }
    
            } catch (err) {
                log.error({ title: strDebugTitle + " (beforeLoad) Error", details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        function getMainConfigFolderID()
        {
            var rtnData = '';
            try
            {
                var mainConfigRecord = search.create({
                    type: constants.RECORD_TYPES.MAIN_CONFIG,
                    filters: [],
                    columns: [
                        search.createColumn({ name: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID, label: 'Folder ID' }),
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC, label: 'Internal ID' })
                    ]
                }).run().getRange({ start: 0, end: 1 });
    
                if (mainConfigRecord.length > 0) {
                    rtnData = mainConfigRecord[0].getValue({ name: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID });
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getMainConfigFolderID) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
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
                        search.createColumn({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID, label: "Internal ID" })
                    ]
                });
    
                var resultSet = fileSearch.run();
                var results = resultSet.getRange({ start: 0, end: 1 });
                if (results.length > 0) {
                    rtnData = results[0].getValue({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID });
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