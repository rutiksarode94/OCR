/*************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Subsidiary Configuration CS (lstcptr_subsidiary_con_cs.js)
 *
 * Version:         1.0.0   -   18-Nov-2024  -   RS.     -   Initial development.
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         The purpose of this script is to show an alert when a user tries to configure a subsidiary that is already configured.
 *
 * Script:          customscript_lstcptr_sub_con_cs
 * Deploy:          customdeploy_lstcptr_sub_con_cs
 *
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
 * @FileName lstcptr_subsidiary_con_cs.js
 */
define(['N/search', './lstcptr_constants'], 
    /**
     * @param {search} search 
     * @param {Object} constants
     */    
    function(search, constants) 
    {
        var strDebugTitle = constants.SUBSIDIARY_CONFIG_CS_DEBUG_TITLE;
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(context) 
        {
            try
            {
                var currentRecord = context.currentRecord;
                var mode = context.mode;
                var mainConfigRecordId = currentRecord.getValue({ fieldId: constants.SUBSIDIARY_CONFIG_FIELDS.MAIN_CONFIG });
                log.debug("mainConfigRecordId: ", mainConfigRecordId);
                var configuredSubsidiaries = getConfiguredSubsidiaries();
                currentRecord.setValue({ fieldId: constants.CUSTOM_FIELDS.CONFIGURED_SUBSIDIARIES, value: JSON.stringify(configuredSubsidiaries) });
                log.debug("configuredSubsidiaries: ", configuredSubsidiaries);

                var configureFolderInternalId = getFolderInternalId(mainConfigRecordId);
               if (configureFolderInternalId) {
                    currentRecord.setValue({
                        fieldId: constants.SUBSIDIARY_CONFIG_FIELDS.FOLDER_ID,
                        value: configureFolderInternalId
                    });
                    log.debug("configureFolderInternalId: ", configureFolderInternalId);
                } else {
                    log.error("configureFolderInternalId is null or undefined.");
                }
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (pageInit) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} context 
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.fieldId - Field ID which triggered the event
         *
         * @since 2015.2
         */
        function fieldChanged(context) 
        {
            try
            {
                var currentRecord = context.currentRecord;
                var fieldId = context.fieldId;
                if (fieldId === constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY) 
                {
                    var selectedSubsidiary = currentRecord.getValue({ fieldId: constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY });
                    var configuredSubsidiaries = JSON.parse(currentRecord.getValue({ fieldId: constants.CUSTOM_FIELDS.CONFIGURED_SUBSIDIARIES }));
    
                    if (configuredSubsidiaries.includes(selectedSubsidiary)) {
                        alert('Please select a different subsidiary, as this one is already configured.');
                        currentRecord.setValue({ fieldId: constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY, value: '' });
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        function getConfiguredSubsidiaries()
        {
            var rtnData = [];
            try
            {
                var subsidiaryConfigSearch = search.create({
                    type: constants.RECORD_TYPES.SUBSIDIARY_CONFIG,
                    filters: [],
                    columns: [
                        search.createColumn({ name: constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY, label: 'Subsidiary' })
                    ]
                });
    
                subsidiaryConfigSearch.run().each(function(result) {
                    rtnData.push(result.getValue({ name: constants.SUBSIDIARY_CONFIG_FIELDS.SUBSIDIARY }));
                    return true;
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getConfiguredSubsidiaries) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }

        function getFolderInternalId(recordId)
        {
            var rtnData = '';
            try
            {
                var folderIdSearch = search.create({
                    type: constants.RECORD_TYPES.MAIN_CONFIG,
                    filters: [
                        ['internalid', 'is', recordId]
                    ],
                    columns: [
                        search.createColumn({ name: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID, label: 'Folder ID' })
                    ]
                });
    
                var results = folderIdSearch.run().getRange({ start: 0, end: 1 });
                if (results.length > 0) {
                    rtnData = results[0].getValue({ name: constants.MAIN_CONFIG_FIELDS.FOLDER_INTERNAL_ID });
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getFolderInternalId) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }
    
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged
        };
    });