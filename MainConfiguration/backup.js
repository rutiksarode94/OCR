/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Main Configuration UE (lstcptr_main_config_ue.js)
*
* Version:         1.0.0   -   [Current Date]   -   RS.     -   Initial Developement
*
* Author:          LiveStrong Technologies
*
* Purpose:         The purpose of this script is to set the default values for the main configuration record and show the folder internal ID in view mode.
*
* Script:          customscript_lstcptr_main_config_ue
* Deploy:          customdeploy_lstcptr_main_config_ue 
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
 * @FileName lstcptr_main_config_ue.js.js
 */
define(['N/file', 'N/search', 'N/runtime', 'N/ui/serverWidget'],
    /**
     * @param {file} file 
     * @param {search} search
     * @param {runtime} runtime
     * @param {serverWidget} serverWidget
     */
    function (file, search, runtime, serverWidget) {
        var strDebugTitle = 'lstcptr_main_configuration';
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
        function beforeLoad(context) {
            try {
                var strType = context.type;
                var objRecord = context.newRecord;
                var objForm = context.form;
                var nRecType = objRecord.type;
                var nUserObj = runtime.getCurrentUser();
                var nUserId = nUserObj.id;
                var nUserRoleId = nUserObj.role;
                strDebugMsg = 'Type [' + strType + ']; Rec Type [' + nRecType + ']; User ID [' + nUserId + ']; User Role ID [' + nUserRoleId + ']';
                log.debug({ title: strDebugTitle, details: strDebugMsg });

                if (strType == context.UserEventType.CREATE || strType == context.UserEventType.COPY || strType == context.UserEventType.EDIT) {
                    try {
                        // Create dropdown for folder selection in edit modes
                        var folderField = objForm.addField({ id: 'custpage_lstcptr_folder_dropdown', type: serverWidget.FieldType.SELECT, label: 'Folder Internal ID' });
                        objForm.getField({ id: 'custrecord_lstcptr_folder_internal_id' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                        var folderOptions = getFolders();
                        folderField.addSelectOption({ value: '', text: '' });
                        objForm.insertField({ field: folderField, nextfield: 'custrecord_lstcptr_folder_internal_id' });

                        folderOptions.forEach(function (folder) {
                            folderField.addSelectOption({
                                value: folder.internalid,
                                text: folder.name,
                                isSelected: folder.internalid == objRecord.getValue('custrecord_lstcptr_folder_internal_id')
                            });
                        });

                        folderField.isMandatory = true;

                        // Set default template files and other values
                        var htmlTemplates = getTemplateFileId();
                        log.debug("HTML Template file IDs: ", htmlTemplates);
                        if (isValidString(htmlTemplates.template1_id) && isValidString(htmlTemplates.template2_id)) {
                            try {
                                objRecord.setValue({ fieldId: 'custrecord_lstcptr_html_temp_1', value: htmlTemplates.template1_id });
                                objRecord.setValue({ fieldId: 'custrecord_lstcptr_html_temp_2', value: htmlTemplates.template2_id });
                            } catch (e) {
                                log.error({ title: strDebugTitle, details: 'Error setting template IDs: ' + e.message });
                            }
                        }

                        objRecord.setValue({ fieldId: 'custrecord_lstcptr_bill_split_creation', value: true });

                    } catch (err) {
                        log.error({ title: strDebugTitle, details: JSON.stringify({ code: err.name, message: err.message }) });
                    }
                }
                else if (strType == context.UserEventType.VIEW) {
                    try {
                        // In view mode, show the folder internal ID value
                        var folderInternalId = objRecord.getValue({ fieldId: 'custrecord_lstcptr_folder_internal_id' });
                        if (folderInternalId) {
                            // Add a label or field to display the folder ID
                            var displayField = objForm.addField({
                                id: 'custpage_lstcptr_folder_display',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Folder Internal ID (View Only)'
                            });

                            // Set the HTML content to display the folder ID
                            displayField.defaultValue = '<div style="padding: 10px; background-color: #f0f0f0;">Folder Internal ID: ' + folderInternalId + '</div>';
                            displayField.updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.NORMAL
                            });

                            // Optionally hide the original hidden field if not needed
                            objForm.getField({ id: 'custrecord_lstcptr_folder_internal_id' }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
                            objForm.removeField({ id: 'custpage_lstcptr_folder_dropdown' }); // Remove dropdown if it exists
                        }
                        else {
                            log.debug("No folder internal ID found in view mode.");
                        }

                    } catch (err) {
                        log.error({ title: strDebugTitle + ' (View Mode) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                    }
                }

            } catch (err) {
                log.error({ title: strDebugTitle + ' (beforeLoad) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Function to be executed immediately after a write operation on a record
         * @param {Object} context
         * @param {String} context.type - Current record type
         * @param {Record} context.newRecord - The new record
         * @param {UserEventType} context.UserEventType - The record is being accessed (approve)
         * @since 2015.2
         */
        function beforeSubmit(context) {
            if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {
                try {
                    var newRecord = context.newRecord;
                    var selectedFolderValue = newRecord.getValue({ fieldId: 'custpage_lstcptr_folder_dropdown' });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_folder_internal_id', value: selectedFolderValue });
                } catch (err) {
                    log.error({ title: strDebugTitle + ' (beforeSubmit) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                }
            }
        }

        /**
         * Defines the function to get all folders
         * @returns {Array} - Returns an array of folders
         * since 2015.2
         */
        // function getFolders() 
        // {
        //     var rtnData = [];
        //     try {
        //         var folderSearch = search.create({
        //             type: search.Type.FOLDER,
        //             filters: [],
        //             columns: [
        //                 search.createColumn({ name: 'internalid' }),
        //                 search.createColumn({ name: 'name', sort: search.Sort.ASC })
        //             ]
        //         });

        //         var resultSet = folderSearch.run();
        //         resultSet.each(function(result) {
        //             rtnData.push({
        //                 internalid: result.getValue('internalid'),
        //                 name: result.getValue('name')
        //             });
        //             return true;
        //         });
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (getFolders)', details: JSON.stringify({ code: err.name, message: err.message}) });
        //     }
        //     return rtnData;
        // }
        function getFolders() {
            var rtnData = [];
            try {
                var folderSearch = search.create({
                    type: search.Type.FOLDER,
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'internalid' }),
                        search.createColumn({ name: 'name', sort: search.Sort.ASC })
                    ]
                });

                var start = 0;
                var pageSize = 1000; // Maximum page size allowed by getRange
                var hasMore = true;

                while (hasMore) {
                    var resultSet = folderSearch.run();
                    var results = resultSet.getRange({ start: start, end: start + pageSize });

                    if (results.length === 0) {
                        hasMore = false;
                        break;
                    }

                    results.forEach(function (result) {
                        rtnData.push({
                            internalid: result.getValue('internalid'),
                            name: result.getValue('name')
                        });
                    });

                    start += pageSize;
                    // Optional: Limit the number of folders to avoid overwhelming the dropdown
                    if (rtnData.length >= 10000) { // Example limit
                        log.debug({ title: strDebugTitle + ' (getFolders)', details: 'Reached maximum folder limit of 10,000' });
                        hasMore = false;
                    }
                }

                log.debug({ title: strDebugTitle + ' (getFolders)', details: 'Retrieved ' + rtnData.length + ' folders' });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFolders)', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        /**
         * Defines the function to get the internal ID of a template file by name
         * @returns {String} - Returns the internal ID of the template file
         * since 2015.2
         */
        function getTemplateFileId() {
            var rtnData = { "template1_id": "", "template2_id": "" };
            try {
                var fileSearch = search.create({
                    type: "file",
                    filters: [
                        ["name", "is", "vendor_bill_to_process_html.html"],
                        "OR",
                        ["name", "is", "splitScreenSuitelet.html"]
                    ],
                    columns: [
                        search.createColumn({ name: 'name', label: "Name" }),
                        search.createColumn({ name: 'internalid', label: "Internal ID" })
                    ]
                });

                var resultSet = fileSearch.run();
                var results = resultSet.getRange({ start: 0, end: 1000 });
                results.forEach(function (result) {
                    var fileName = result.getValue({ name: 'name' });
                    var fileId = result.getValue({ name: 'internalid' });
                    if (fileName == 'vendor_bill_to_process_html.html') {
                        rtnData.template1_id = fileId;
                    } else if (fileName == 'splitScreenSuitelet.html') {
                        rtnData.template2_id = fileId;
                    }
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getTemplateFileId) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        /**
         * Helper function to check if a string is valid (non-empty and not null).
         * @param {string} value - String to be checked
         * @returns {boolean} True if the string is valid, false otherwise
         */
        function isValidString(value) {
            if (value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN)
                return true;
            else
                return false;
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit
        };
    });