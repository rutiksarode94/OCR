/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 *
 * Name:            OCR Vendor Bill Split Screen CS (lstcptr_bill_spit_screen_cs.js)
 *
 * Version:         2.1.0   -   25-Sep-2024  -   PB.     -   Initial development (Adapted for Vendor Bill).
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Handle client-side logic for the OCR Vendor Bill Split Screen.
 *
 * Script:          customscript_ab_ocr_vendor_bill_splitscreen_cs
 * Deploy:          customdeploy_ab_ocr_vendor_bill_splitscreen_cs
 *
 * Notes:           Adapted for Vendor Bill without customrecord_ab_ocr_main_configuration
 *
 * Dependencies:
 *
 *********************************************************************************************/
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 * @FileName lstcptr_bill_spit_screen_cs.js
 */
define(['N/format', 'N/ui/dialog', 'N/currentRecord', 'N/log', 'N/record', 'N/search'],
    /**
     * @param {N/format} format
     * @param {N/ui/dialog} dialog
     * @param {N/currentRecord} currentRecord
     * @param {N/log} log
     * @param {N/record} record
     * @param {N/search} search
     */ 
    
    function (format, dialog, currentRecord, log, record, search) 
    {
        var strDebugTitle = "lstcptr_vendor_bill";
        var lastClickedFieldId = null;
        let previousDates = {};
        var currentFieldId = '';
        var showConfirmDialog = true;
        var department = ''; // Initialize with default or fetch from record
        var className = ''; // Initialize with default or fetch from record
        var location = '';
    
        /**
         * Function executed after page initialization
         */
        
        function pageInit(context) {
            try {
                log.debug("******Client Script Started*******");
                var currentRecord = context.currentRecord;
                var subsidiary = currentRecord.getValue({ fieldId: 'subsidiary' }); // Assuming subsidiary is a field on the record
                var vendorToBill = currentRecord.getValue({ fieldId: 'vendorToBill' }); // Adjust fieldId as necessary
        
                log.debug("Subsidiary: ", subsidiary);
                if (vendorToBill) {
                    // Proceed with your logic
                    objRecord.setValue({ fieldId: 'department', value: department });
                    objRecord.setValue({ fieldId: 'class', value: className });
                    objRecord.setValue({ fieldId: 'location', value: location });
        
                    var vendorBillStagingResult = getVendorBillStagingRecord(vendorToBill);
                    log.debug(strDebugTitle, 'Vendor Bill Staging Result: ' + JSON.stringify(vendorBillStagingResult));
        
                    if (vendorBillStagingResult.length > 0) {
                        var billNumber = vendorBillStagingResult[0].getValue('custrecord_lstcptr_bill_number');
                        var billDate = vendorBillStagingResult[0].getValue('custrecord_lstcptr_bill_date');
                        var amount = vendorBillStagingResult[0].getValue('custrecord_lstcptr_tran_amount_inc_tax');
                        var vendorId = vendorBillStagingResult[0].getValue('custrecord_lstcptr_vendor');
        
                        // Set values on the current record
                        currentRecord.setValue({ fieldId: 'tranid', value: billNumber });
                        currentRecord.setValue({ fieldId: 'trandate', value: billDate });
                        currentRecord.setValue({ fieldId: 'usertotal', value: amount });
                        currentRecord.setValue({ fieldId: 'entity', value: vendorId });
        
                        var vendorDetails = getAccountFromVendor(vendorId);
                        currentRecord.setValue({ fieldId: 'account', value: vendorDetails.account });
                        currentRecord.setValue({ fieldId: 'currency', value: vendorDetails.currency });
        
                        // Handle expense lines
                        currentRecord.selectNewLine({ sublistId: 'expense' });
                        currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'account', value: vendorDetails.account });
                        currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'amount', value: amount });
                        currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'department', value: department });
                        currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'class', value: className });
                        currentRecord.setCurrentSublistValue({ sublistId: 'expense', fieldId: 'location', value: location });
                        currentRecord.commitLine({ sublistId: 'expense' });
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (pageInit) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }
        /**
         * Function executed when a field changes
         */
        function fieldChanged(context) 
        {
            try 
            {
                const pdfCanvas = document.getElementById('pdfCanvas');
                if (!pdfCanvas) return;
                var fieldId = context.fieldId;
                var rec = context.currentRecord;
    
                if (fieldId === 'istaxable') 
                {
                    log.debug({ title: strDebugTitle, details: "Clearing highlights for istaxable field" });
                    clearPdfHighlights();
                    return;
                }
    
                if (fieldId === 'custbody_lstcptr_vb_line_dep' || fieldId === 'custbody_lstcptr_vb_line_loc' || fieldId === 'custbody_lstcptr_vb_line_class') 
                {
                    var lineCount = rec.getLineCount({ sublistId: 'expense' });
                    var value = rec.getValue({ fieldId: fieldId });
    
                    for (var i = 0; i < lineCount; i++) 
                    {
                        rec.selectLine({ sublistId: 'expense', line: i });
    
                        if (fieldId === 'custbody_lstcptr_vb_line_dep') 
                        {
                            rec.setCurrentSublistValue({
                                sublistId: 'expense',
                                fieldId: 'department',
                                value: value
                            });
                        } 
                        else if (fieldId === 'custbody_lstcptr_vb_line_loc') 
                        {
                            rec.setCurrentSublistValue({
                                sublistId: 'expense',
                                fieldId: 'location',
                                value: value
                            });
                        } 
                        else if (fieldId === 'custbody_lstcptr_vb_line_class') 
                        {
                            rec.setCurrentSublistValue({
                                sublistId: 'expense',
                                fieldId: 'class',
                                value: value
                            });
                        }
    
                        rec.commitLine({ sublistId: 'expense' });
                    }
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (fieldChanged) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Validation function executed when record is saved
         */
        function saveRecord(context) 
        {
            try 
            {
                const pdfCanvas = document.getElementById('pdfCanvas');
                if (!pdfCanvas) return;
                var rec = context.currentRecord;
                var lineCount = rec.getLineCount({ sublistId: 'expense' });
                var missingItemLine = null; 
                var dummyItemLines = [];
    
                if (!showConfirmDialog) {
                    showConfirmDialog = true;
                    return true;
                }
    
                for (var i = 0; i < lineCount; i++) 
                {
                    rec.selectLine({ sublistId: 'expense', line: i });
                    var category = rec.getCurrentSublistValue({
                        sublistId: 'expense',
                        fieldId: 'category'
                    });
    
                    if (!category) {
                        missingItemLine = i + 1;
                        break;
                    }
                }
    
                if (missingItemLine) {
                    alert('Line ' + missingItemLine + ' does not have a category selected. Please complete all categories before saving.');
                    return false;
                }
    
                return true;
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (saveRecord) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
                return false;
            }
        }
    
        /**
         * Attach focus listeners to fields
         */
        function attachFieldFocusListeners() 
        {
            try 
            {
                var inputFields = document.querySelectorAll('input, textarea, select, email, hyperlink, integer, decimal, currency');
                inputFields.forEach(function (field) 
                {
                    field.addEventListener('focus', function () 
                    {
                        lastClickedFieldId = field.id.replace('_formattedValue', '');
                        log.debug({ title: strDebugTitle, details: "Field focused: " + lastClickedFieldId });
                        if (lastClickedFieldId === 'inpt_category' || lastClickedFieldId === 'memo' || lastClickedFieldId === 'amount') {
                            return;
                        }
                        if (previousDates[lastClickedFieldId])
                        {
                            let searchDate = previousDates[lastClickedFieldId];
                            log.debug({ title: strDebugTitle, details: "Previous date found for field: " + lastClickedFieldId + " - " + searchDate });
                            clearPdfHighlights();
                        }
                    });
    
                    field.addEventListener('blur', function () {
                        clearPdfHighlights();
                    });
                });
            }
            catch (err) {
                log.error({ title: strDebugTitle + ' (attachFieldFocusListeners) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Apply selected PDF text to field
         */
        function applySelectedPdfTextToField(pdfText) 
        {
            try 
            {
                if (!lastClickedFieldId || !pdfText) {
                    log.debug({ title: strDebugTitle, details: "No field selected or no text to copy." });
                    return;
                }
                var rec = currentRecord.get();
                var field = rec.getField({ fieldId: lastClickedFieldId });
    
                if (!field) {
                    log.error({ title: strDebugTitle, details: "Field not found: " + lastClickedFieldId });
                    setValueLinelevel(pdfText);
                    return;
                }
    
                var fieldType = field.type;
                log.debug({ title: strDebugTitle, details: "Field type for " + lastClickedFieldId + ": " + fieldType });
    
                var valueToSet;
    
                switch (fieldType) 
                {
                    case 'date':
                        var parsedDate = parseDate(pdfText);
                        if (parsedDate) 
                        {
                            valueToSet = parsedDate;
                            log.debug({ title: strDebugTitle, details: "Parsed date value: " + valueToSet + " from: " + pdfText });
                            if (parsedDate) 
                            {
                                currentDate = pdfText;
                                currentFieldId = lastClickedFieldId;
                                if (currentDate) {
                                    previousDates[currentFieldId] = currentDate;
                                    log.debug({ title: strDebugTitle, details: "Previous date stored for field: " + currentFieldId + " - " + currentDate });
                                }
                            }
                        } else 
                        {
                            log.error({ title: strDebugTitle, details: "Failed to parse date from: " + pdfText });
                            return;
                        }
                        break;
    
                    default:
                        valueToSet = pdfText.trim();
                }
    
                try 
                {
                    if (fieldType === 'date') 
                    {
                        var dateObj = new Date(valueToSet);
                        if (!isNaN(dateObj.getTime())) {
                            rec.setValue({ fieldId: lastClickedFieldId, value: dateObj });
                        }
                    }
                    else if (fieldType === 'text' || fieldType === 'textarea') 
                    {
                        rec.setValue({ fieldId: lastClickedFieldId, value: valueToSet });
                    }
                    else 
                    {
                        var currencySymbolsPattern = /^[\$\€\¥\£\₹\₽\₺\₩\₫\₪\₦\₱\฿\₲\₡\₭\₮\₸\Br\лв\R$\د.إد.ك\.م\.ر\.س\₼]+/;
                        if (currencySymbolsPattern.test(pdfText)) 
                        {
                            valueToSet = pdfText.replace(currencySymbolsPattern, '').replace(/,/g, '').trim();
                            rec.setValue({ fieldId: lastClickedFieldId, value: valueToSet });
                        } else {
                            valueToSet = pdfText.trim();
                            rec.setValue({ fieldId: lastClickedFieldId, value: valueToSet });
                        }
                    }
    
                    var fieldElement = document.getElementById(lastClickedFieldId);
                    if (fieldElement) {
                        fieldElement.focus();
                    }
    
                    log.debug({ title: strDebugTitle, details: "Successfully set value for field " + lastClickedFieldId + ": " + valueToSet });
    
                } catch (setValueError) {
                    log.error({ title: strDebugTitle, details: "Error setting value: " + setValueError.message });
                }
    
                removeHighlightBoxes();
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (applySelectedPdfTextToField) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Set value for line-level fields
         */
        function setValueLinelevel(pdfText) 
        {
            try 
            {
                if (!lastClickedFieldId || !pdfText) {
                    log.debug({ title: strDebugTitle, details: "No field selected or no text to copy." });
                    return;
                }
                var rec = currentRecord.get();
                var valueToSet;
                
                try {
                    if (lastClickedFieldId === 'memo') {
                        valueToSet = pdfText;
                    } else {
                        var currencySymbolsPattern = /^[\$\€\¥\£\₹\₽\₺\₩\₫\₪\₦\₱\฿\₲\₡\₭\₮\₸\Br\лв\R$\د.إد.ك\.م\.ر\.س\₼]+/;
                        if (currencySymbolsPattern.test(pdfText)) {
                            valueToSet = pdfText.replace(currencySymbolsPattern, '').replace(/,/g, '').trim();
                        } else {
                            valueToSet = pdfText.trim();
                        }
                    }
    
                    setFieldValueBasedOnType(rec, lastClickedFieldId, valueToSet);
    
                    var fieldElement = document.getElementById(lastClickedFieldId);
                    if (fieldElement) {
                        fieldElement.focus();
                    }
                    log.debug({ title: strDebugTitle, details: "Successfully set value for field " + lastClickedFieldId + ": " + valueToSet });
    
                } catch (setValueError) {
                    log.error({ title: strDebugTitle, details: "Error setting value: " + setValueError.message });
                }
                removeHighlightBoxes();
    
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setValueLinelevel) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Set field value based on type
         */
        function setFieldValueBasedOnType(rec, fieldId, value) 
        {
            try
            {
                if (isSublistField(rec, 'expense')) {
                    setLineFieldValue(rec, 'expense', fieldId, value);
                } else {
                    log.debug({title: strDebugTitle, details: "Setting value for body field: " + fieldId});
                    setBodyFieldValue(rec, fieldId, value);
                }
            } catch (err){
                log.error({ title: strDebugTitle + ' (setFieldValueBasedOnType) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Check if field is in sublist
         */
        function isSublistField(rec, sublistId) 
        {
            try 
            {
                var currentLine = rec.getCurrentSublistIndex({ sublistId: sublistId });
                return currentLine >= 0;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (isSublistField) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
                return false;
            }
        }
    
        /**
         * Set body field value
         */
        function setBodyFieldValue(rec, fieldId, value) 
        {
            try
            {
                rec.setValue({fieldId: fieldId, value: value});
                log.debug({title: strDebugTitle, details: "Successfully set body field: " + fieldId + " to value: " + value});
            } catch (err){
                log.error({ title: strDebugTitle + ' (setBodyFieldValue) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Set line field value
         */
        function setLineFieldValue(rec, sublistId, fieldId, value) 
        {
            try 
            {
                var currentLine = rec.getCurrentSublistIndex({ sublistId: sublistId });
                rec.selectLine({ sublistId: sublistId, line: currentLine });
                rec.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: fieldId,
                    value: value
                });
                log.debug({ title: strDebugTitle, details: "Set line field value: " + fieldId + " to value: " + value });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setLineFieldValue) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Parse date string
         */
        function parseDate(dateString) 
        {
            try 
            {
                var dateFormats = 
                [
                    { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'M/D/YYYY' },
                    { regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/, format: 'M/D/YY' },
                    { regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'D/M/YYYY' },
                    { regex: /^\d{1,2}-[A-Za-z]{3}-\d{4}$/, format: 'D-Mon-YYYY' },
                    { regex: /^\d{1,2}\.\d{1,2}\.\d{4}$/, format: 'D.M.YYYY' },
                    { regex: /^\d{1,2}-[A-Za-z]+-\d{4}$/, format: 'D-MONTH-YYYY' },
                    { regex: /^\d{1,2} [A-Za-z]+, \d{4}$/, format: 'D MONTH, YYYY' },
                    { regex: /^\d{4}\/\d{1,2}\/\d{1,2}$/, format: 'YYYY/M/D' },
                    { regex: /^\d{4}-\d{1,2}-\d{1,2}$/, format: 'YYYY-M-D' },
                    { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'DD/MM/YYYY' },
                    { regex: /^\d{2}-[A-Za-z]{3}-\d{4}$/, format: 'DD-Mon-YYYY' },
                    { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
                    { regex: /^\d{2}-[A-Za-z]+-\d{4}$/, format: 'DD-MONTH-YYYY' },
                    { regex: /^\d{2} [A-Za-z]+, \d{4}$/, format: 'DD MONTH, YYYY' },
                    { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
                    { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
                    { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
                    { regex: /^\d{1,2} [A-Za-z]+ \d{4}$/, format: 'D MONTH YYYY' }
                ];
        
                for (var i = 0; i < dateFormats.length; i++) 
                {
                    var format = dateFormats[i];
                    if (format.regex.test(dateString)) 
                    {
                        var parts, year, month, day;
        
                        switch (format.format) 
                        {
                            case 'M/D/YYYY':
                            case 'D/M/YYYY':
                            case 'MM/DD/YYYY':
                            case 'DD/MM/YYYY':
                                parts = dateString.split('/');
                                if (format.format.startsWith('M') || format.format.startsWith('MM')) {
                                    month = parts[0];
                                    day = parts[1];
                                } else {
                                    day = parts[0];
                                    month = parts[1];
                                }
                                year = parts[2];
                                break;
                            case 'M/D/YY':
                                parts = dateString.split('/');
                                month = parts[0];
                                day = parts[1];
                                year = '20' + parts[2];
                                break;
                            case 'D-Mon-YYYY':
                            case 'DD-Mon-YYYY':
                                parts = dateString.split('-');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2];
                                break;
                            case 'D.M.YYYY':
                            case 'DD.MM.YYYY':
                                parts = dateString.split('.');
                                day = parts[0];
                                month = parts[1];
                                year = parts[2];
                                break;
                            case 'D-MONTH-YYYY':
                            case 'DD-MONTH-YYYY':
                                parts = dateString.split('-');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2];
                                break;
                            case 'D MONTH, YYYY':
                            case 'DD MONTH, YYYY':
                                parts = dateString.split(' ');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2].replace(',', '');
                                break;
                            case 'YYYY/M/D':
                            case 'YYYY/MM/DD':
                            case 'YYYY-M-D':
                            case 'YYYY-MM-DD':
                                parts = dateString.split(/[-\/]/);
                                year = parts[0];
                                if (format.format.endsWith('D')) {
                                    month = parts[1];
                                    day = parts[2];
                                } else {
                                    day = parts[1];
                                    month = parts[2];
                                }
                                break;
                            case 'D MONTH YYYY':
                                parts = dateString.split(' ');
                                day = parts[0];
                                month = new Date(Date.parse(parts[1] + " 1, 2012")).getMonth() + 1;
                                year = parts[2];
                                break;
                        }
        
                        var date = new Date(year, month - 1, day);
                        if (!isNaN(date.getTime())) {
                            return formatDate(date);
                        }
                    }
                }
                return null;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (parseDate) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Format date based on company preference
         */
        function formatDate(date) 
        {
            try 
            {
                return format.format({
                    value: date,
                    type: format.Type.DATE
                });
            } catch (err) {
                log.error({ title: strDebugTitle + ' (formatDate) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Remove highlight boxes from PDF
         */
        function removeHighlightBoxes() 
        {
            try
            {
                const highlightBoxes = document.querySelectorAll('.highlight-box');
                highlightBoxes.forEach(box => box.remove());
            } catch (err){
                log.error({ title: strDebugTitle + ' (removeHighlightBoxes) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Setup PDF interaction
         */
        function setupPdfInteraction() 
        {
            try
            {
                const pdfCanvas = document.getElementById('pdfCanvas');
                if (!pdfCanvas) return;
                const selectionBox = document.getElementById('selectionBox'); 
                if (!selectionBox) return;
                
                let isMouseDown = false;
                let startX, startY;
                
                pdfCanvas.addEventListener('click', function () 
                {
                    clearPdfHighlights();
                    if (lastHoveredItem) {
                        var capturedText = lastHoveredItem.str;
                        applySelectedPdfTextToField(capturedText);
                    }
                });
                
                pdfCanvas.addEventListener('mousedown', function(e) 
                {
                    const rect = pdfCanvas.getBoundingClientRect();
                    startX = e.clientX - rect.left;
                    startY = e.clientY - rect.top;
                    isMouseDown = true;
                
                    selectionBox.style.left = `${startX}px`;
                    selectionBox.style.top = `${startY}px`;
                    selectionBox.style.width = `0px`;
                    selectionBox.style.height = `0px`;
                    selectionBox.style.display = 'block';
                });
                
                pdfCanvas.addEventListener('mousemove', function(e) 
                {
                    if (!isMouseDown) return;
                
                    const rect = pdfCanvas.getBoundingClientRect();
                    const endX = e.clientX - rect.left;
                    const endY = e.clientY - rect.top;
                    const width = Math.abs(endX - startX);
                    const height = Math.abs(endY - startY);
                    selectionBox.style.width = `${width}px`;
                    selectionBox.style.height = `${height}px`;
                
                    if (endX < startX) {
                        selectionBox.style.left = `${endX}px`;
                    }
                    if (endY < startY) {
                        selectionBox.style.top = `${endY}px`;
                    }
                });
                
                pdfCanvas.addEventListener('mouseup', async function(e) 
                {
                    isMouseDown = false;
                    selectionBox.style.display = 'none';
                
                    const dragDistanceX = Math.abs(e.clientX - (startX + pdfCanvas.getBoundingClientRect().left));
                    const dragDistanceY = Math.abs(e.clientY - (startY + pdfCanvas.getBoundingClientRect().top));
                
                    if (dragDistanceX > 5 || dragDistanceY > 5) 
                    {
                        const selectedText = await captureSelectedText(startX, startY, e.clientX - pdfCanvas.getBoundingClientRect().left, e.clientY - pdfCanvas.getBoundingClientRect().top);
                        if (selectedText.length > 0) {
                            console.log('Selected Text:', selectedText.join('\n'));
                            applySelectedPdfTextToField(selectedText.join('\n'));
                        }
                    }
                });
                
                async function captureSelectedText(x1, y1, x2, y2) 
                {
                    const selectedText = [];
                    const minX = Math.min(x1, x2);
                    const maxX = Math.max(x1, x2);
                    const minY = Math.min(y1, y2);
                    const maxY = Math.max(y1, y2);
                
                    const lines = {};
                
                    for (let item of pdfTextContent) 
                    {
                        const left = item.transform[4] * pdfPageViewport.scale;
                        const top = pdfPageViewport.height - (item.transform[5] * pdfPageViewport.scale);
                        const width = item.width * pdfPageViewport.scale;
                        const height = item.height * pdfPageViewport.scale;
                
                        if (left + width >= minX && left <= maxX && top >= minY && top - height <= maxY) 
                        {
                            const lineY = Math.floor(top);
                            if (!lines[lineY]) {
                                lines[lineY] = [];
                            }
                
                            let charLeft = left;
                            const charWidth = width / item.str.length;
                
                            for (let i = 0; i < item.str.length; i++) 
                            {
                                const char = item.str[i];
                                if (charLeft + charWidth >= minX && charLeft <= maxX) {
                                    lines[lineY].push({ text: char, x: charLeft });
                                }
                                charLeft += charWidth;
                            }
                        }
                    }
                
                    const sortedLines = Object.keys(lines).sort((a, b) => a - b);
                    for (let line of sortedLines) 
                    {
                        lines[line].sort((a, b) => a.x - b.x);
                        selectedText.push(lines[line].map(item => item.text).join(''));
                    }
                
                    return selectedText;
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (setupPdfInteraction) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        function getAccountFromVendor(vendorId) {
            var rtnData = {};
        
            try {
                var vendorFields = search.lookupFields({
                    type: search.Type.VENDOR,
                    id: vendorId,
                    columns: [
                        'subsidiary',
                        'payablesaccount', // Replace with 'expenseaccount' if needed
                        'currency'
                    ]
                });
        
                rtnData = {
                    subsidiary: vendorFields.subsidiary ? vendorFields.subsidiary[0].value : null,
                    currency: vendorFields.currency ? vendorFields.currency[0].value : null,
                    expenseaccount: vendorFields.expenseaccount ? vendorFields.expenseaccount[0].value : null,
                    account: vendorFields.payablesaccount ? vendorFields.payablesaccount[0].value : null 
                };
        
            } catch (err) {
                log.error({
                    title: 'getAccountFromVendor Error',
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
            }
        
            return rtnData;
        }

        function getVendorBillStagingRecord(vendorToBill) 
        {
            var rtnData = [];
            try 
            {
                var vendorBillStagingSearch = search.create({
                    type: "customrecord_lstcptr_vendor_bill_process",
                    filters:
                    [
                        ["internalid","anyof",vendorToBill]
                    ],
                    columns:
                    [
                        search.createColumn({name: "custrecord_lstcptr_bill_number", label: "Bill Number"}),
                        search.createColumn({name: "custrecord_lstcptr_bill_date", label: "Bill Date"}),
                        search.createColumn({name: "custrecord_lstcptr_tran_amount_inc_tax", label: "Amount"}),
                        search.createColumn({name: "custrecord_lstcptr_vendor", label: "Vendor"}),
                        search.createColumn({name: "custrecord_lstcptr_process_status", label: "Process Status"}),
                    ]
                });
                rtnData = getAllSavedSearch(vendorBillStagingSearch);
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getVendorBillStagingRecord) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
            return rtnData;
        }
    
        /**
         * Fetch all search results
         */
        function getAllSavedSearch(savedSearch)
        {
            try 
            {
                var resultset = savedSearch.run();
                var returnSearchResults = [];
                var Index = 0;
                do {
                    var resultslice = resultset.getRange(Index, Index + 1000);
                    for (var rs in resultslice) {
                        returnSearchResults.push(resultslice[rs]);
                        Index++;
                    }
                } while (resultslice.length >= 1000);
            
                return returnSearchResults;
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getAllSavedSearch) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }

        /**
         * Highlight matching text in PDF
         */
        function highlightMatchingText(searchText) 
        {
            try 
            {
                if (!searchText) return;
                clearPdfHighlights();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = searchText;
                    searchInput.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (highlightMatchingText) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
    
        /**
         * Clear PDF highlights
         */
        function clearPdfHighlights() 
        {
            try
            {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.dispatchEvent(new Event('input'));
                }
            } catch (err){
                log.error({ title: strDebugTitle + ' (clearPdfHighlights) Error', details: JSON.stringify({ code: err.name, message: err.message}) });
            }
        }
        
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord
        };
    });