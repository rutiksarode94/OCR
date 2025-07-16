/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Subsidiary Configuration CS (lstcptr_subsidiary_con_cs.js)
*
* Version:         2.4.0   -   [Current Date]   -   PB.     -   Updated pageInit to set folder ID after setting configured subsidiaries.
*
* Author:          LiveStrong Technologies
*
* Purpose:         The purpose of this script is to show an alert when a user tries to configure a subsidiary that is already configured and to set the folder internal ID when the main configuration field is selected or on page load.
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
define(['N/search'], 
    /**
     * @param {search} search 
     */    
    function(search) 
    {
        var strDebugTitle = 'lstcptr_subsidiary_con_cs';

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

                // First, get and set the configured subsidiaries
                var configuredSubsidiaries = getConfiguredSubsidiaries();
                currentRecord.setValue({ fieldId: 'custpage_lstcptr_configured_subsidiaries', value: JSON.stringify(configuredSubsidiaries) });
                log.debug("configuredSubsidiaries: ", configuredSubsidiaries);

                // Then, get the main configuration record ID
                var mainConfigRecordId = currentRecord.getValue({ fieldId: 'custrecord_lstcptr_sub_con_main_config'});
                log.debug("mainConfigRecordId: ", mainConfigRecordId);

                if (mainConfigRecordId) 
                {
                    // Load the main configuration record and get the folder internal ID
                    var folderInternalId = getFolderInternalId(mainConfigRecordId);
                    if (folderInternalId) 
                    {
                        // Set the folder internal ID in the current record
                        currentRecord.setValue({
                            fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                            value: folderInternalId
                        });
                        log.debug("Folder Internal ID set in pageInit: ", folderInternalId);
                    } else {
                        log.debug("No folder internal ID found for main configuration: ", mainConfigRecordId);
                        // Optionally clear or set a default value
                        currentRecord.setValue({
                            fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                            value: ''
                        });
                    }
                } else {
                    // If no main configuration is selected, clear the folder ID
                    currentRecord.setValue({
                        fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                        value: ''
                    });
                    log.debug("No main configuration selected, clearing folder ID in pageInit.");
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

                // Handle change in main configuration field
                if (fieldId === 'custrecord_lstcptr_sub_con_main_config') 
                {
                    var mainConfigRecordId = currentRecord.getValue({ fieldId: 'custrecord_lstcptr_sub_con_main_config' });
                    if (mainConfigRecordId) 
                    {
                        // Get the folder internal ID from the selected main configuration record
                        var folderInternalId = getFolderInternalId(mainConfigRecordId);
                        if (folderInternalId) 
                        {
                            // Set the folder internal ID in the subsidiary configuration record
                            currentRecord.setValue({
                                fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                                value: folderInternalId
                            });
                            log.debug("Folder Internal ID set: ", folderInternalId);
                        } else {
                            log.debug("No folder internal ID found for main configuration: ", mainConfigRecordId);
                            // Optionally clear or set a default value if no folder ID is found
                            currentRecord.setValue({
                                fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                                value: ''
                            });
                        }
                    } else {
                        // If no main configuration is selected, clear the folder ID
                        currentRecord.setValue({
                            fieldId: 'custrecord_lstcptr_sub_con_folder_id',
                            value: ''
                        });
                        log.debug("No main configuration selected, clearing folder ID.");
                    }
                }

                // Handle change in subsidiary field (existing logic, preserved)
                if (fieldId === 'custrecord_lstcptr_sub_config_subsidiary') 
                {
                    var selectedSubsidiary = currentRecord.getValue({ fieldId: 'custrecord_lstcptr_sub_config_subsidiary' });
                    var configuredSubsidiaries = JSON.parse(currentRecord.getValue({ fieldId: 'custpage_lstcptr_configured_subsidiaries' }) || '[]');

                    if (configuredSubsidiaries.includes(selectedSubsidiary)) {
                        alert('Please select a different subsidiary, as this one is already configured.');
                        currentRecord.setValue({ fieldId: 'custrecord_lstcptr_sub_config_subsidiary', value: '' });
                    }
                }

            } catch (err) {
                log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Retrieves the list of already configured subsidiaries.
         * @returns {Array} Array of subsidiary IDs
         */
        function getConfiguredSubsidiaries()
        {
            var rtnData = [];
            try
            {
                var subsidiaryConfigSearch = search.create({
                    type: 'customrecord_lstcptr_subsidiary_config',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_sub_config_subsidiary', label: 'Subsidiary' })
                    ]
                });

                var results = subsidiaryConfigSearch.run().getRange({ start: 0, end: 1000 }); // Limit to 1000 results for performance

                results.forEach(function(result) {
                    var subsidiaryId = result.getValue({ name: 'custrecord_lstcptr_sub_config_subsidiary' });
                    if (subsidiaryId) {
                        rtnData.push(subsidiaryId);
                    }
                });

            } catch (err) {
                log.error({ title: strDebugTitle + ' (getConfiguredSubsidiaries) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }

        /**
         * Retrieves the folder internal ID from a specific main configuration record.
         * @param {String} recordId - The internal ID of the main configuration record
         * @returns {String} The folder internal ID
         */
        function getFolderInternalId(recordId) {
            var rtnData = '';
            try {
                var folderIdSearch = search.create({
                    type: 'customrecord_lstcptr_main_configuration',
                    filters: [
                        ['internalid', 'anyof', recordId]
                    ],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_folder_internal_id', label: 'Folder ID' })
                    ]
                });

                folderIdSearch.run().each(function(result) {
                    rtnData = result.getValue({ name: 'custrecord_lstcptr_folder_internal_id' });
                    return false; // Exit after first result
                });
            } catch (e) {
                log.error("Error While getting folder Id: ", e.message);
            }
            return rtnData;
        }
    
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged
        };
    });