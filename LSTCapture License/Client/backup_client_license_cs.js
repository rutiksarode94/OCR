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
        var checkbox = true; // Stores initial license status
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
                    return true;
                }
                var record = context.currentRecord;
                var fieldId = context.fieldId;
                // Handle date field changes
                if (fieldId === 'custrecord_lstcptr_client_lic_start_date' || fieldId === 'custrecord_lstcptr_client_licen_end_date') {
                    var startDate = record.getValue({ fieldId: 'custrecord_lstcptr_client_lic_start_date' });
                    var endDate = record.getValue({ fieldId: 'custrecord_lstcptr_client_licen_end_date' });
                    var startDateValue = startDate ? new Date(startDate) : null;
                    if (startDateValue) startDateValue.setHours(0, 0, 0, 0);
                    var endDateValue = endDate ? new Date(endDate) : null;
                    if (endDateValue) endDateValue.setHours(0, 0, 0, 0);
                    // Uncheck the license status and clear end date if start date is removed
                    if (!isValidString(startDate)) {
                        record.setValue({
                            fieldId: 'custrecord_lstcptr_client_license_status',
                            value: false
                        });
                        record.setValue({
                            fieldId: 'custrecord_lstcptr_client_expire_license',
                            value: false
                        });
                        if (endDate) {
                            record.setValue({
                                fieldId: 'custrecord_lstcptr_client_licen_end_date',
                                value: ''
                            });
                        }
                    }
                    // Clear end date if start date is after end date
                    if (startDateValue && endDateValue && startDateValue.getTime() > endDateValue.getTime()) {
                        record.setValue({
                            fieldId: 'custrecord_lstcptr_client_licen_end_date',
                            value: ''
                        });
                        endDateValue = null;
                    }
                    // Validate overall license status
                    checkLicenseStatus(record, startDateValue, endDateValue, checkbox);
                }
                
                // Handle license plan changes
                if (fieldId === 'custrecord_lstcptr_client_license_plan') {
                    var plan = record.getValue({ fieldId: 'custrecord_lstcptr_client_license_plan' });
                    log.debug({ title: strDebugTitle + ' (fieldChanged) plan', details: JSON.stringify({ plan: plan }) });
                
                    // Set usage limit based on license plan
                    var usageLimit;
                    switch (plan) {
                        case '1': // Trial Version
                        case 'Tried Version':
                            usageLimit = 100;
                            break;
                        case '2': // Unlimited Plan
                            usageLimit = 'Unlimited';
                            break;
                        case '3': // Standard Plan (example)
                            usageLimit = 500;
                            break;
                        case '4': // Premium Plan (example)
                            usageLimit = 1000;
                            break;
                        default:
                            usageLimit = ''; // Default to empty if plan is not recognized
                            break;
                    }
                    record.setValue({
                        fieldId: 'custrecord_lstcptr_client_usage_limit',
                        value: usageLimit
                    });
                }
                
                return true;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return false;
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
                
                // Store the initial license status
                checkbox = record.getValue({ fieldId: 'custrecord_lstcptr_client_license_status' });
                log.debug({ title: strDebugTitle + ' (pageInit)', details: 'Stored initial license status: ' + checkbox });
                
                // Get start and end dates
                var startDatePageInit = record.getValue({ fieldId: 'custrecord_lstcptr_client_lic_start_date' });
                var endDatePageInit = record.getValue({ fieldId: 'custrecord_lstcptr_client_licen_end_date' });
                var todayInit = new Date();
                todayInit.setHours(0, 0, 0, 0);
                var startDateInit = startDatePageInit ? new Date(startDatePageInit) : null;
                if (startDateInit) startDateInit.setHours(0, 0, 0, 0);
                var endDateInit = endDatePageInit ? new Date(endDatePageInit) : null;
                if (endDateInit) endDateInit.setHours(0, 0, 0, 0);
                
                var statusChecked = checkbox;
                var expiredCheckbox = false;
                
                // Apply date-based logic to determine correct license status
                if (startDateInit && startDateInit > todayInit) {
                    // Start date in future: license is inactive
                    statusChecked = false;
                    expiredCheckbox = true;
                    log.debug({ title: strDebugTitle + ' (pageInit)', details: 'Start date in future, setting status to false, expired to true' });
                } else if (startDateInit && startDateInit <= todayInit) {
                    // Start date is today or in the past
                    if (endDateInit && endDateInit < todayInit) {
                        // End date is in the past: license is expired
                        statusChecked = false;
                        expiredCheckbox = true;
                        disabledStatusInit = true;
                        log.debug({ title: strDebugTitle + ' (pageInit)', details: 'End date in past, setting status to false, expired to true' });
                    } else if (endDateInit && (endDateInit.getTime() === todayInit.getTime() || endDateInit > todayInit)) {
                        // End date is today or in the future: license is active
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: strDebugTitle + ' (pageInit)', details: 'Valid date range, setting status to true, expired to false' });
                    } else {
                        // No end date: assume active if start date is valid
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: strDebugTitle + ' (pageInit)', details: 'No end date, valid start date, setting status to true' });
                    }
                } else {
                    // No start date: license is inactive
                    statusChecked = false;
                    expiredCheckbox = false;
                    log.debug({ title: strDebugTitle + ' (pageInit)', details: 'No start date, setting status to false, expired to false' });
                }
                
                // Update fields
                record.setValue({
                    fieldId: 'custrecord_lstcptr_client_license_status',
                    value: statusChecked
                });
                record.setValue({
                    fieldId: 'custrecord_lstcptr_client_expire_license',
                    value: expiredCheckbox
                });
                record.getField({ fieldId: 'custrecord_lstcptr_client_license_status' }).isDisabled = disabledStatusInit;
                
                log.debug({ title: strDebugTitle + ' (pageInit)', details: 'Final status: ' + statusChecked + ', Expired: ' + expiredCheckbox + ', Disabled: ' + disabledStatusInit });
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (pageInit) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
    
        /**
         * Function to be executed before record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record can be saved, false otherwise
         *
         * @since 2015.2
         */
        function saveRecord(context) {
            try {
                var record = context.currentRecord;
                var licenseStatus = record.getValue({ fieldId: 'custrecord_lstcptr_client_license_status' });
                var startDate = record.getValue({ fieldId: 'custrecord_lstcptr_client_lic_start_date' });
                var endDate = record.getValue({ fieldId: 'custrecord_lstcptr_client_licen_end_date' });
                var today = new Date();
                today.setHours(0, 0, 0, 0);
                var startDateValue = startDate ? new Date(startDate) : null;
                if (startDateValue) startDateValue.setHours(0, 0, 0, 0);
                var endDateValue = endDate ? new Date(endDate) : null;
                if (endDateValue) endDateValue.setHours(0, 0, 0, 0);
                
                var statusChecked = licenseStatus;
                var expiredCheckbox = false;
                var disabledStatus = false;
                
                // Validate date conditions
                if (startDateValue && startDateValue > today) {
                    // Start date in future: license is inactive
                    statusChecked = false;
                    expiredCheckbox = true;
                    log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'Start date in future, setting status to false, expired to true' });
                } else if (startDateValue && startDateValue <= today) {
                    // Start date is today or in the past
                    if (endDateValue && endDateValue < today) {
                        // End date is in the past: license is expired
                        statusChecked = false;
                        expiredCheckbox = true;
                        disabledStatus = true;
                        log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'End date in past, setting status to false, expired to true' });
                    } else if (endDateValue && (endDateValue.getTime() === today.getTime() || endDateValue > today)) {
                        // End date is today or in the future: license is active
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'Valid date range, setting status to true, expired to false' });
                    } else {
                        // No end date: assume active if start date is valid
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'No end date, valid start date, setting status to true' });
                    }
                } else {
                    // No start date: license is inactive
                    statusChecked = false;
                    expiredCheckbox = false;
                    log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'No start date, setting status to false, expired to false' });
                }
                
                // Update fields if necessary
                if (statusChecked !== licenseStatus) {
                    record.setValue({
                        fieldId: 'custrecord_lstcptr_client_license_status',
                        value: statusChecked
                    });
                    log.debug({ title: strDebugTitle + ' (saveRecord)', details: 'Overrode license status to: ' + statusChecked });
                }
                record.setValue({
                    fieldId: 'custrecord_lstcptr_client_expire_license',
                    value: expiredCheckbox
                });
                record.getField({ fieldId: 'custrecord_lstcptr_client_license_status' }).isDisabled = disabledStatus;
                
                return true;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (saveRecord) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
                return false;
            }
        }
    
        /**
         * Function to check the license status
         * @param {Record} record
         * @param {Date} startDate
         * @param {Date} endDate
         * @param {boolean} checkbox
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
                var expiredCheckbox = false;
                
                console.log('startDate: ' + startDateSet);
                console.log('endDate: ' + endDateSet);
                console.log('today: ' + today);
                console.log('statusChecked: ' + statusChecked);

                // Check if start date is in the future
                if (startDateSet && startDateSet > today) {
                    statusChecked = false;
                    expiredCheckbox = true;
                    console.log('Start date is greater than today. Checkbox set to false, expired set to true.');
                } else if (startDateSet && startDateSet <= today) {
                    statusChecked = true;
                    expiredCheckbox = false;
                    console.log('Start date is less than or equal to today. Checkbox set to true.');
                } else {
                    // No start date
                    statusChecked = false;
                    expiredCheckbox = false;
                    console.log('No start date. Checkbox set to false.');
                }

                // Logic for end date comparison
                if (endDateSet && endDateSet < today) {
                    statusChecked = false;
                    expiredCheckbox = true;
                    disabledStatus = true;
                    console.log('End date is less than today. Checkbox set to false, expired set to true.');
                } else if (endDateSet && (endDateSet.getTime() === today.getTime() || endDateSet > today)) {
                    // End date is today or in the future
                    if (startDateSet && startDateSet <= today) {
                        statusChecked = true;
                        expiredCheckbox = false;
                        console.log('End date is today or greater and start date is valid. Checkbox set to true.');
                    } else {
                        statusChecked = false;
                        expiredCheckbox = true;
                        console.log('End date is valid, but start date is invalid or in the future. Checkbox set to false, expired set to true.');
                    }
                }

                // Set the checkbox values
                record.setValue({
                    fieldId: 'custrecord_lstcptr_client_license_status',
                    value: statusChecked
                });
                record.setValue({
                    fieldId: 'custrecord_lstcptr_client_expire_license',
                    value: expiredCheckbox
                });
                // Set the field to disabled if the license is expired
                record.getField({ fieldId: 'custrecord_lstcptr_client_license_status' }).isDisabled = disabledStatus;
    
                return true;
            } catch (err) {
                log.error({
                    title: 'checkLicenseStatus Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return false;
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
            pageInit: pageInit,
            saveRecord: saveRecord
        };
    });