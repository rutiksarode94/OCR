/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
 * 
 * Name:            Create Vendor Bill Staging Record REST API (lstcapture_bill_process_rest_api.js)
 *
 * Version:         2.2.4   -   24-May-2025  -   PB.     -   Fixed nlobjSearchColumn error with correct file join
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This script is used to create vendor bill staging records using a custom RESTlet script
 *
 * Script:          customscript_lstcapture_bill_process_rest_api
 * Deploy:          customdeploy_lstcapture_bill_process_rest_api
 *
 * Notes:           Updated to handle files without recordId prefix, added new record selection logic based on filename,
 *                  created date, Nanonets updated date, status, and bill number. Fixed SSS_MISSING_REQD_ARGUMENT by saving
 *                  record before file attachment. Enhanced searchExistingRecord to prevent duplicate records on Nanonets
 *                  re-approval with case-insensitive filename matching and relaxed date comparison. Fixed nlobjSearchColumn
 *                  error by using correct 'file' join for custrecord_lstcptr_pdf_file.name, removed custrecord_lstcptr_filename.
 * 
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

var strDebugTitle = "lstcapture_bill_process_rest_api";

var nNanonetsSOStagingRecordFields = {
    "nanonets_header_fields": {
        "company_name": { "nanonets_id": "company_name", "ns_id": "" },
        "vendor_name": { "nanonets_id": "vendor_name", "ns_id": "custrecord_lstcptr_vendor" },
        "delivery_date": { "nanonets_id": "delivery_date", "ns_id": "" },
        "po_date": { "nanonets_id": "po_date", "ns_id": "" },
        "BillNumber": { "nanonets_id": "BillNumber", "ns_id": "" },
        "vendor_address": { "nanonets_id": "vendor_address", "ns_id": "" },
        "totaltax": { "nanonets_id": "totaltax", "ns_id": "custrecord_lstcptr_tran_tax_amount" },
        "total_amount": { "nanonets_id": "total_amount", "ns_id": "custrecord_lstcptr_tran_amount_inc_tax" },
        "Subsidiary": {"nanonets_id": "Subsidiary", "ns_id": "custrecord_lstcptr_subsidiary"}
    },
    "nanonets_item_fields": {
        "Description": { "nanonets_id": "Description", "ns_id": "" },
        "Line_amount": { "nanonets_id": "Line_amount", "ns_id": "" },
        "Unit_price": { "nanonets_id": "Unit_price", "ns_id": "" },
        "Quantity": { "nanonets_id": "Quantity", "ns_id": "" },
    },
    "nanonets_file_fields": {
        "filename": { "nanonets_id": "filename", "ns_id": "name" },
        "filetype": { "nanonets_id": "filetype", "ns_id": "" },
        "contents": { "nanonets_id": "contents", "ns_id": "" }
    },
};

define(['N/url', 'N/file', 'N/encode', 'N/search', 'N/record', 'N/config'], 
(url, file, encode, search, record, config) => {
    const FILE_TYPES = {
        "appcache": "APPCACHE", "pat": "AUTOCAD", "bmp": "BMPIMAGE", "csr": "CERTIFICATE", "config": "CONFIG",
        "csv": "CSV", "xlsx": "EXCEL", "xls": "EXCEL", "flash": "FLASH", "ftl": "FREEMARKER", "gif": "GIFIMAGE",
        "html": "HTMLDOC", "icon": "ICON", "js": "JAVASCRIPT", "jpg": "JPGIMAGE", "tiff": "TIFFIMAGE", "tif": "TIFFIMAGE",
        "json": "JSON", "eml": "MESSAGERFC", "mp3": "MP3", "m4a": "MPEGMOVIE", "mpp": "MSPROJECT", "pdf": "PDF",
        "pjpg": "PJPGIMAGE", "txt": "PLAINTEXT", "png": "PNGIMAGE", "ps": "POSTSCRIPT", "ppt": "POWERPOINT",
        "mov": "QUICKTIME", "rtf": "RTF", "css": "SCSS", "sms": "SMS", "svg": "SVG", "tar": "TAR", "vsdx": "VISIO",
        "htm": "WEBAPPPAGE", "gs": "WEBAPPSCRIPT", "doc": "WORD", "docx": "WORD", "xml": "XMLDOC", "xsd": "XSD", "zip": "ZIP"
    };

    const doPost = (requestBody) => {
        log.debug({ title: `${strDebugTitle} - POST`, details: 'Starting POST request processing' });
        try {
            if (!isValidObject(requestBody)) {
                log.error({ title: `${strDebugTitle} - Validation`, details: 'Invalid request body' });
                return JSON.stringify(createErrorResponse("Invalid Request", "Request body data is required!"));
            }

            const result = new RecordRESTlet().postFunction(requestBody);
            log.debug({ title: `${strDebugTitle} - POST`, details: 'POST request processing completed' });
            return JSON.stringify(result);
        } catch (err) {
            log.error({ title: `${strDebugTitle} - POST Error`, details: `Error: ${err.name} - ${err.message}` });
            return JSON.stringify(createErrorResponse(err.name, err.message));
        }
    };

    const RecordRESTlet = function() {};

    RecordRESTlet.prototype.postFunction = function(requestBody) {
        try {
            log.debug({ title: `${strDebugTitle} - PostFunction`, details: `Request Body: ${JSON.stringify(requestBody)}` });

            if (Object.keys(requestBody).length === 0) {
                throw new Error("Empty request body");
            }

            let attachedFileId = "";
            let jsonFileId = "";
            let recordId = "";
            let isUpdate = false;
            let recordObj;

            // Check for existing record based on file name, dates, status, and bill number
            if (Array.isArray(requestBody.originalfile) && requestBody.originalfile.length > 0) {
                const fileName = requestBody.originalfile[0].filename;
                log.debug({ title: `${strDebugTitle} - File Name Check`, details: `Checking for existing record with file name: ${fileName}` });

                const existingRecordId = searchExistingRecord(fileName, requestBody.nanonets_updated_at, requestBody.BillNumber);
                if (existingRecordId) {
                    isUpdate = true;
                    recordId = existingRecordId;
                    recordObj = record.load({
                        type: "customrecord_lstcptr_vendor_bill_process",
                        id: recordId,
                        isDynamic: false
                    });
                    log.debug({ title: `${strDebugTitle} - Record`, details: `Found existing record ID: ${recordId}, proceeding to update` });
                }
            }

            // Create new record if no existing record found
            if (!isUpdate) {
                recordObj = record.create({
                    type: "customrecord_lstcptr_vendor_bill_process",
                    isDynamic: false
                });
                log.debug({ title: `${strDebugTitle} - Record`, details: `Creating new record` });
            }

            const companyPrefs = config.load({ type: config.Type.COMPANY_PREFERENCES });
            const dateFormat = companyPrefs.getValue({ fieldId: "DATEFORMAT" });
            log.debug({ title: `${strDebugTitle} - Config`, details: `Date Format: ${dateFormat}` });

            // Process header fields
            for (let fieldId in requestBody) {
                if (fieldId !== "items" && fieldId !== "originalfile" && isValidString(requestBody[fieldId])) {
                    const nsFieldId = nNanonetsSOStagingRecordFields.nanonets_header_fields[fieldId]?.ns_id;
                    if (nsFieldId) {
                        setFieldValue(recordObj, nsFieldId, requestBody[fieldId], dateFormat);
                    }
                }
            }

            // Set fields based on create or update
            if (isUpdate) {
                // Update-specific fields
                recordObj.setValue("custrecord_lstcptr_process_status", "1"); // Processing Complete
                log.debug({ title: `${strDebugTitle} - Record Update`, details: `Set custrecord_lstcptr_process_status=1` });
            } else {
                // Create-specific fields
                recordObj.setValue("custrecord_lstcptr_transaction_type", "2"); // Updated to 2 as per requirement
                recordObj.setValue("custrecord_lstcptr_provider", "2"); // Updated to 3 as per requirement
                recordObj.setValue("custrecord_lstcptr_process_status", "1"); // Processing Complete
                recordObj.setValue("custrecord_lstcptr_date_receiced_to_ocr", new Date());
                recordObj.setValue("custrecord_lstcptr_date_sent_to_ocr", new Date());
                recordObj.setValue("custrecord_lstcptr_subsidiary",);
                recordObj.setValue("custrecord_lstcptr_vendor", );
                log.debug({ title: `${strDebugTitle} - Record Create`, details: `Set default fields for new record` });
            }

            // Process additional fields and items
            if (Array.isArray(requestBody.items)) {
                log.debug({ title: `${strDebugTitle} - Items`, details: `Processing ${requestBody.items.length} items` });  
                log.debug({ title: `${strDebugTitle} - Items`, details: `Items: ${JSON.stringify(requestBody.items)}` });
                const vendorId = getVendorId(requestBody.vendor_name);
                log.debug({ title: `${strDebugTitle} - Vendor`, details: `Vendor ID: ${vendorId}` });
                const subsidiaryId = getSubsidiaryId(requestBody.Subsidiary || "");
                log.debug({ title: `${strDebugTitle} - Subsidiary`, details: `Subsidiary ID: ${subsidiaryId}` });
                const totalTax = requestBody.totaltax || 0;
                log.debug({ title: `${strDebugTitle} - Tax Amount`, details: `Tax Amount: ${totalTax}` });
                const amount = requestBody.total_amount || 0;
                log.debug({ title: `${strDebugTitle} - Amount`, details: `Amount: ${amount}` });    
                const billNumber = requestBody.BillNumber || "";
                log.debug({ title: `${strDebugTitle} - Bill Number`, details: `Bill Number: ${billNumber}` });

                log.debug({
                    title: `${strDebugTitle} - Header`,
                    details: `Vendor: ${requestBody.vendor_name} (ID: ${vendorId}), Subsidiary: ${requestBody.Subsidiary} (ID: ${subsidiaryId}), Tax: ${totalTax}, Amount: ${amount}, Bill Number: ${billNumber}`
                });

                const itemDetails = requestBody.items.map(item => 
                    `${item.Description}:${item.Line_amount}`).join(", ");
                log.debug({ title: `${strDebugTitle} - Items`, details: `Item Details: ${itemDetails}` });

                recordObj.setValue("custrecord_lstcptr_tran_status", "2");
                recordObj.setValue("custrecord_lstcptr_subsidiary", subsidiaryId);
                log.debug({ title: `${strDebugTitle} - Record`, details: `Set subsidiary ID: ${subsidiaryId}` });   
                recordObj.setValue("custrecord_lstcptr_vendor", vendorId);
                log.debug({ title: `${strDebugTitle} - Record`, details: `Set vendor ID: ${vendorId}` });
                recordObj.setValue("custrecord_lstcptr_tran_tax_amount", totalTax);
                log.debug({ title: `${strDebugTitle} - Record`, details: `Set tax amount: ${totalTax}` });
                recordObj.setValue("custrecord_lstcptr_bill_number", billNumber);
                log.debug({ title: `${strDebugTitle} - Record`, details: `Set bill number: ${billNumber}` });   
                recordObj.setValue("custrecord_lstcptr_json_item_data", JSON.stringify(requestBody.items));
                log.debug({ title: `${strDebugTitle} - Record`, details: `Set JSON item data` });   
            } else {
                log.debug({ title: `${strDebugTitle} - Items`, details: 'No items provided in request' });
            }

            // Save the record before attaching files
            recordId = recordObj.save();
            log.debug({ title: `${strDebugTitle} - Record`, details: `${isUpdate ? 'Updated' : 'Created'} Record ID: ${recordId}` });

            // Handle file attachments after saving the record
            if (Array.isArray(requestBody.originalfile) && requestBody.originalfile.length > 0) {
                const folderId = getFileFolderID("LSTCapture Files");
                log.debug({ title: `${strDebugTitle} - File`, details: `Folder ID: ${folderId}` });

                if (isValidString(folderId)) {
                    const fileData = requestBody.originalfile[0];
                    const fileExt = fileData.filename.split('.').pop().toLowerCase();
                    const fileType = FILE_TYPES[fileExt] || "PDF";
                    let contents = fileData.contents;

                    // Create and save original file
                    if (fileExt === "txt" || fileExt === "csv") {
                        contents = encode.convert({
                            string: contents,
                            inputEncoding: encode.Encoding.BASE_64,
                            outputEncoding: encode.Encoding.UTF_8
                        });
                        log.debug({ title: `${strDebugTitle} - File`, details: `Converted ${fileExt} contents to UTF-8` });
                    }

                    const fileObj = file.create({
                        name: fileData.filename,
                        fileType: file.Type[fileType],
                        contents: contents,
                        folder: Number(folderId)
                    });

                    attachedFileId = fileObj.save();
                    log.debug({ title: `${strDebugTitle} - File`, details: `Saved File ID: ${attachedFileId}` });

                    if (isValidString(attachedFileId)) {
                        // Attach original file to the saved record
                        record.attach({
                            record: { type: 'file', id: attachedFileId },
                            to: { type: 'customrecord_lstcptr_vendor_bill_process', id: recordId },
                            role: 'file'
                        });
                        log.debug({ title: `${strDebugTitle} - File Attachment`, details: `File ${attachedFileId} attached to record ${recordId}` });

                        // Set PDF file and file ID fields
                        recordObj = record.load({
                            type: "customrecord_lstcptr_vendor_bill_process",
                            id: recordId,
                            isDynamic: false
                        });
                        recordObj.setValue("custrecord_lstcptr_pdf_file", attachedFileId);
                        recordObj.setValue("custrecord_lstcptr_file_id", attachedFileId);
                        log.debug({ title: `${strDebugTitle} - Record`, details: `File ${attachedFileId} set to custrecord_lstcptr_pdf_file and custrecord_lstcptr_file_id` });
                        recordObj.save(); // Save again to update file fields
                    }

                    // Save request body as JSON file
                    const jsonFileName = fileData.filename.split('.')[0] + "_req.json";
                    const jsonFile = file.create({
                        name: jsonFileName,
                        fileType: file.Type.JSON,
                        contents: JSON.stringify(requestBody),
                        folder: Number(folderId)
                    });
                    jsonFileId = jsonFile.save();
                    log.debug({ title: `${strDebugTitle} - File`, details: `Saved JSON File ID: ${jsonFileId}` });

                    if (isValidString(jsonFileId)) {
                        // Attach JSON file to the saved record
                        record.attach({
                            record: { type: 'file', id: jsonFileId },
                            to: { type: 'customrecord_lstcptr_vendor_bill_process', id: recordId },
                            role: 'file'
                        });
                        log.debug({ title: `${strDebugTitle} - File Attachment`, details: `JSON File ${jsonFileId} attached to record ${recordId}` });
                    }
                } else {
                    log.error({ title: `${strDebugTitle} - File`, details: 'Failed to get or create folder' });
                }
            } else {
                log.debug({ title: `${strDebugTitle} - File`, details: 'No original file provided in request' });
            }

            return createSuccessResponse(recordId);

        } catch (err) {
            log.error({ title: `${strDebugTitle} - PostFunction Error`, details: `Error: ${err.name} - ${err.message}` });
            return createErrorResponse(err.name, err.message);
        }
    };

    const searchExistingRecord = (fileName, nanonetsUpdatedAt, billNumber) => {
        try {
            // Normalize filename for case-insensitive matching
            const normalizedFileName = fileName.toLowerCase().trim();
            log.debug({ 
                title: `${strDebugTitle} - Record Search`, 
                details: `Searching for record with normalized file name: ${normalizedFileName}, nanonets_updated_at: ${nanonetsUpdatedAt}, billNumber: ${billNumber}` 
            });

            let filters = [
                ["file.name", "contains", normalizedFileName],
                "AND",
                ["isinactive", "is", "F"]
            ];

            // Compare date part only, if provided
            if (isValidString(nanonetsUpdatedAt)) {
                const updatedAtDate = new Date(nanonetsUpdatedAt.split("T")[0]);
                filters.push("AND");
                filters.push(["created", "on", updatedAtDate]);
            }

            const searchResults = search.create({
                type: "customrecord_lstcptr_vendor_bill_process",
                filters: filters,
                columns: [
                    "internalid",
                    "created",
                    "lastmodified",
                    "custrecord_lstcptr_process_status",
                    "custrecord_lstcptr_bill_number",
                    search.createColumn({
                        name: "name",
                        join: "file"
                    })
                ]
            }).run().getRange({ start: 0, end: 1000 });

            log.debug({ 
                title: `${strDebugTitle} - Record Search`, 
                details: `Found ${searchResults.length} records for file name: ${normalizedFileName}` 
            });

            if (searchResults.length === 0) {
                log.debug({ title: `${strDebugTitle} - Record Search`, details: `No records found for file name: ${normalizedFileName}` });
                return "";
            }

            // Log details of found records
            searchResults.forEach((result, index) => {
                log.debug({
                    title: `${strDebugTitle} - Record Search Result ${index + 1}`,
                    details: `ID: ${result.getValue("internalid")}, File Name: ${result.getValue({name: "name", join: "file"})}, Created: ${result.getValue("created")}, Last Modified: ${result.getValue("lastmodified")}, Status: ${result.getValue("custrecord_lstcptr_process_status")}, Bill Number: ${result.getValue("custrecord_lstcptr_bill_number")}`
                });
            });

            // If multiple records found, filter by status and bill number
            if (searchResults.length > 1) {
                // First, try to find records with status 4
                const status4Records = searchResults.filter(result => 
                    result.getValue("custrecord_lstcptr_process_status") === "4"
                );

                if (status4Records.length === 1) {
                    const recordId = status4Records[0].getValue("internalid");
                    log.debug({ title: `${strDebugTitle} - Record Search`, details: `Found single record with status 4, ID: ${recordId}` });
                    return recordId;
                }

                // If no status 4 or multiple status 4, try bill number
                if (isValidString(billNumber)) {
                    const billNumberRecords = searchResults.filter(result => 
                        result.getValue("custrecord_lstcptr_bill_number") === billNumber
                    );

                    if (billNumberRecords.length === 1) {
                        const recordId = billNumberRecords[0].getValue("internalid");
                        log.debug({ title: `${strDebugTitle} - Record Search`, details: `Found single record with bill number ${billNumber}, ID: ${recordId}` });
                        return recordId;
                    }
                }

                // If still multiple records, return the most recently modified one
                const latestRecord = searchResults.reduce((latest, current) => {
                    const currentModified = new Date(current.getValue("lastmodified"));
                    const latestModified = new Date(latest.getValue("lastmodified"));
                    return currentModified > latestModified ? current : latest;
                });
                const recordId = latestRecord.getValue("internalid");
                log.debug({ title: `${strDebugTitle} - Record Search`, details: `Multiple records found, selected most recently modified record ID: ${recordId}` });
                return recordId;
            }

            // If single record found, return it
            const recordId = searchResults[0].getValue("internalid");
            log.debug({ title: `${strDebugTitle} - Record Search`, details: `Found single record ID: ${recordId} for file name: ${normalizedFileName}` });
            return recordId;

        } catch (err) {
            log.error({ title: `${strDebugTitle} - searchExistingRecord Error`, details: err.message });
            return "";
        }
    };

    const setFieldValue = (recordObj, fieldId, value, dateFormat) => {
        const field = recordObj.getField({ fieldId });
        if (!field) return;
    
        try {
            if (field.type === "date") {
                const formattedDate = getJSDateFormat(value, dateFormat);
                if (isValidString(formattedDate)) {
                    recordObj.setText({ fieldId: fieldId, text: formattedDate });
                }
            } else if (field.type === "timeofday") {
                recordObj.setText({ fieldId: fieldId, text: value });
            } else {
                recordObj.setValue({ fieldId: fieldId, value: value });
            }
    
            log.debug({ title: strDebugTitle + ' - Field', details: 'Set ' + fieldId + ' to ' + value });
        } catch (e) {
            log.error({ title: strDebugTitle + ' - setFieldValue Error', details: 'Field ' + fieldId + ': ' + e.message });
        }
    };

    const getFileFolderID = (folderName) => {
        try {
            const searchResults = search.create({
                type: search.Type.FOLDER,
                filters: [["name", "is", folderName]],
                columns: ["internalid"]
            }).run().getRange({ start: 0, end: 1 });

            if (searchResults.length > 0) {
                return searchResults[0].getValue("internalid");
            }

            const folderRecord = record.create({ type: record.Type.FOLDER, isDynamic: true });
            folderRecord.setValue("name", folderName);
            const folderId = folderRecord.save();
            log.debug({ title: `${strDebugTitle} - Folder`, details: `Created Folder ID: ${folderId}` });
            return folderId;
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getFileFolderID Error`, details: err.message });
            return "";
        }
    };

    const getJSDateFormat = (dateStr, dateFormat) => {
        if (!isValidString(dateStr) || dateStr === "T00:00:00Z") return "";

        try {
            const [year, month, day] = dateStr.split("T")[0].split("-");
            switch (dateFormat) {
                case "M/D/YYYY": case "MM/DD/YYYY": return `${month}/${day}/${year}`;
                case "D/M/YYYY": case "DD/MM/YYYY": return `${day}/${month}/${year}`;
                case "D-Mon-YYYY": case "DD-Mon-YYYY": 
                    return `${day}-${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(month, 10)]}-${year}`;
                case "D.M.YYYY": case "DD.MM.YYYY": return `${day}.${month}.${year}`;
                case "D-MONTH-YYYY": case "DD-MONTH-YYYY": 
                    return `${day}-${['', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][parseInt(month, 10)]}-${year}`;
                case "D MONTH, YYYY": case "DD MONTH, YYYY": 
                    return `${day} ${['', 'JANUARY,', 'FEBRUARY,', 'MARCH,', 'APRIL,', 'MAY,', 'JUNE,', 'JULY,', 'AUGUST,', 'SEPTEMBER,', 'OCTOBER,', 'NOVEMBER,', 'DECEMBER,'][parseInt(month, 10)]} ${year}`;
                case "YYYY/M/D": case "YYYY/MM/DD": return `${year}/${month}/${day}`;
                case "YYYY-M-D": case "YYYY-MM-DD": return `${year}-${month}-${day}`;
                default: return dateStr;
            }
        } catch (err) {
            log.error({ title: `${strDebugTitle} - getJSDateFormat Error`, details: err.message });
            return "";
        }
    };

    const getVendorId = (vendorName) => {
        if (!isValidString(vendorName)) return "";
        try {
            const searchResults = search.create({
                type: search.Type.VENDOR,
                filters: [
                    ["entityid", "is", vendorName],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: ["internalid"]
            }).run().getRange({ start: 0, end: 1 });

            const vendorId = searchResults.length > 0 ? searchResults[0].getValue("internalid") : "";
            log.debug({
                title: `${strDebugTitle} - Vendor`,
                details: `Vendor Name: ${vendorName}, ID: ${vendorId}`
            });
            return vendorId;
        } catch (e) {
            log.error({
                title: `${strDebugTitle} - getVendorId Error`,
                details: e.message
            });
            return "";
        }
    };

    const getSubsidiaryId = (subsidiaryName) => {
        var strDebugTitle = "getSubsidiaryId";
        log.debug({ title: `${strDebugTitle} - Subsidiary`, details: `Subsidiary Name: ${subsidiaryName}` });
        if (!isValidString(subsidiaryName)) return "";
        try {
            const searchResults = search.create({
                type: search.Type.SUBSIDIARY,
                filters: [
                    ["name", "is", subsidiaryName],
                    "AND",
                    ["isinactive", "is", "F"]
                ],
                columns: ["internalid"]
            }).run().getRange({ start: 0, end: 1 });

            const subsidiaryId = searchResults.length > 0 ? searchResults[0].getValue("internalid") : "";
            log.debug({
                title: `${strDebugTitle} - Subsidiary`,
                details: `Subsidiary Name: ${subsidiaryName}, ID: ${subsidiaryId}`
            });
            return subsidiaryId;
        } catch (e) {
            log.error({
                title: `${strDebugTitle} - getSubsidiaryId Error`,
                details: e.message
            });
            return "";
        }
    };

    const createSuccessResponse = (recordId) => {
        const domain = url.resolveDomain({ hostType: url.HostType.APPLICATION });
        const recordUrl = url.resolveRecord({ recordType: "customrecord_lstcptr_vendor_bill_process", recordId });
        return {
            metadata: { error: null, message: "Record Created Successfully" },
            recordid: recordId
        };
    };

    const createErrorResponse = (code, message) => ({
        metadata: { error: { code, message }, message: "Script Error" },
        recordid: ""
    });

    const isValidString = (value) => value != null && value !== '' && value !== ' ' && value !== 'null' && value !== 'undefined' && value !== NaN;

    const isValidObject = (obj) => isValidString(obj) && Object.keys(obj).length > 0;

    return { post: doPost };
});