/*************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture Client License CS (lstcptr_client_license_cs.js)
 *
 * Version:         1.0.0   -   14-Apr-2025  -   RS       Initial Developement
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This client script validates the license start date and end date and updates the license status based on the specified dates.
 *
 * Script:          customscript_lstcptr_client_license_cs
 * Deploy:          customdeploy_lstcptr_client_license_cs
 *
 * Notes:
 *
 * Dependencies:    ./lstcptr_constants
 *
 * Libraries:
 *************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @FileName lstcptr_client_license_cs.js
 */
define(['N/currentRecord', 'N/log', './lstcptr_constants'],
    /**
     * @param {currentRecord} currentRecord
     * @param {log} log
     * @param {Object} constants
     */
    function (currentRecord, log, constants) {
        const strDebugTitle = constants.CLIENT_LICENSE_CS_DEBUG_TITLE;
        let checkbox = true; // Stores initial license status
        let mode = '';

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @returns {boolean} Return true if field is valid
         * @since 2015.2
         */
        function fieldChanged(context) {
            try {
                if (mode !== 'edit') {
                    return true;
                }
                const record = context.currentRecord;
                const fieldId = context.fieldId;

                // Handle date field changes
                if (fieldId === constants.CLIENT_LICENSE_FIELDS.START_DATE || fieldId === constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE) {
                    const startDate = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.START_DATE });
                    const endDate = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE });
                    const startDateValue = startDate ? new Date(startDate) : null;
                    if (startDateValue) startDateValue.setHours(0, 0, 0, 0);
                    const endDateValue = endDate ? new Date(endDate) : null;
                    if (endDateValue) endDateValue.setHours(0, 0, 0, 0);

                    // Uncheck the license status and clear end date if start date is removed
                    if (!isValidString(startDate)) {
                        record.setValue({
                            fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS,
                            value: false
                        });
                        record.setValue({
                            fieldId: constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE,
                            value: false
                        });
                        if (endDate) {
                            record.setValue({
                                fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE,
                                value: ''
                            });
                        }
                    }
                    // Clear end date if start date is after end date
                    if (startDateValue && endDateValue && startDateValue.getTime() > endDateValue.getTime()) {
                        record.setValue({
                            fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE,
                            value: ''
                        });
                        endDateValue = null;
                    }
                    // Validate overall license status
                    checkLicenseStatus(record, startDateValue, endDateValue, checkbox);
                }

                // Handle license plan changes
                if (fieldId === constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN) {
                    const plan = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_PLAN });
                    log.debug({ title: `${strDebugTitle} (fieldChanged) plan`, details: JSON.stringify({ plan }) });

                    // Set usage limit based on license plan
                    let usageLimit;
                    switch (plan) {
                        case constants.LICENSE_PLANS.TRIAL:
                        case constants.LICENSE_PLANS.TRIED_VERSION:
                            usageLimit = 100;
                            break;
                        case constants.LICENSE_PLANS.UNLIMITED:
                            usageLimit = 'Unlimited';
                            break;
                        case constants.LICENSE_PLANS.STANDARD:
                            usageLimit = 500;
                            break;
                        case constants.LICENSE_PLANS.PREMIUM:
                            usageLimit = 1000;
                            break;
                        default:
                            usageLimit = '';
                            break;
                    }
                    record.setValue({
                        fieldId: constants.CLIENT_LICENSE_FIELDS.USAGE_LIMIT,
                        value: usageLimit
                    });
                }

                return true;
            } catch (err) {
                log.error({ title: `${strDebugTitle} (fieldChanged) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
                return false;
            }
        }

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed
         * @since 2015.2
         */
        function pageInit(context) {
            try {
                mode = context.mode;
                if (context.mode !== 'edit') {
                    return;
                }
                const record = context.currentRecord;
                let disabledStatusInit = false;

                // Store the initial license status
                checkbox = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS });
                log.debug({ title: `${strDebugTitle} (pageInit)`, details: `Stored initial license status: ${checkbox}` });

                // Get start and end dates
                const startDatePageInit = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.START_DATE });
                const endDatePageInit = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE });
                const todayInit = new Date();
                todayInit.setHours(0, 0, 0, 0);
                const startDateInit = startDatePageInit ? new Date(startDatePageInit) : null;
                if (startDateInit) startDateInit.setHours(0, 0, 0, 0);
                const endDateInit = endDatePageInit ? new Date(endDatePageInit) : null;
                if (endDateInit) endDateInit.setHours(0, 0, 0, 0);

                let statusChecked = checkbox;
                let expiredCheckbox = false;

                // Apply date-based logic to determine correct license status
                if (startDateInit && startDateInit > todayInit) {
                    statusChecked = false;
                    expiredCheckbox = true;
                    log.debug({ title: `${strDebugTitle} (pageInit)`, details: 'Start date in future, setting status to false, expired to true' });
                } else if (startDateInit && startDateInit <= todayInit) {
                    if (endDateInit && endDateInit < todayInit) {
                        statusChecked = false;
                        expiredCheckbox = true;
                        disabledStatusInit = true;
                        log.debug({ title: `${strDebugTitle} (pageInit)`, details: 'End date in past, setting status to false, expired to true' });
                    } else if (endDateInit && (endDateInit.getTime() === todayInit.getTime() || endDateInit > todayInit)) {
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: `${strDebugTitle} (pageInit)`, details: 'Valid date range, setting status to true, expired to false' });
                    } else {
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: `${strDebugTitle} (pageInit)`, details: 'No end date, valid start date, setting status to true' });
                    }
                } else {
                    statusChecked = false;
                    expiredCheckbox = false;
                    log.debug({ title: `${strDebugTitle} (pageInit)`, details: 'No start date, setting status to false, expired to false' });
                }

                // Update fields
                record.setValue({
                    fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS,
                    value: statusChecked
                });
                record.setValue({
                    fieldId: constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE,
                    value: expiredCheckbox
                });
                record.getField({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS }).isDisabled = disabledStatusInit;

                log.debug({ title: `${strDebugTitle} (pageInit)`, details: `Final status: ${statusChecked}, Expired: ${expiredCheckbox}, Disabled: ${disabledStatusInit}` });
            } catch (err) {
                log.error({ title: `${strDebugTitle} (pageInit) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        /**
         * Function to be executed before record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record can be saved, false otherwise
         * @since 2015.2
         */
        function saveRecord(context) {
            try {
                const record = context.currentRecord;
                const licenseStatus = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS });
                const startDate = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.START_DATE });
                const endDate = record.getValue({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_END_DATE });
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const startDateValue = startDate ? new Date(startDate) : null;
                if (startDateValue) startDateValue.setHours(0, 0, 0, 0);
                const endDateValue = endDate ? new Date(endDate) : null;
                if (endDateValue) endDateValue.setHours(0, 0, 0, 0);

                let statusChecked = licenseStatus;
                let expiredCheckbox = false;
                let disabledStatus = false;

                // Validate date conditions
                if (startDateValue && startDateValue > today) {
                    statusChecked = false;
                    expiredCheckbox = true;
                    log.debug({ title: `${strDebugTitle} (saveRecord)`, details: 'Start date in future, setting status to false, expired to true' });
                } else if (startDateValue && startDateValue <= today) {
                    if (endDateValue && endDateValue < today) {
                        statusChecked = false;
                        expiredCheckbox = true;
                        disabledStatus = true;
                        log.debug({ title: `${strDebugTitle} (saveRecord)`, details: 'End date in past, setting status to false, expired to true' });
                    } else if (endDateValue && (endDateValue.getTime() === today.getTime() || endDateValue > today)) {
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: `${strDebugTitle} (saveRecord)`, details: 'Valid date range, setting status to true, expired to false' });
                    } else {
                        statusChecked = true;
                        expiredCheckbox = false;
                        log.debug({ title: `${strDebugTitle} (saveRecord)`, details: 'No end date, valid start date, setting status to true' });
                    }
                } else {
                    statusChecked = false;
                    expiredCheckbox = false;
                    log.debug({ title: `${strDebugTitle} (saveRecord)`, details: 'No start date, setting status to false, expired to false' });
                }

                // Update fields if necessary
                if (statusChecked !== licenseStatus) {
                    record.setValue({
                        fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS,
                        value: statusChecked
                    });
                    log.debug({ title: `${strDebugTitle} (saveRecord)`, details: `Overrode license status to: ${statusChecked}` });
                }
                record.setValue({
                    fieldId: constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE,
                    value: expiredCheckbox
                });
                record.getField({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS }).isDisabled = disabledStatus;

                return true;
            } catch (err) {
                log.error({ title: `${strDebugTitle} (saveRecord) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
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
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                let statusChecked = checkbox;
                let disabledStatus = false;
                let expiredCheckbox = false;

                // Check if start date is in the future
                if (startDate && startDate > today) {
                    statusChecked = false;
                    expiredCheckbox = true;
                    console.log('Start date is greater than today. Checkbox set to false, expired set to true.');
                } else if (startDate && startDate <= today) {
                    statusChecked = true;
                    expiredCheckbox = false;
                    console.log('Start date is less than or equal to today. Checkbox set to true.');
                } else {
                    statusChecked = false;
                    expiredCheckbox = false;
                    console.log('No start date. Checkbox set to false.');
                }

                // Logic for end date comparison
                if (endDate && endDate < today) {
                    statusChecked = false;
                    expiredCheckbox = true;
                    disabledStatus = true;
                    console.log('End date is less than today. Checkbox set to false, expired set to true.');
                } else if (endDate && (endDate.getTime() === today.getTime() || endDate > today)) {
                    if (startDate && startDate <= today) {
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
                    fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS,
                    value: statusChecked
                });
                record.setValue({
                    fieldId: constants.CLIENT_LICENSE_FIELDS.EXPIRE_LICENSE,
                    value: expiredCheckbox
                });
                record.getField({ fieldId: constants.CLIENT_LICENSE_FIELDS.LICENSE_STATUS }).isDisabled = disabledStatus;

                return true;
            } catch (err) {
                log.error({
                    title: `${strDebugTitle} (checkLicenseStatus) Error`,
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
            return value != null && value !== '' && value !== 'undefined' && value !== 'NaN' && !isNaN(new Date(value).getTime());
        }

        return {
            fieldChanged,
            pageInit,
            saveRecord
        };
    });