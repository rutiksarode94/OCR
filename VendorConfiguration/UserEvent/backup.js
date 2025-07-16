/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Vendor Configuration UE (lstcptr_vendor_config_ue.js)
*
* Version:         1.0.0   -   19-Dec-2024  -   RS.     -   Initial development.
*
* Author:          LiveStrong Technologies
*
* Purpose:         The purpose of this script is to populate the dropdown list of locations based on the selected vendor and show custom segment list
*
* Script:          customscript_lstcptr_vendor_config_ue
* Deploy:          customdeploy_lstcptr_vendor_config_ue
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
 * @FileName lstcptr_vendor_config_ue.js
 */
define(['N/file', 'N/search', 'N/runtime', 'N/ui/serverWidget'], 
    /**
     * @param {file} file 
     * @param {search} search
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     */
    function(file, search, runtime, serverWidget) 
    {
        var strDebugTitle = 'lstcptr_vendor_config_ue';
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
                var objForm = context.form;
                var nRecType = objRecord.type;
                var nUserObj = runtime.getCurrentUser();
                var nUserId = nUserObj.id;
                var nUserRoleId = nUserObj.role;
                strDebugMsg = 'Type ['+ strType +']; Rec Type [' + nRecType + ']; User ID [' + nUserId + ']; User Role ID [' + nUserRoleId +']';
                log.debug({title: strDebugTitle, details: strDebugMsg });
    
                objForm.addField({
                    id: 'custpage_lstcptr_vendor_configured',
                    type: serverWidget.FieldType.LONGTEXT,
                    label: 'Configured Vendors'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
    
                try 
                {
                    if( strType == context.UserEventType.CREATE || strType == context.UserEventType.COPY || strType == context.UserEventType.EDIT) 
                    {
                        objForm.clientScriptFileId = getClientScriptID('lstcptr_vendor_config_cs.js');
                    }
    
                    if(strType == context.UserEventType.EDIT) 
                    {
                        objForm.getField({ id: 'custrecord_lstcptr_vendor_con_parent_ven' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
                    }
    
                } catch (err) {
                    log.error({ title: strDebugTitle, details: JSON.stringify({ code: err.name, message: err.message}) });
                }
                
            } catch (err) {
                log.error({ title: strDebugTitle + " (beforeLoad) Error", details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }

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