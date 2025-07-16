/*************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Client License Inactivation (lstcptr_inactivate_client_license_ss.js)
 *
 * Version:         1.0.0   -   18-Apr-2025  -   Initial development
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This scheduled script creates a saved search for client license records
 *                  and inactivates records where the end date is today's date.
 *                  It runs daily at 12 AM to process multiple records efficiently.
 *
 * Script:          customscript_lstcptr_check_license_ss
 * Deploy:          customdeploy_lstcptr_check_license_ss
 *
 * Notes:           Schedule this script to run daily at 12 AM via the NetSuite UI.
 *
 * Dependencies:    N/search, N/record, N/runtime, N/format
 *
 *************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 * @FileName lstcptr_inactivate_client_license_ss.js
 */
define(['N/search', 'N/record', 'N/runtime', 'N/format'],
    /**
     * @param {search} search
     * @param {record} record
     * @param {runtime} runtime
     * @param {format} format
     */
    function (search, record, runtime, format) {
        var strDebugTitle = 'lstcptr_inactivate_client_license_ss';

        /**
         * Main function to execute the scheduled script.
         *
         * @param {Object} context
         */
        function execute(context) {
            try {
                // Get today's date in NetSuite format (MM/DD/YYYY)
                var today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to midnight
                var formattedToday = format.format({
                    value: today,
                    type: format.Type.DATE
                });
                log.debug({ title: strDebugTitle, details: 'Today\'s date: ' + formattedToday });

                // Create saved search for client license records
                var clientLicenseSearch = search.create({
                    type: 'customrecord_lstcptr_client_license',
                    filters: [
                        ['custrecord_lstcptr_client_licen_end_date', 'on', formattedToday],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: [
                        search.createColumn({ name: 'internalid', label: 'Internal ID' }),
                        search.createColumn({ name: 'custrecord_lstcptr_client_license_acc_id', label: 'Account ID' }),
                        search.createColumn({ name: 'custrecord_lstcptr_client_licen_end_date', label: 'End Date' }),
                        search.createColumn({ name: 'custrecord_lstcptr_client_expire_license', label: 'Expired License' })
                    ]
                });

                // Process search results in batches
                var searchResultCount = clientLicenseSearch.runPaged().count;
                log.debug({ title: strDebugTitle, details: 'Found ' + searchResultCount + ' records to process' });

                if (searchResultCount === 0) {
                    log.debug({ title: strDebugTitle, details: 'No records found with end date matching today' });
                    return;
                }

                var startIndex = 0;
                var batchSize = 1000; // Process 1000 records per batch
                var scriptObj = runtime.getCurrentScript();

                while (startIndex < searchResultCount) {
                    // Check governance units
                    var remainingUsage = scriptObj.getRemainingUsage();
                    if (remainingUsage < 1000) {
                        log.debug({ title: strDebugTitle, details: 'Low governance units (' + remainingUsage + '), yielding script' });
                        // Yield script to resume later
                        var yieldResult = yieldScript();
                        if (!yieldResult) {
                            log.error({ title: strDebugTitle, details: 'Failed to yield script' });
                            return;
                        }
                    }

                    // Get batch of results
                    var searchResults = clientLicenseSearch.run().getRange({
                        start: startIndex,
                        end: startIndex + batchSize
                    });

                    // Process each record
                    for (var i = 0; i < searchResults.length; i++) {
                        var recordId = searchResults[i].getValue('internalid');
                        var accountId = searchResults[i].getValue('custrecord_lstcptr_client_license_acc_id');
                        
                        try {
                            // Load and inactivate the record
                            var clientLicenseRecord = record.load({
                                type: 'customrecord_lstcptr_client_license',
                                id: recordId,
                                isDynamic: true
                            });

                            clientLicenseRecord.setValue({
                                fieldId: 'custrecord_lstcptr_client_license_status',
                                value: false
                            });
                            log.debug("Record ID: " + recordId, "Setting status to false");

                            clientLicenseRecord.setValue({
                                fieldId: '	custrecord_lstcptr_client_expire_license',
                                value: true
                            });
                            log.debug("Record ID: " + recordId, "Setting expired license to true"); 

                            var savedRecordId = clientLicenseRecord.save({
                                ignoreMandatoryFields: true
                            });
                            log.debug({
                                title: strDebugTitle,
                                details: 'Inactivated record ID: ' + savedRecordId + ' for Account ID: ' + accountId
                            });
                        } catch (recordErr) {
                            log.error({
                                title: strDebugTitle + ' (Record Processing Error)',
                                details: 'Error inactivating record ID: ' + recordId + ', Error: ' + JSON.stringify({
                                    code: recordErr.name,
                                    message: recordErr.message
                                })
                            });
                        }
                    }

                    startIndex += batchSize;
                }

                log.debug({ title: strDebugTitle, details: 'Completed processing ' + searchResultCount + ' records' });
            } catch (err) {
                log.error({
                    title: strDebugTitle + ' (execute) Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
        }

        /**
         * Helper function to yield the script when governance units are low.
         * @returns {boolean} True if yield is successful, false otherwise
         */
        function yieldScript() {
            try {
                var scriptObj = runtime.getCurrentScript();
                var state = scriptObj.yieldScript();
                log.debug({ title: strDebugTitle, details: 'Script yielded successfully, state: ' + JSON.stringify(state) });
                return true;
            } catch (yieldErr) {
                log.error({
                    title: strDebugTitle + ' (yieldScript) Error',
                    details: JSON.stringify({ code: yieldErr.name, message: yieldErr.message })
                });
                return false;
            }
        }

        return {
            execute: execute
        };
    });