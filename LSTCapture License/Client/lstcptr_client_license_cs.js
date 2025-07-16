/*************************************************************************************
* Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Client License CS (lstcptr_client_license_cs.js)
*
* Version:         2.1.1   -   14-Apr-2025  -   Modified fieldChanged function to handle individual date removal
*
* Author:          LiveStrong Technologies
*
* Purpose:         This client script validates the license start date and end date and updates the license status based on the specified dates.
*
* Script:          customscript_lstcptr_client_license_cs
* Deploy:          customdeploy_lstcptr_client_license_cs
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
 * @FileName lstcptr_client_license_cs.js
 */
define(['N/currentRecord'],
    /**
     * @param {currentRecord} currentRecord
     */
    function (currentRecord) {
        var strDebugTitle = 'lstcptr_client_license_cs';
        var checkbox = true;
        var mode = '';
    
        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function fieldChanged(context) {
            try {
                if (mode !== 'edit') {
                    return;
                }
                var record = context.currentRecord;
                var fieldId = context.fieldId;
                // Check if the relevant fields are being edited
                if (fieldId === 'custrecord_lstcptr_client_lic_start_date' || fieldId === 'custrecord_lstcptr_client_licen_end_date') {
                    var startDate = record.getValue({ fieldId: 'custrecord_lstcptr_client_lic_start_date' });
                    var endDate = record.getValue({ fieldId: 'custrecord_lstcptr_client_licen_end_date' });
                    var startDateValue = new Date(startDate);
                    startDateValue.setHours(0, 0, 0, 0);
                    var endDateValue = new Date(endDate);
                    endDateValue.setHours(0, 0, 0, 0);
                    // Uncheck the license status if start date is removed
                    if (!isValidString(startDate)) {
                        record.setValue({
                            fieldId: 'custrecord_lstcptr_client_license_status',
                            value: false
                        });
                        // Clear end date if start date is removed
                        if (endDate) {
                            record.setValue({
                                fieldId: 'custrecord_lstcptr_client_licen_end_date',
                                value: ''
                            });
                        }
                    }
    
                    if (startDateValue && endDate && startDateValue.getTime() > endDateValue.getTime()) {
                        record.setValue({
                            fieldId: 'custrecord_lstcptr_client_licen_end_date',
                            value: ''
                        });
                    }
                    // Also validate the overall license status
                    checkLicenseStatus(record, startDateValue, endDateValue, checkbox);
                }
                return true;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, messgae: err.messgae }) });
            }
        }
    
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(context) {
            try {
                
                mode = context.mode;
                if (context.mode !== 'edit') {
                    return;
                }
                var record = context.currentRecord;
                var disabledStatusInit = false;
                checkbox = record.getValue({ fieldId: 'custrecord_lstcptr_client_license_status' });
                var endDatePageInit = record.getValue({ fieldId: 'custrecord_lstcptr_client_licen_end_date' });
                var todayInit = new Date();
                todayInit.setHours(0, 0, 0, 0); 
                var endDateInit = new Date(endDatePageInit);
                endDateInit.setHours(0, 0, 0, 0);
    
                // Check if the license is expired
                if (endDateInit < todayInit) {
                    // License is expired, disable the status field
                    disabledStatusInit = true;
                }
               
                // Set the field to disabled if the license is expired
                record.getField({ fieldId: 'custrecord_lstcptr_client_license_status' }).isDisabled = disabledStatusInit;
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (pageInit) Error', details: JSON.stringify({ code: err.name, messgae: err.messgae }) });
            }
        }
    
        /**
         * Function to check the license status
         * @param {Record} record
         * @returns {boolean} Return true if field is valid
         */
        function checkLicenseStatus(record, startDate, endDate, checkbox) {
            try {
                var today = new Date();
                today.setHours(0, 0, 0, 0);  // Remove time portion for comparison
                var startDateSet = startDate;
                var endDateSet = endDate;
                var statusChecked = checkbox;
                var disabledStatus = false;
                console.log('startDate: ' + startDateSet);
                console.log('endDate: ' + endDateSet);
                console.log('today: ' + today);
                console.log('statusChecked: ' + statusChecked);
                // Check if start date is in the future
                if (startDateSet > today) {
                    statusChecked = false;
                    console.log('Start date is greater than today. Checkbox set to false.');
                    disabledStatus = false;
                } else if (startDateSet <= today) {
                    statusChecked = true;
                    console.log('Start date is less than or equal to today. Checkbox set to true.');
                    disabledStatus = false;
                }
                // Logic for end date comparison
                if (endDateSet < today) {
                    statusChecked = false;
                    console.log('End date is less than today. Checkbox set to false.');
                    disabledStatus = true;
                } else if (endDateSet.getTime() === today.getTime() || endDateSet > today) {
                    // End date is today or in the future, check if start date is also valid
                    if (startDateSet <= today) {
                        statusChecked = true;
                        console.log('End date is today or greater and start date is valid. Checkbox set to true.');
                        disabledStatus = false;
                    } else {
                        statusChecked = false;
                        console.log('End date is valid, but start date is still in the future. Checkbox remains false.');
                        disabledStatus = false;
                    }
                }
                // Set the checkbox value
                record.setValue({
                    fieldId: 'custrecord_lstcptr_client_license_status',
                    value: statusChecked
                });
                // Set the field to disabled if the license is expired
                record.getField({ fieldId: 'custrecord_lstcptr_client_license_status' }).isDisabled = disabledStatus;
    
            } catch (err) {
                log.error({
                    title: 'checkLicenseStatus Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
        }
    
        /**
         * Helper function to check if a string is valid (non-empty and not null).
         * @param {string} value - String to be checked
         * @returns {boolean} True if the string is valid, false otherwise
         */
        function isValidString(value) {
            if (value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN && value != 'Invalid Date')
                return true;
            else
                return false;
        }
    
        return {
            fieldChanged: fieldChanged,
            pageInit: pageInit
        };
    });