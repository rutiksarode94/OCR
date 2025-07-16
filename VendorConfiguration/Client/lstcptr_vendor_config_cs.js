/*************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            OCR Customer Configuration CS (lstcptr_vendor_config_cs.js)
 *
 * Version:         1.0.0   -   07-Jan-2025  -   RS.     -   Initial development.
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         The purpose of this script is to show custom segment list values based on the selected custom segment.
 *
 * Script:          customscript_lstcptr_vendor_config_cs
 * Deploy:          customdeploy_lstcptr_vendor_config_cs
 *
 * Notes:
 *
 * Dependencies:    ./lstcptr_constants
 *
 * Libraries:       N/search
 *************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @FileName lstcptr_vendor_config_cs.js
 */
define(['N/search', './lstcptr_constants'],
    /**
     * @param {search} search 
     * @param {constants} constants
     */
    function (search, constants) {
        var strDebugTitle = constants.VENDOR_CONFIG_CS_DEBUG_TITLE;

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} context
         * @param {Record} context.currentRecord - Current form record
         * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(context) {
            try {
                var currentRecord = context.currentRecord;
                var mode = context.mode;
                var configuredVendors = getConfiguredVendors();
                currentRecord.setValue({ fieldId: constants.VENDOR_CONFIG_FIELDS.CONFIGURED_VENDORS, value: JSON.stringify(configuredVendors) });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (pageInit) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
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
        function fieldChanged(context) {
            try {
                var currentRecord = context.currentRecord;
                var fieldId = context.fieldId;

                if (fieldId === constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR) {
                    var selectedCustomer = currentRecord.getValue({ fieldId: constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR });
                    var configuredVendors = JSON.parse(currentRecord.getValue({ fieldId: constants.VENDOR_CONFIG_FIELDS.CONFIGURED_VENDORS }));

                    if (configuredVendors.includes(selectedCustomer)) {
                        alert('Please select a different customer, as this one is already configured.');
                        currentRecord.setValue({ fieldId: constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR, value: '' });
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function getConfiguredVendors() {
            var rtnData = [];
            try {
                var configuredVendors = search.create({
                    type: constants.RECORD_TYPES.VENDOR_CONFIG,
                    filters: [],
                    columns: [
                        search.createColumn({ name: constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR, label: 'Link To Parent Vendor' })
                    ]
                });

                configuredVendors.run().each(function (result) {
                    rtnData.push(result.getValue({ name: constants.VENDOR_CONFIG_FIELDS.PARENT_VENDOR }));
                    return true;
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getConfiguredVendors) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged
        };
    });