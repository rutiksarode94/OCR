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
* Dependencies:    ./lstcptr_constants
*
* Libraries:        N/file,N/search, N/ui/serverWidget
*************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 * @FileName lstcptr_main_config_ue.js.js
 */

define(['N/file', 'N/search', 'N/runtime', 'N/ui/serverWidget', './lstcptr_constants'],
    /**
     * @param {Object} file - NetSuite file module
     * @param {Object} search - NetSuite search module
     * @param {Object} runtime - NetSuite runtime module
     * @param {Object} serverWidget - NetSuite serverWidget module
     * @param {Object} constants - LSTCPTR constants module
     * @returns {Object} User Event Script functions
     */
    function (file, search, runtime, serverWidget, constants) {
        const strDebugTitle = constants.MAIN_CONFIG_UE_DEBUG_TITLE;

        /**
         * Triggered before the record is loaded. Sets up folder dropdown in create/edit modes and displays folder ID in view mode.
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {string} context.type - Trigger type
         * @param {Form} context.form - Current form
         */
        function beforeLoad(context) {
            try {
                const { type, newRecord, form } = context;
                const user = runtime.getCurrentUser();
                log.debug({
                    title: strDebugTitle,
                    details: `Type: ${type}; Record Type: ${newRecord.type}; User ID: ${user.id}; User Role ID: ${user.role}`
                });

                if ([context.UserEventType.CREATE, context.UserEventType.COPY, context.UserEventType.EDIT].includes(type)) {
                    // Create dropdown for folder selection
                    const folderField = form.addField({
                        id: constants.CUSTOM_FIELDS.FOLDER_DROPDOWN,
                        type: serverWidget.FieldType.SELECT,
                        label: 'Folder Internal ID'
                    });
                    form.getField({ id: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                    const folderOptions = getFolders();
                    folderField.addSelectOption({ value: '', text: '' });
                    form.insertField({ field: folderField, nextfield: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID });

                    folderOptions.forEach(folder => {
                        folderField.addSelectOption({
                            value: folder.internalid,
                            text: folder.name,
                            isSelected: folder.internalid == newRecord.getValue(constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID)
                        });
                    });
                    folderField.isMandatory = true;

                    // Set default template files and other values
                    const htmlTemplates = getTemplateFileId();
                    log.debug({ title: strDebugTitle, details: `HTML Template file IDs: ${JSON.stringify(htmlTemplates)}` });
                    if (isValidString(htmlTemplates.template1_id) && isValidString(htmlTemplates.template2_id)) {
                        try {
                            newRecord.setValue({ fieldId: constants.MAIN_CONFIG_FIELDS.HTML_TEMPLATE, value: htmlTemplates.template1_id });
                            newRecord.setValue({ fieldId: constants.MAIN_CONFIG_FIELDS.HTML_TEMPLATE_2, value: htmlTemplates.template2_id });
                        } catch (e) {
                            log.error({ title: strDebugTitle, details: `Error setting template IDs: ${e.message}` });
                        }
                    }

                    newRecord.setValue({ fieldId: constants.MAIN_CONFIG_FIELDS.BILL_SPLIT_CREATION, value: true });
                } else if (type === context.UserEventType.VIEW) {
                    // Display folder internal ID
                    const folderInternalId = newRecord.getValue({ fieldId: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID });
                    if (folderInternalId) {
                        const displayField = form.addField({
                            id: constants.CUSTOM_FIELDS.FOLDER_DISPLAY,
                            type: serverWidget.FieldType.INLINEHTML,
                            label: 'Folder Internal ID (View Only)'
                        });
                        displayField.defaultValue = `<div style="padding: 10px; background-color: #f0f0f0;">Folder Internal ID: ${folderInternalId}</div>`;
                        displayField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });
                        form.getField({ id: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                        try {
                            form.removeField({ id: constants.CUSTOM_FIELDS.FOLDER_DROPDOWN });
                        } catch (e) {
                            log.debug({ title: strDebugTitle, details: `No folder dropdown to remove in view mode: ${e.message}` });
                        }
                    } else {
                        log.debug({ title: strDebugTitle, details: 'No folder internal ID found in view mode' });
                    }
                }
            } catch (err) {
                log.error({
                    title: `${strDebugTitle} (beforeLoad)`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
        }

        /**
         * Triggered before the record is submitted. Sets the folder internal ID from the dropdown selection.
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {string} context.type - Trigger type
         */
        function beforeSubmit(context) {
            if ([context.UserEventType.CREATE, context.UserEventType.EDIT].includes(context.type)) {
                try {
                    const newRecord = context.newRecord;
                    const selectedFolderValue = newRecord.getValue({ fieldId: constants.CUSTOM_FIELDS.FOLDER_DROPDOWN });
                    newRecord.setValue({
                        fieldId: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID,
                        value: selectedFolderValue
                    });
                } catch (err) {
                    log.error({
                        title: `${strDebugTitle} (beforeSubmit)`,
                        details: JSON.stringify({ code: err.name, message: err.message })
                    });
                }
            }
        }

        /**
         * Retrieves all folders for the dropdown.
         * @returns {Array} Array of folder objects with internalid and name
         */
        function getFolders() {
            const rtnData = [];
            try {
                const folderSearch = search.create({
                    type: search.Type.FOLDER,
                    filters: [],
                    columns: [
                        { name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID },
                        { name: constants.STANDARD_FIELDS.FILE.NAME, sort: search.Sort.ASC }
                    ]
                });

                let start = 0;
                const pageSize = 1000;
                let hasMore = true;

                while (hasMore) {
                    const results = folderSearch.run().getRange({ start, end: start + pageSize });
                    if (results.length === 0) {
                        hasMore = false;
                        break;
                    }

                    results.forEach(result => {
                        rtnData.push({
                            internalid: result.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID),
                            name: result.getValue(constants.STANDARD_FIELDS.FILE.NAME)
                        });
                    });

                    start += pageSize;
                    if (rtnData.length >= 10000) {
                        log.debug({
                            title: `${strDebugTitle} (getFolders)`,
                            details: 'Reached maximum folder limit of 10,000'
                        });
                        hasMore = false;
                    }
                }

                log.debug({
                    title: `${strDebugTitle} (getFolders)`,
                    details: `Retrieved ${rtnData.length} folders`
                });
            } catch (err) {
                log.error({
                    title: `${strDebugTitle} (getFolders)`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
            return rtnData;
        }

        /**
         * Retrieves internal IDs of template files by name.
         * @returns {Object} Object with template1_id and template2_id
         */
        function getTemplateFileId() {
            const rtnData = { template1_id: '', template2_id: '' };
            try {
                const fileSearch = search.create({
                    type: "file",
                    filters: [
                        [constants.STANDARD_FIELDS.FILE.NAME, 'is', constants.TEMPLATE_FILES.VENDOR_BILL_PROCESS],
                        'OR',
                        [constants.STANDARD_FIELDS.FILE.NAME, 'is', constants.TEMPLATE_FILES.SPLIT_SCREEN]
                    ],
                    columns: [
                        { name: constants.STANDARD_FIELDS.FILE.NAME },
                        { name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID }
                    ]
                });

                let start = 0;
                const pageSize = 1000;
                let hasMore = true;

                while (hasMore) {
                    const results = fileSearch.run().getRange({ start, end: start + pageSize });
                    if (results.length === 0) {
                        hasMore = false;
                        break;
                    }

                    results.forEach(result => {
                        const fileName = result.getValue(constants.STANDARD_FIELDS.FILE.NAME);
                        const fileId = result.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                        if (fileName === constants.TEMPLATE_FILES.VENDOR_BILL_PROCESS) {
                            rtnData.template1_id = fileId;
                        } else if (fileName === constants.TEMPLATE_FILES.SPLIT_SCREEN) {
                            rtnData.template2_id = fileId;
                        }
                    });

                    start += pageSize;
                }

                log.debug({
                    title: `${strDebugTitle} (getTemplateFileId)`,
                    details: `Template IDs: ${JSON.stringify(rtnData)}`
                });
            } catch (err) {
                log.error({
                    title: `${strDebugTitle} (getTemplateFileId)`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
            return rtnData;
        }

        /**
         * Checks if a string is valid (non-empty and not null).
         * @param {string} value - String to check
         * @returns {boolean} True if valid, false otherwise
         */
        function isValidString(value) {
            return value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN;
        }

        return {
            beforeLoad,
            beforeSubmit
        };
    });