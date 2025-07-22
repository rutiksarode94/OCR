/*********************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            Create Vendor Bill Staging Record REST API (lstcapture_bill_process_rest_api.js)
 *
 * Version:         2.2.4   -   24-May-2025  -   PB.     -   Fixed nlobjSearchColumn error with correct file join
 * Version:         2.2.5   -   16-Jul-2025  -   [Your Name] - Refactored to use lstcptr_constants.js
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
 *                  Refactored to use constants from lstcptr_constants.js, fixed typo in custrecord_lstcptr_date_sent_to_ocr,
 *                  removed redundant vendorRecord load, and improved isValidString for date handling.
 *
 * Dependencies:    lstcptr_constants.js
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/file', 'N/encode', 'N/search', 'N/record', 'N/config', './lstcptr_constants'],
    (url, file, encode, search, record, config, constants) => {
        const strDebugTitle = constants.BILL_PROCESS_REST_API_DEBUG_TITLE;

        // Validate constants loading
        if (!constants || !constants.VENDOR_BILL_STAGING_FIELDS || !constants.NANONETS_FIELDS) {
            log.error({ title: strDebugTitle, details: 'Constants module or required fields not loaded properly' });
            throw new Error('Constants module failed to load');
        }

        const doPost = (requestBody) => {
            log.debug({ title: `${strDebugTitle} - POST`, details: `Received request body: ${JSON.stringify(requestBody)}` });
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

        const RecordRESTlet = function () { };

        RecordRESTlet.prototype.postFunction = function (requestBody) {
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

                    const existingRecordId = searchExistingRecord(fileName, requestBody.nanonets_uploaded_at, requestBody.BillNumber);
                    if (existingRecordId) {
                        isUpdate = true;
                        recordId = existingRecordId;
                        recordObj = record.load({
                            type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                            id: recordId,
                            isDynamic: false
                        });
                        log.debug({ title: `${strDebugTitle} - Record`, details: `Found existing record ID: ${recordId}, proceeding to update` });
                    }
                }

                // Create new record if no existing record found
                if (!isUpdate) {
                    recordObj = record.create({
                        type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
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
                        const nsFieldId = constants.NANONETS_FIELDS.HEADER_FIELDS[fieldId]?.ns_id;
                        if (nsFieldId) {
                            setFieldValue(recordObj, nsFieldId, requestBody[fieldId], dateFormat);
                        }
                    }
                }

                // Set fields based on create or update
                if (isUpdate) {
                    // Update-specific fields
                    recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS, constants.PROCESS_STATUSES.PROCEED);
                    recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.DATE_SENT_TO_OCR, new Date());
                    log.debug({ title: `${strDebugTitle} - Record Update`, details: `Set ${constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS}=${constants.PROCESS_STATUSES.PROCEED}` });
                } else {
                    // Create-specific fields
                    recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.TRANSACTION_TYPE, "1"); // Hardcoded as per requirement
                    recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.PROVIDER, "2"); // Hardcoded as per requirement
                    recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS, constants.PROCESS_STATUSES.PROCEED);
                    recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.DATE_SENT_TO_OCR, new Date());
                    log.debug({ title: `${strDebugTitle} - Record Create`, details: `Set default fields for new record` });
                }

                // Process additional fields and items
                if (Array.isArray(requestBody.items)) {
                    log.debug({ title: `${strDebugTitle} - Items`, details: `Processing ${requestBody.items.length} items` });
                    log.debug({ title: `${strDebugTitle} - Items`, details: `Items: ${JSON.stringify(requestBody.items)}` });
                    const vendorId = getVendorId(requestBody.vendor_name || "");
                    log.audit({ title: `${strDebugTitle} - Vendor`, details: `Vendor ID: ${vendorId}` });
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

                    if (subsidiaryId) {
                        try {
                            recordObj.setValue({
                                fieldId: constants.VENDOR_BILL_STAGING_FIELDS.SUBSIDIARY,
                                value: subsidiaryId
                            });
                            log.debug({
                                title: "Subsidiary Set",
                                details: `Updated subsidiary to: ${subsidiaryId}`
                            });
                        } catch (e) {
                            log.error({
                                title: "Subsidiary Set Error",
                                details: `Error setting subsidiary: ${e.message}`
                            });
                        }
                    } else {
                        log.debug({
                            title: "Subsidiary Not Set",
                            details: "No subsidiaryId provided. Keeping existing value."
                        });
                    }

                    if (vendorId) {
                        try {
                            log.audit({ title: `${strDebugTitle} - Record`, details: `Setting vendor ID: ${vendorId}` });
                            recordObj.setValue({
                                fieldId: constants.VENDOR_BILL_STAGING_FIELDS.VENDOR,
                                value: vendorId
                            });
                            log.debug({ title: `${strDebugTitle} - Record`, details: `Set vendor ID: ${vendorId}` });
                        } catch (e) {
                            log.error({ title: `${strDebugTitle} - Record`, details: `Error setting vendor ID: ${e.message}` });
                        }
                    } else {
                        log.debug({ title: `${strDebugTitle} - Record`, details: "Vendor ID not provided, keeping existing value." });
                    }

                    if (totalTax != null && !isNaN(totalTax)) {
                        recordObj.setValue({
                            fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_TAX_AMOUNT,
                            value: totalTax
                        });
                        log.debug({ title: `${strDebugTitle} - Record`, details: `Set tax amount: ${totalTax}` });
                    } else {
                        log.debug({ title: `${strDebugTitle} - Record`, details: "Total tax not provided, keeping existing value." });
                    }

                    if (amount != null && !isNaN(amount) && totalTax != null && !isNaN(totalTax)) {
                        const tranAmount = amount + totalTax;
                        recordObj.setValue({
                            fieldId: constants.VENDOR_BILL_STAGING_FIELDS.TRAN_AMOUNT_INC_TAX,
                            value: tranAmount
                        });
                        log.debug({ title: `${strDebugTitle} - Record`, details: `Set transaction amount: ${tranAmount}` });
                    } else {
                        log.debug({ title: `${strDebugTitle} - Record`, details: "Amount or tax not provided, keeping transaction amount as is." });
                    }

                    if (isValidString(billNumber)) {
                        recordObj.setValue({
                            fieldId: constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER,
                            value: billNumber
                        });
                        log.debug({ title: `${strDebugTitle} - Record`, details: `Set bill number: ${billNumber}` });
                    } else {
                        log.debug({ title: `${strDebugTitle} - Record`, details: "Bill number not provided, keeping existing value." });
                    }

                    // recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.JSON_ITEM_DATA, JSON.stringify(requestBody.items));
                    log.debug({ title: `${strDebugTitle} - Record`, details: `Set JSON item data` });
                } else {
                    log.debug({ title: `${strDebugTitle} - Items`, details: 'No items provided in request' });
                }

                // Save the record before attaching files
                recordId = recordObj.save();
                log.debug({ title: `${strDebugTitle} - Record`, details: `${isUpdate ? 'Updated' : 'Created'} Record ID: ${recordId}` });

                // Handle file attachments after saving the record
                if (Array.isArray(requestBody.originalfile) && requestBody.originalfile.length > 0) {
                    const FileFolderId = getFileFolderID(constants.FOLDER_IDS.LSTCAPTURE_FILES);
                    log.debug({ title: `${strDebugTitle} - File`, details: `Folder ID: ${FileFolderId}` });

                    if (isValidString(FileFolderId)) {
                        const fileData = requestBody.originalfile[0];
                        const fileExt = fileData.filename.split('.').pop().toLowerCase();
                        const fileType = constants.FILE_VIEWER.SUPPORTED_UPLOAD_EXTENSIONS.includes(fileExt) ? file.Type.PDF : file.Type.PDF; // Default to PDF
                        let contents = fileData.contents;

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
                            fileType: fileType,
                            contents: contents,
                            folder: Number(FileFolderId)
                        });

                        attachedFileId = fileObj.save();
                        log.debug({ title: `${strDebugTitle} - File`, details: `Saved File ID: ${attachedFileId}` });
                        const jsonFileFolderId = getFileFolderID(constants.FOLDER_IDS.JSON_FILES);
                        log.debug({ title: `${strDebugTitle} - File`, details: `JSON Folder ID: ${jsonFileFolderId}` });

                        if (isValidString(attachedFileId)) {
                            record.attach({
                                record: { type: 'file', id: attachedFileId },
                                to: { type: constants.RECORD_TYPES.VENDOR_BILL_STAGING, id: recordId },
                                role: 'file'
                            });
                            log.debug({ title: `${strDebugTitle} - File Attachment`, details: `File ${attachedFileId} attached to record ${recordId}` });

                            const jsonFileName = fileData.filename.split('.')[0] + "_req.json";
                            const jsonFile = file.create({
                                name: jsonFileName,
                                fileType: file.Type.JSON,
                                contents: JSON.stringify(requestBody),
                                folder: Number(jsonFileFolderId)
                            });
                            jsonFileId = jsonFile.save();
                            log.debug({ title: `${strDebugTitle} - File`, details: `Saved JSON File ID: ${jsonFileId}` });

                            if (isValidString(jsonFileId)) {
                                recordObj = record.load({
                                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                                    id: recordId,
                                    isDynamic: false
                                });
                                recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.JSON_FILEID, jsonFileId);
                                recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE, attachedFileId);
                                recordObj.setValue(constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILEID, attachedFileId);
                                log.debug({ title: `${strDebugTitle} - Record`, details: `File ${attachedFileId} set to ${constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE} and ${constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILEID}` });
                                recordObj.save();
                                record.attach({
                                    record: { type: 'file', id: jsonFileId },
                                    to: { type: constants.RECORD_TYPES.VENDOR_BILL_STAGING, id: recordId },
                                    role: 'file'
                                });
                                log.debug({ title: `${strDebugTitle} - File Attachment`, details: `JSON File ${jsonFileId} attached to record ${recordId}` });
                            }
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
                log.audit({
                    title: `${strDebugTitle} - Record Search`,
                    details: `Searching for record with file name: ${fileName}, nanonets_updated_at: ${nanonetsUpdatedAt}, process_status: ${constants.PROCESS_STATUSES.PENDING} or ${constants.PROCESS_STATUSES.NOT_STARTED}, billNumber: ${billNumber}`
                });
                var fileId = getFileId(fileName);
                log.debug("File Id: ", fileId);

                let filters = [
                    [constants.VENDOR_BILL_STAGING_FIELDS.PDF_FILE, "is", fileId],
                    "AND",
                    ["isinactive", "is", "F"],
                    "AND",
                    [constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS, "noneof", [constants.PROCESS_STATUSES.TRANSACTION_COMPLETE]]
                ];

                // if (isValidString(nanonetsUpdatedAt)) {
                //     const updatedAtDate = new Date(nanonetsUpdatedAt.split("T")[0]);
                //     filters.push("AND");
                //     filters.push(["created", "on", updatedAtDate]);
                // }

                const searchResults = search.create({
                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                    filters: filters,
                    columns: [
                        constants.STANDARD_FIELDS.FILE.INTERNAL_ID,
                        "created",
                        "lastmodified",
                        constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS,
                        constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER,
                        // search.createColumn({
                        //     name: constants.STANDARD_FIELDS.FILE.NAME,
                        //     join: "file"
                        // })
                    ]
                }).run().getRange({ start: 0, end: 1000 });

                log.debug({
                    title: `${strDebugTitle} - Record Search`,
                    details: `Found ${searchResults.length} records for file name: ${fileName}`
                });

                if (searchResults.length === 0) {
                    log.debug({ title: `${strDebugTitle} - Record Search`, details: `No records found for file name: ${fileName}` });
                    return "";
                }

                searchResults.forEach((result, index) => {
                    log.debug({
                        title: `${strDebugTitle} - Record Search Result ${index + 1}`,
                        details: `ID: ${result.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID)}, File Name: ${result.getValue({ name: constants.STANDARD_FIELDS.FILE.NAME, join: "file" })}, Created: ${result.getValue("created")}, Last Modified: ${result.getValue("lastmodified")}, Status: ${result.getValue(constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS)}, Bill Number: ${result.getValue(constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER)}`
                    });
                });

                if (searchResults.length > 1) {
                    // const statusNotStartedRecords = searchResults.filter(result =>
                    //     result.getValue(constants.VENDOR_BILL_STAGING_FIELDS.PROCESS_STATUS) === constants.PROCESS_STATUSES.NOT_STARTED
                    // );

                    // if (statusNotStartedRecords.length === 1) {
                    //     const recordId = statusNotStartedRecords[0].getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                    //     log.debug({ title: `${strDebugTitle} - Record Search`, details: `Found single record with status ${constants.PROCESS_STATUSES.NOT_STARTED}, ID: ${recordId}` });
                    //     return recordId;
                    // }

                    if (isValidString(billNumber)) {
                        const billNumberRecords = searchResults.filter(result =>
                            result.getValue(constants.VENDOR_BILL_STAGING_FIELDS.BILL_NUMBER) === billNumber
                        );

                        if (billNumberRecords.length === 1) {
                            const recordId = billNumberRecords[0].getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                            log.debug({ title: `${strDebugTitle} - Record Search`, details: `Found single record with bill number ${billNumber}, ID: ${recordId}` });
                            return recordId;
                        }
                    }

                    const latestRecord = searchResults.reduce((latest, current) => {
                        const currentModified = new Date(current.getValue("lastmodified"));
                        const latestModified = new Date(latest.getValue("lastmodified"));
                        return currentModified > latestModified ? current : latest;
                    });
                    const recordId = latestRecord.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                    log.debug({ title: `${strDebugTitle} - Record Search`, details: `Multiple records found, selected most recently modified record ID: ${recordId}` });
                    return recordId;
                }

                const recordId = searchResults[0].getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                log.debug({ title: `${strDebugTitle} - Record Search`, details: `Found single record ID: ${recordId} for file name: ${fileName}` });
                return recordId;
            } catch (err) {
                log.error({ title: `${strDebugTitle} - searchExistingRecord Error`, details: err.message });
                return "";
            }
        };

        const getFileId = (fileName) => {
            try {
                log.debug({ title: `${strDebugTitle} - getFileId`, details: `Searching for file with name: ${fileName}` });
                var folderId = getFileFolderID(constants.FOLDER_IDS.LSTCAPTURE_FILES);
                log.debug({ title: `${strDebugTitle} - getFileId`, details: `Folder ID: ${folderId}` });
                const searchResults = search.create({
                    type: 'file',
                    filters: [
                        ["name", "is", fileName],
                        'AND',
                        ['folder', 'is', folderId]
                    ],
                    columns: [constants.STANDARD_FIELDS.FILE.INTERNAL_ID]
                }).run().getRange({ start: 0, end: 1 });
                log.debug({ title: `${strDebugTitle} - getFileId`, details: `Found ${searchResults.length} files for name: ${fileName}` });
                if (searchResults.length > 0) {
                    const fileId = searchResults[0].getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID
                    );
                    log.debug({ title: `${strDebugTitle} - getFileId`, details: `File ID: ${fileId}` });
                    return fileId;
                } else {
                    log.debug({ title: `${strDebugTitle} - getFileId`, details: `No file found for name: ${fileName}` });
                    return "";
                }
            } catch (err) {
                log.error({ title: `${strDebugTitle} - getFileId Error`, details: err.message });
                return "";
            }
        };


        const setFieldValue = (recordObj, fieldId, value, dateFormat) => {
            const field = recordObj.getField({ fieldId });
            if (!field) {
                log.error({ title: `${strDebugTitle} - setFieldValue`, details: `Field ${fieldId} does not exist` });
                return;
            }
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

                log.debug({ title: `${strDebugTitle} - Field`, details: `Set ${fieldId} to ${value}` });
            } catch (e) {
                log.error({ title: `${strDebugTitle} - setFieldValue Error`, details: `Field ${fieldId}: ${e.message}` });
            }
        };

        const getFileFolderID = (folderName) => {
            try {
                const searchResults = search.create({
                    type: search.Type.FOLDER,
                    filters: [[constants.STANDARD_FIELDS.FILE.NAME, 'is', folderName]],
                    columns: [constants.STANDARD_FIELDS.FILE.INTERNAL_ID]
                }).run().getRange({ start: 0, end: 1 });

                if (searchResults.length > 0) {
                    return searchResults[0].getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                }

                const folderRecord = record.create({ type: record.Type.FOLDER, isDynamic: true });
                folderRecord.setValue({ fieldId: constants.STANDARD_FIELDS.FILE.NAME, value: folderName });
                const FileFolderId = folderRecord.save();
                log.debug({ title: `${strDebugTitle} - Folder`, details: `Created Folder ID: ${FileFolderId}` });
                return FileFolderId;
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
                    case "M/D/YYYY":
                    case "MM/DD/YYYY":
                        return `${month}/${day}/${year}`;
                    case "D/M/YYYY":
                    case "DD/MM/YYYY":
                        return `${day}/${month}/${year}`;
                    case "D-Mon-YYYY":
                    case "DD-Mon-YYYY":
                        return `${day}-${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(month, 10)]}-${year}`;
                    case "D.M.YYYY":
                    case "DD.MM.YYYY":
                        return `${day}.${month}.${year}`;
                    case "D-MONTH-YYYY":
                    case "DD-MONTH-YYYY":
                        return `${day}-${['', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'][parseInt(month, 10)]}-${year}`;
                    case "D MONTH, YYYY":
                    case "DD MONTH, YYYY":
                        return `${day} ${['', 'JANUARY,', 'FEBRUARY,', 'MARCH,', 'APRIL,', 'MAY,', 'JUNE,', 'JULY,', 'AUGUST,', 'SEPTEMBER,', 'OCTOBER,', 'NOVEMBER,', 'DECEMBER,'][parseInt(month, 10)]} ${year}`;
                    case "YYYY/M/D":
                    case "YYYY/MM/DD":
                        return `${year}/${month}/${day}`;
                    case "YYYY-M-D":
                    case "YYYY-MM-DD":
                        return `${year}-${month}-${day}`;
                    default:
                        return dateStr;
                }
            } catch (err) {
                log.error({ title: `${strDebugTitle} - getJSDateFormat Error`, details: err.message });
                return "";
            }
        };

        const getVendorId = (vendorName) => {
            if (!isValidString(vendorName)) return false;

            log.debug({ title: `${strDebugTitle} - Vendor`, details: `Vendor Name: ${vendorName}` });

            try {
                const searchResults = search.create({
                    type: search.Type.VENDOR,
                    filters: [
                        [constants.STANDARD_FIELDS.VENDOR.ENTITY_ID, "is", vendorName],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [constants.STANDARD_FIELDS.VENDOR.INTERNAL_ID]
                }).run().getRange({ start: 0, end: 1 });

                log.debug({
                    title: `${strDebugTitle} - Vendor Search`,
                    details: `Found ${searchResults.length} vendors for name: ${vendorName}`
                });

                const vendorId = searchResults.length > 0 ? searchResults[0].getValue(constants.STANDARD_FIELDS.VENDOR.INTERNAL_ID) : false;

                if (!vendorId) {
                    log.debug({ title: `${strDebugTitle} - Vendor`, details: `No vendor found for name: ${vendorName}` });
                    return false;
                }

                return vendorId;
            } catch (e) {
                log.error({
                    title: `${strDebugTitle} - getVendorId Error`,
                    details: e.message
                });
                return false;
            }
        };

        const getSubsidiaryId = (subsidiaryName) => {
            if (!isValidString(subsidiaryName)) return "";

            log.debug({ title: `${strDebugTitle} - Subsidiary`, details: `Subsidiary Name: ${subsidiaryName}` });

            try {
                const searchResults = search.create({
                    type: search.Type.SUBSIDIARY,
                    filters: [
                        [constants.STANDARD_FIELDS.SUBSIDIARY.NAME, "is", subsidiaryName],
                        "AND",
                        ["isinactive", "is", "F"]
                    ],
                    columns: [constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID]
                }).run().getRange({ start: 0, end: 1 });

                const subsidiaryId = searchResults.length > 0 ? searchResults[0].getValue(constants.STANDARD_FIELDS.SUBSIDIARY.INTERNAL_ID) : "";
                log.debug({
                    title: `${strDebugTitle} - Subsidiary`,
                    details: `Subsidiary Name: ${subsidiaryName}, ID: ${subsidiaryId}`
                });
                if (!subsidiaryId) {
                    log.debug({ title: `${strDebugTitle} - Subsidiary`, details: `No subsidiary found for name: ${subsidiaryName}` });
                    return "";
                }
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
            const recordUrl = url.resolveRecord({ recordType: constants.RECORD_TYPES.VENDOR_BILL_STAGING, recordId });
            return {
                metadata: { error: null, message: "Record Created Successfully" },
                recordid: recordId
            };
        };

        const createErrorResponse = (code, message) => ({
            metadata: { error: { code, message }, message: "Script Error" },
            recordid: ""
        });

        const isValidString = (value) => {
            if (value == null || value === "" || value === ' ' || value === 'null' || value === 'undefined' || value === NaN) {
                return false;
            }
            // For date fields, ensure it's a valid date
            if (typeof value === 'string' && value.includes('-') && value.includes('T')) {
                return !isNaN(new Date(value).getTime());
            }
            return true;
        };

        const isValidObject = (obj) => isValidString(JSON.stringify(obj)) && Object.keys(obj).length > 0;

        return { post: doPost };
    });