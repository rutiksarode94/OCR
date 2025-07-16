/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            Vendor Bill To Process Records (lst_vendor_bill_to_process.js)
*
* Version:         2.1.0   -   12-March-2025 -  RS      
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script is used to show vendor bill records.
*
* Script:          customscript_lst_vendor_bill_to_process
* Deploy:          customdeploylst_vendor_bill_to_process
*
*********************************************************************************************/


/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @FileName lst_vendor_bill_to_process.js
 */
define(['N/file', 'N/https', 'N/search', 'N/record', 'N/render', 'N/runtime', 'N/redirect', 'N/ui/serverWidget'],
    /**
     * @param {file} file
     * @param {https} https
     * @param {search} search
     * @param {record} record
     * @param {render} render
     * @param {runtime} runtime
     * @param {redirect} redirect
     * @param {serverWidget} serverWidget
    */
    function (file, https, search, record, render, runtime, redirect, serverWidget) 
    {
        var strDebugTitle = "vendor_bill_to_process";
        var confidenceScoreCache = {}; // Global cache for confidence scores
    
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
        **/
        function onRequest(context) 
        {
            try 
            {
                var request = context.request;
                var response = context.response;
                var nUserObj = runtime.getCurrentUser();
                var nCurrentUserId = nUserObj.id;
                var nUserRoleId = nUserObj.role;
                var nUserName = nUserObj.name; 
                var accountId = runtime.accountId;
                log.debug({ title: strDebugTitle, details: "nCurrentUserId : " + nCurrentUserId + " || nUserRoleId : " + nUserRoleId + " || nUserName : " + nUserName + " || AccountId : "+accountId});
    
                if (request.method === 'GET') 
                {
                    var form = serverWidget.createForm({ 
                        title: 'Vendor Bill To Process'
                    });
    
                    var searchResults = getSOStagingRecords(); 
                    var duplicatebillNumberss = getDuplicatebillNumberss(searchResults); 
                    var mainConfigRecordField = getMainConfigRecord(); 

                    
                    //var subsidiaryConfigRecords = getSubsidiaryConfigRecords();
                    //var subsidiaryToFormMap = createSubsidiaryToFormMap(subsidiaryConfigRecords); 
                   // var subsidiaries = getConfiguredSubsidiaries();
    
                    if (isThereValue(mainConfigRecordField)) {
                        var orderPilotSuiteletFile = mainConfigRecordField.getValue({ name: 'custrecord_ab_main_con_html_template_1' });
                        var templateFile = file.load({ id: orderPilotSuiteletFile }); 
                        var templateContent = templateFile.getContents(); 
                    }
    
                    var data = 
                    {
                        searchResults: searchResults.map(function (result) 
                        {
                            var internalId = result.getValue({ name: 'internalid' });
                            var createdDate = result.getValue({ name: 'created' });
                            var transactionType = result.getText({ name: 'custrecord_lst_transaction_type' });
                            var processStatus = result.getText({ name: 'custrecord_lst_process_status' });
                            var vendor = result.getText({ name: 'custrecord_lst_vendor' });
                            var customerId = result.getValue({ name: 'custrecord_lst_vendor_id' });
                            var billNumbers = result.getValue({ name: 'custrecord_st_bill_number' });
                            var status = result.getValue({name:'custrecord_lst_tran_status'});
                            var billDate = result.getValue({name:'custrecord_lst_bill_date'});
                            //var pdfFileId = result.getValue({name:'custrecord_lst_pdf_file'});
                            var pdfFileId = result.getValue({ name: 'custrecord_lst_pdf_file' });
                        
                          
                           // var shipToAddress = result.getValue({ name: 'custrecord_ab_ship_to_address' });
                            var totalAmount = result.getValue({ name: 'custrecord_lst_tran_amount_inc_tax' });
                            var subsidiary = result.getValue({ name: 'custrecord_lst_subsidiary' });
                            //var customerMatchingConditions = getCustomerMatchingConditions(result.getValue({ name: 'custrecord_ab_cust_matching_conditions' }));
                            //var customerMatchingMethod = customerMatchingConditions && customerMatchingConditions.method;
                            // var vendorConfidenceScore = '';
                            // var customerConfidenceIndicator = '';
                            // var itemConfidenceIndicator = '';
                            // var itemConfidenceScore = '';
                            // if(isThereValue(customerMatchingMethod)) {
                            //     customerConfidenceScore = getConfidenceScore(customerMatchingMethod);
                            //     customerConfidenceIndicator = customerConfidenceScore ? customerConfidenceScore.confidenceScore : '';
                            // }
    
                           // var itemMatchingConditions = getItemMatchingConditions(result.getValue({ name: 'custrecord_ab_item_exported_frm_nanonets' }));
                           // var itemMatchingMethod = isThereValue(itemMatchingConditions) ? itemMatchingConditions.method : '';
    
                            // if(isThereValue(itemMatchingMethod)) {
                            //     itemConfidenceScore = getConfidenceScore(itemMatchingMethod);
                            //     itemConfidenceIndicator = itemConfidenceScore ? itemConfidenceScore.confidenceScore : '';
                            // }
    
                            //var needsItemReviewCondition = JSON.parse(result.getValue({ name: 'custrecord_ab_item_exported_frm_nanonets' }) || '[]');
                          //  var salesOrderForm = subsidiaryToFormMap[subsidiary];
                       // var pdfUrl = getPdfUrl(pdfFileId);
                        
                        var systemAlert = '';
                        var statusClass = '';
                        var statusIcon = '';
                        var actionButton = '';
                        
                        // Handle duplicate transaction and missing bill number
                        if (typeof duplicatebillNumberss !== 'undefined' && billNumbers && duplicatebillNumberss[billNumbers]) {
                            systemAlert = '<span>Duplicate Transaction</span>';
                        } else if (!billNumbers) {
                            systemAlert = '<span>Please enter Bill Number</span>';
                        }
                        
                            var systemAlert = '';
                            var statusClass = '';
                            var statusIcon = '';
                            var actionButton = '';
    
                            // Determine process status based on customer and item matching conditions
                            // if (!isThereValue(customer)) {
                            //     if (!isThereValue(needsItemReviewCondition) || needsItemReviewCondition.some(item => !isThereValue(item.item_internal_id))) {
                            //         processStatus = 'Customer and Item Not Found';
                            //     } else {
                            //         processStatus = 'Customer Not Found';
                            //     }
                            // } else if (!isThereValue(needsItemReviewCondition) || needsItemReviewCondition.some(item => !isThereValue(item.item_internal_id))) {
                            //     processStatus = 'Needs Item Review';
                            // } else {
                            //     processStatus = 'Ready For Processing';
                            // }
                            
    
                            if (billNumbers && duplicatebillNumberss[billNumbers]) {
                                systemAlert = '<span>Duplicate Transaction</span>';
                            }
                            if(!billNumbers){
                                systemAlert= '<span>Please enter Bill Nuumber</span>'
                            }
                            
                            // if (isThereValue(vendor)) {
                            //     var isSubsidiaryConfigured = subsidiaries.some(function(sub) {
                            //         return sub.value === subsidiary;
                            //     });
    
                            //     if (!isSubsidiaryConfigured) {
                            //         processStatus = 'Matching Incomplete';
                            //         systemAlert = '<span>Please complete the Subsidiary Configuration first, then proceed.</span>';
                            //     }
                            // }
    
                            // Base URLs for different actions
                           // var processUrl = `/app/accounting/transactions/salesord.nl?whence=&entity=${customerId}&subsidiary=${subsidiary}&orderToProcessId=${internalId}&cf=${salesOrderForm}`;
                            // var editUrl = `/app/site/hosting/scriptlet.nl?script=customscript_lst_vendor_bill_to_process&deploy=customdeploy_lst_vendor_bill_to_process&compid=${runtime.accountId}&recordId=${internalId}&recordType=customrecord_lst_vendor_bill_to_process&whence=`;
    
                            // // if(licenseStatus == 'Active') {
                            //     if(processStatus === 'Ready For Processing') {
                            //         statusClass = 'ready-for-processing';
                            //         statusIcon = '<span class="icon"></span>';
                            //        // actionButton = `<button type="button" class="action-button btn-process" data-url="${processUrl}">PROCESS</button>`;
                            //     }
                            //     else if(processStatus === 'Needs Item Review') {
                            //         statusClass = 'matching-incomplete';
                            //         statusIcon = '<span class="icon incomplete-icon"></span>';
                            //         actionButton = `<button type="button" class="action-button btn-process" data-url="${processUrl}">PROCESS</button>`;
                            //     }
                            //     else if(processStatus === 'Customer Not Found' || processStatus === 'Customer and Item Not Found' || processStatus === 'Matching Incomplete') {
                            //         statusClass = 'matching-incomplete';
                            //         statusIcon = '<span class="icon incomplete-icon"></span>';
                            //         actionButton = `<button type="button" class="action-button btn-edit" data-url="${editUrl}">EDIT</button>`;
                            //     }
                            // // } else if(licenseStatus == 'Inactive') { 
                            //     if(processStatus === 'Ready For Processing') {
                            //         statusClass = 'ready-for-processing';
                            //         statusIcon = '<span class="icon"></span>';
                            //         actionButton = `<button type="button" class="action-button btn-process disabled">PROCESS</button>`;
                            //     }
                            //     else if(processStatus === 'Needs Item Review') {
                            //         statusClass = 'matching-incomplete';
                            //         statusIcon = '<span class="icon incomplete-icon"></span>';
                            //         actionButton = `<button type="button" class="action-button btn-process disabled">PROCESS</button>`;
                            //     }
                            //     else if(processStatus === 'Customer Not Found' || processStatus === 'Customer and Item Not Found' || processStatus === 'Matching Incomplete') {
                            //         statusClass = 'matching-incomplete';
                            //         statusIcon = '<span class="icon incomplete-icon"></span>';
                            //         actionButton = `<button type="button" class="action-button btn-edit disabled">EDIT</button>`;
                            //     }
                            // }
    
    
                            return {
                                internalId: internalId,
                                createdDate: createdDate,
                                transactionType: transactionType,
                                processStatus: processStatus,
                                vendor: vendor,
                                customerId: customerId,
                                billNumbers: billNumbers,
                                status:status,
                                billDate:billDate,
                                pdfFileId:pdfFileId,
                               // shipToAddress: shipToAddress,
                                totalAmount: totalAmount ? '$ ' + totalAmount : '',
                                subsidiary: subsidiary,
                                systemAlert: systemAlert,
                                statusClass: statusClass,
                                statusIcon: statusIcon,
                                actionButton: actionButton,
                               // salesOrderForm: salesOrderForm,
                                //customerMatchingMethod: customerMatchingMethod,
                                //customerConfidenceIndicator: customerConfidenceIndicator,
                                //itemMatchingMethod: itemMatchingMethod,
                                //itemConfidenceIndicator: itemConfidenceIndicator,
                             //   licenseStatus: licenseStatus
                            };
                        }),
                        // licenseStatus: licenseStatus
                    };
    
                    var renderer = render.create();
                    renderer.templateContent = templateContent;
                    renderer.addCustomDataSource({ format: render.DataSource.OBJECT, alias: 'data', data: data });
                    var html = renderer.renderAsString();
    
                    var htmlField = form.addField({
                        id: 'custpage_lst_html_table',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'HTML Table'
                    });
                    htmlField.defaultValue = html;
                    response.writePage(form);
                }
                // else if (request.method === 'POST') 
                // {
                //     var requestParams = request.parameters;
                //     log.debug({ title: strDebugTitle, details: "POST request received with params: " + JSON.stringify(requestParams) });
                //     if (requestParams.reject_id) 
                //     {
                //         try 
                //         {
                //             var recordId = requestParams.reject_id;
                //             log.debug({ title: strDebugTitle, details: "Rejecting record with ID: " + recordId });
                //             var rejectedRecord = search.lookupFields({
                //                 type: 'customrecord_lst_vendor_bill_to_process',
                //                 id: recordId,
                //                 columns: ['custrecord_st_bill_number']
                //             });
                //             var billNumbers = rejectedRecord.custrecord_st_bill_number;
    
                //             record.submitFields({
                //                 type: 'customrecord_lst_vendor_bill_to_process',
                //                 id: recordId,
                //                 values: {
                //                     isinactive: true,
                //                     custrecord_lst_process_status: '2'
                //                 }
                //             }); 
    
                //             var relatedRecords = getRecordsBybillNumbers(billNumbers);
                //             log.debug({ title: strDebugTitle, details: "Related records: " + JSON.stringify(relatedRecords) });
                //             if (relatedRecords.length == 1) {
                //                 relatedRecords.forEach(function (relatedRecord) {
                //                     if (relatedRecord.id !== recordId) {
                //                         log.debug({ title: strDebugTitle, details: "Updating related record with ID: " + relatedRecord.id });
                //                         record.submitFields({
                //                             type: 'customrecord_lst_vendor_bill_to_process',
                //                             id: relatedRecord.id,
                //                             values: {
                //                                 custrecord_lst_system_alert: ''
                //                             }
                //                         });
                //                     }
                //                 });
                //             }
    
                //             redirect.toSuitelet({ scriptId: 'customscript_lst_vendor_bill_to_process', deploymentId: 'customdeploy_lst_vendor_bill_to_process' });
                //         } catch (err) {
                //             log.error({ title: strDebugTitle + " Submit Error", details: JSON.stringify({ error: { code: err.name, message: err.message } }) });
                //         }
                //     }
                // }
            }
            catch (err) {
                log.error({ title: strDebugTitle + " (onRequest) Error", details: JSON.stringify({ error: { code: err.name, message: err.message } }) });
            }
        }

        // function getPdfUrl(pdfFileId){
        //     var searchResult = search.create({
        //         type: 'customrecord_lst_vendor_bill_to_process',
        //         columns: [
        //             search.createColumn({ name: 'custrecord_lst_pdf_file', label: 'PDF File ' })
        //         ]
        //     }).run().getRange({ start: 0, end: 10 });
            
        //     var results = searchResult.map(function (result) {
        //         var pdfFileId = result.getValue({ name: 'custrecord_lst_pdf_file' });
        //         var pdfUrl = '';
            
        //         if (pdfFileId) {
        //             var pdfFile = file.load({ id: pdfFileId });
        //             pdfUrl = pdfFile.url; // Relative URL
        //         }
            
        //         return {
        //             pdfUrl: pdfUrl
        //         };
        //     });
        // }
    
        /**
         * Defines the search to fetch all Sales Order Staging records
         * @returns {Array} - Returns an array of search results
         * since 2015.2
         */
        function getSOStagingRecords() 
        {
            try 
            {
                log.debug("getSOStagingRecords Funcction", "Started");
                var soStagingSearch = search.create({
                    type: "customrecord_lst_vendor_bill_to_process",
                    filters:
                    [
                        ["isinactive", "is", "F"],
                        "AND",
                        ["custrecord_lst_process_status", "isempty", ""],
                        "AND",
                        [
                            [["custrecord_st_bill_number","isnotempty",""]],
                            "OR",
                            [["custrecord_lst_bill_date","isnotempty",""]]
                        ]
                    ],
                    columns:
                    [
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "created", sort: search.Sort.DESC, label: "Date Created" }),
                        search.createColumn({ name: "custrecord_lst_transaction_type", label: "Transaction Type" }),
                        search.createColumn({ name: "custrecord_lst_process_status", label: "Process Status" }),
                        search.createColumn({ name: "custrecord_lst_vendor", label: "Vendor" }),
                        search.createColumn({ name: "custrecord_st_bill_number", label: "PO Number" }),
                        search.createColumn({name:"custrecord_lst_tran_status", label:"Transaction Status"}),
                        search.createColumn({name:'custrecord_lst_bill_date', label:"Bill Date"}),
                        search.createColumn({name:'custrecord_lst_pdf_file', label:"PDF File"}),
                       // search.createColumn({ name: "custrecord_ab_ship_to_address", label: "Ship To Address" }),
                        search.createColumn({ name: "custrecord_lst_tran_amount_inc_tax", label: "Total Amount" }),
                        search.createColumn({ name: "custrecord_lst_subsidiary", label: "Subsidiary" }),
                      //  search.createColumn({ name: "custrecord_ab_cust_matching_conditions", label: "Customer Matching Conditions" }),
                       // search.createColumn({ name: "custrecord_ab_item_exported_frm_nanonets", label: "Item Exported from Nanonets" })
                    ]
                });
                log.debug("getSOStagingRecords Funcction", "Executed");

                return getAllSavedSearch(soStagingSearch);
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getSOStagingRecords) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Defines the function to identify duplicates by PO Number and Customer
         * @param {Array} searchResults - The search results to be checked for duplicates
         * @returns {Object} - Returns an object with duplicate PO number and customer pairs
         * since 2015.2
         */
        function getDuplicatebillNumberss(searchResults) 
        {
            try 
            {
                log.debug("getDuplicatebillNumberss Funcction", "Started");

                var billNumbersTracker = {};
                var duplicatebillNumberss = {};
        
                searchResults.forEach(function (result) {
                    var billNumbers = result.getValue({ name: 'custrecord_st_bill_number' });
                    if (billNumbers) {
                        if (!billNumbersTracker[billNumbers]) {
                            billNumbersTracker[billNumbers] = 1;
                        } else {
                            billNumbersTracker[billNumbers]++;
                        }
                    }
                });
        
                for (var billNumbers in billNumbersTracker) {
                    if (billNumbersTracker[billNumbers] > 1) {
                        duplicatebillNumberss[billNumbers] = true;
                    }
                }
        
                log.debug("getDuplicatebillNumberss Funcction", "Executed");

                return duplicatebillNumberss;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getDuplicatebillNumberss) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
    
            }
        } 
    
        /**
         * Fetch the latest main configuration record
         * @returns {Object} - Returns the latest main configuration record field
         * since 2015.2
         */
        function getMainConfigRecord() 
        {
            var rtnData = '';
            try 
            {
                log.debug("getMainConfigRecord Funcction", "Started");

                var mainConfigSearch = search.create({
                    type: 'customrecord_ab_ocr_main_configuration',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'custrecord_ab_main_con_html_template_1', label: 'HTML Template 1' }),
                        search.createColumn({ name: 'internalid', sort: search.Sort.DESC, label: 'Internal ID'}) 
                    ]
                });
    
                var mainConfigSearchResult = mainConfigSearch.run().getRange({ start: 0, end: 1 });
                if (mainConfigSearchResult.length > 0) {
                    rtnData = mainConfigSearchResult[0];
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getMainConfigRecord) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            log.debug("getMainConfigRecord Funcction", "Execuuted");

            return rtnData;
        }
    
        /**
         * Fetch all subsidiary configuration records using a saved search
         * @returns {Array} - Returns an array of subsidiary configuration records
         * since 2015.2
         */
        // function getSubsidiaryConfigRecords() 
        // {
        //     var rtnData = [];
        //     try 
        //     {
        //         log.debug("getSubsidiaryConfigRecords Funcction", "Started");

        //         var subsidiaryConfigSearch = search.create({
        //             type: 'customrecord_ab_ocr_subsid_configuration',
        //             filters: [],
        //             columns: [
        //                 search.createColumn({ name: 'custrecord_ab_sub_con_sales_order_form', label: 'Sales Order Form' }),
        //                 search.createColumn({ name: 'custrecord_ab_sub_con_subsidiary', label: 'Subsidiary' }),
        //                 search.createColumn({ name: 'internalid', sort: search.Sort.DESC, label: 'Internal ID' })
        //             ]
        //         });
    
        //         var resultSet = subsidiaryConfigSearch.run();
        //         resultSet.each(function(result) {
        //             rtnData.push(result);
        //             return true;
        //         });
    
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (getSubsidiaryConfigRecords) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        //     log.debug("getSubsidiaryConfigRecords Funcction", "Executed");

        //     return rtnData;
        // }
    
        /**
         * Create a mapping of subsidiaries to their sales order forms
         * @param {Array} subsidiaryConfigRecords - Array of subsidiary configuration records
         * @returns {Object} - Returns a mapping of subsidiary IDs to sales order forms
         * since 2015.2
         */
        // function createSubsidiaryToFormMap(subsidiaryConfigRecords) 
        // {
        //     var rtnData = {};
        //     try
        //     {
        //         log.debug("createSubsidiaryToFormMap Funcction", "Started");

        //         subsidiaryConfigRecords.forEach(function(record) {
        //             var subsidiaryId = record.getValue({ name: 'custrecord_ab_sub_con_subsidiary' });
        //             var salesOrderForm = record.getValue({ name: 'custrecord_ab_sub_con_sales_order_form' });
        //             rtnData[subsidiaryId] = salesOrderForm;
        //         });
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (createSubsidiaryToFormMap) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        //     log.debug("createSubsidiaryToFormMap Funcction", "Executed");

        //     return rtnData;
        // }
    
        /**
         * Fetch the list of configured subsidiaries
         * @returns {Array} - Returns an array of configured subsidiaries
         * since 2015.2
         */
        // function getConfiguredSubsidiaries() 
        // {
        //     var rtnData = [];
        //     try 
        //     {
        //         log.debug("getConfiguredSubsidiaries Funcction", "Started");

        //         var subsidiarySearch = search.create({
        //             type: 'customrecord_ab_ocr_subsid_configuration',
        //             columns: ['custrecord_ab_sub_con_subsidiary']
        //         });
    
        //         var searchResults = subsidiarySearch.run().getRange({ start: 0, end: 1000 });
        //         searchResults.forEach(function(result) {
        //             var subsidiaryId = result.getValue('custrecord_ab_sub_con_subsidiary');
        //             var subsidiaryText = result.getText('custrecord_ab_sub_con_subsidiary');
        //             rtnData.push({ value: subsidiaryId, text: subsidiaryText });
        //         });
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (getConfiguredSubsidiaries) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
        //     }
        //     log.debug("getConfiguredSubsidiaries Funcction", "Executed");

        //     return rtnData;
        // }
    
        /**
         * Defines the function that processes the customer matching conditions
         * @param {string} matchingConditions - The matching conditions to be processed
         * @returns {string} - Returns a string of matching conditions
         * since 2015.2
         */
        // function getCustomerMatchingConditions(matchingConditions) 
        // {
        //     var rtnData = {};
        //     try 
        //     {
        //         log.debug("getCustomerMatchingConditions Funcction", "Started");

        //         if(isThereValue(matchingConditions)) 
        //         {
        //             var matchingConditionSearch = search.create({
        //                 type: 'customrecord_ab_matching_condition',
        //                 filters:
        //                 [
        //                     ["idtext","is", matchingConditions]
        //                 ],
        //                 columns:
        //                 [
        //                     search.createColumn({name: "custrecord_ab_matching_method", label: "Matching Method"})
        //                 ]
        //             });
    
        //             var matchingConditionResults = matchingConditionSearch.run().getRange({ start: 0, end: 1 });
        //             if (matchingConditionResults.length > 0) {
        //                 var result = matchingConditionResults[0];
        //                 rtnData = {
        //                     name: result.getValue({ name: 'altname' }),
        //                     method: result.getText({ name: 'custrecord_ab_matching_method' })
        //                 };
        //             }
        //         }
    
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (getCustomerMatchingConditions) Error',  details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        //     log.debug("getCustomerMatchingConditions Funcction", "Executed");

        //     return rtnData;
        // }
    
        /**
         * Defines the function that processes the item matching conditions
         * @param {string} itemsJson - The JSON string of items to be processed
         * @returns {Object} - Returns an object with the name and method of the matching condition
         * since 2015.2
         */
        // function getItemMatchingConditions(itemsJson) 
        // {
        //     var rtnData = {};
        //     try 
        //     {

        //         log.debug("getItemMatchingConditions Funcction", "Started");

        //         if (isThereValue(itemsJson)) 
        //         {
        //             var items = JSON.parse(itemsJson);
        //             if (items.length > 0) 
        //             {
        //                 var matchingConditionId = items[0].item_matching_condition;
    
        //                 if (isThereValue(matchingConditionId)) 
        //                 {
        //                     var matchingConditionSearch = search.create({
        //                         type: 'customrecord_ab_matching_condition',
        //                         filters: [
        //                             ["idtext", "is", matchingConditionId]
        //                         ],
        //                         columns: [
        //                             search.createColumn({ name: "custrecord_ab_matching_method", label: "Matching Method" })
        //                         ]
        //                     });
    
        //                     var resultSet = matchingConditionSearch.run();
        //                     var results = resultSet.getRange({ start: 0, end: 1 });
        //                     if (results.length > 0) {
        //                         var result = results[0];
        //                         rtnData = {
        //                             name: result.getValue({ name: 'altname' }),
        //                             method: result.getText({ name: 'custrecord_ab_matching_method' })
        //                         };
        //                     }
        //                 }
        //             }
        //         }
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (getItemMatchingConditions) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        //     log.debug("getItemMatchingConditions Funcction", "Executed");

        //     return rtnData;
        // }
    
        /**
         * Defines the function that retrieves the confidence score
         * @param {string} matchingMethod - The matching method to be processed
         * @returns {Object} - Returns an object with the confidence score
         * since 2015.2
         */
    
        // function getConfidenceScore(matchingMethod) 
        // {
        //     log.debug("getConfidenceScore Funcction", "Started");

        //     if (!isThereValue(matchingMethod)) {
        //         log.error({ title: strDebugTitle + ' (getConfidenceScore) Error', details: 'Matching Method is invalid or missing: ' + matchingMethod });
        //         return { confidenceScore: '' };
        //     }
    
        //     if (confidenceScoreCache[matchingMethod]) {
        //         return confidenceScoreCache[matchingMethod];
        //     }
    
        //     var rtnData = { confidenceScore: '' };
        //     try {
        //         var confidenceScoreSearch = search.create({
        //             type: "customrecord_ab_cr_matching_method",
        //             filters: [
        //                 ["name", "is", matchingMethod]
        //             ],
        //             columns: [
        //                 search.createColumn({ name: "custrecord_ab_matching_confidence_score", label: "Confidence Indicator" })
        //             ]
        //         });
    
        //         var resultSet = confidenceScoreSearch.run();
        //         var results = resultSet.getRange({ start: 0, end: 1 });
        //         if (results.length > 0) {
        //             var result = results[0];
        //             rtnData.confidenceScore = result.getText({ name: 'custrecord_ab_matching_confidence_score' });
        //         }
    
        //         confidenceScoreCache[matchingMethod] = rtnData;
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (getConfidenceScore) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        //     log.debug("getConfidenceScore Funcction", "Executed");

        //     return rtnData;
        // }
    
    
        /**
         * Defines the function that retrieves records by PO Number
         * @param {string} billNumbers - The PO Number to be processed
         * @returns {Array} - Returns an array of search results
         * since 2015.2
         */
        function getRecordsBybillNumbers(billNumbers) 
        {
            var results = [];
            try 
            {
                log.debug("getRecordsBybillNumbers Funcction", "Started");

                var searchObj = search.create({
                    type: 'customrecord_lst_vendor_bill_to_process',
                    filters: [
                        ['custrecord_st_bill_number', 'is', billNumbers],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid']
                });
    
                var resultSet = searchObj.run();
                resultSet.each(function(result) {
                    results.push({
                        id: result.getValue('internalid')
                    });
                    return true;
                });
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getRecordsBybillNumbers) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            log.debug("getRecordsBybillNumbers Funcction", "Executed");

            return results;
        }
    
        /**
         * Defines the function that checks the license status
         * @param {string} accountId - The account ID to be processed
         * @returns {string} - Returns the license status
         * since 2015.2
         */
        // function checkLicenseStatus(accountId) 
        // {
        //     var rtnData = { "licenseStatus": "" };
        //     try
        //     {
        //         log.debug("checkLicenseStatus Funcction", "Started");

        //         var nHeaders = new Array();
        //         nHeaders['Content-type'] = 'application/json';
        //         var accountIDValue = accountId; // Get the value of the accountID fieldhttps://tstdrv1423092.app.netsuite.com/app/common/scripting/scriptrecord.nl?id=4349
        //         var nImportClientURL = "https://tstdrv1423092.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=3708&deploy=1&compid=TSTDRV1423092&ns-at=AAEJ7tMQHInxTPp2N0GhQtF1vD_iJmaLXRNg_H755hZjrfx5o_4&accountID=" + accountIDValue;                    
        //         var nResponse = https.request({ method: https.Method.GET, url: nImportClientURL, headers: nHeaders });
        
        //         if (nResponse.code == 200) {
        //             var nResponseObj = JSON.parse(nResponse.body);
        //             var clientLicenseStatus = nResponseObj.licenseStatus;
        //             rtnData.licenseStatus = clientLicenseStatus;
        //         } else {
        //             log.error({ title: strDebugTitle, details: 'Error occurred while fetching the active status.' });
        //         }
        //     } catch (err) {
        //         log.error({ title: strDebugTitle + ' (checkLicenseStatus) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
        //     }
        //     log.debug("checkLicenseStatus Funcction", "Executed");

        //     return rtnData;
        // }
    
        /**
         * Defines the function that handles fetching all the search results.
         * @param {Object} savedSearch - The search object to be executed
         * @returns {Array} - Returns an array of search results
         * since 2015.2
         */ 
        function getAllSavedSearch(savedSearch)
        {
            try 
            {
                log.debug("getAllSavedSearch Funcction", "Started");

                var resultset = savedSearch.run();
                var returnSearchResults = [];
                var Index = 0;
                do {
                    var resultslice = resultset.getRange(Index, Index + 1000);
                    for ( var rs in resultslice) {
                        returnSearchResults.push(resultslice[rs]);
                        Index++;
                    }
                } while (resultslice.length >= 1000);
            
                log.debug("getAllSavedSearch Funcction", "Execuuted");

                return returnSearchResults;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getAllSavedSearch) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Helper function to check if a string is valid (non-empty and not null).
         * @param {string} value - String to be checked
         * @returns {boolean} True if the string is valid, false otherwise
         */
        function isThereValue(value)
        {
           // log.debug("isThereValue Funcction", "executed");

            if(value != null && value != 'null' && value != '' && value != undefined && value != 'undefined' && value != 'NaN' && value != ' ') {
                //log.debug("isThereValue Funcction", "Executed");

                return true;
            } else {
                //log.debug("isThereValue Funcction", "Started");

                return false;
            }
        }
    
        return {
            onRequest: onRequest
        };
    });