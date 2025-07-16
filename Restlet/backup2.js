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
            const recordObj = record.create({ type: "customrecord_lstcptr_vendor_bill_process", isDynamic: true });
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

            // Handle file attachments
            if (Array.isArray(requestBody.originalfile) && requestBody.originalfile.length > 0) {
                const folderId = getFileFolderID("LSTCapture Files");
                log.debug({ title: `${strDebugTitle} - File`, details: `Folder ID: ${folderId}` });

                if (isValidString(folderId)) {
                    const fileData = requestBody.originalfile[0]; // Assuming one file for simplicity
                    const fileExt = fileData.filename.split('.').pop().toLowerCase();
                    const fileType = FILE_TYPES[fileExt] || "PDF";
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
                        fileType: file.Type[fileType],
                        contents: contents,
                        folder: Number(folderId)
                    });

                    attachedFileId = fileObj.save();
                    log.debug({ title: `${strDebugTitle} - File`, details: `Saved PDF File ID: ${attachedFileId}` });

                    // Attach PDF to mediaitem sublist
                    if (isValidString(attachedFileId)) {
                        recordObj.selectNewLine({ sublistId: "mediaitem" });
                        recordObj.setCurrentSublistValue({ sublistId: "mediaitem", fieldId: "mediaitem", value: attachedFileId });
                        recordObj.commitLine({ sublistId: "mediaitem" });
                        log.debug({ title: `${strDebugTitle} - File Attachment`, details: `PDF File ${attachedFileId} attached to mediaitem` });
                    }

                    // Save request body as JSON file and attach
                    const jsonFileName = fileData.filename.split('.')[0] + "_req.json";
                    const jsonFile = file.create({
                        name: jsonFileName,
                        fileType: file.Type.JSON,
                        contents: JSON.stringify(requestBody),
                        folder: Number(folderId)
                    });
                    const jsonFileId = jsonFile.save();
                    log.debug({ title: `${strDebugTitle} - File`, details: `Saved JSON File ID: ${jsonFileId}` });

                    if (isValidString(jsonFileId)) {
                        recordObj.selectNewLine({ sublistId: "mediaitem" });
                        recordObj.setCurrentSublistValue({ sublistId: "mediaitem", fieldId: "mediaitem", value: jsonFileId });
                        recordObj.commitLine({ sublistId: "mediaitem" });
                        log.debug({ title: `${strDebugTitle} - File Attachment`, details: `JSON File ${jsonFileId} attached to mediaitem` });
                    }
                } else {
                    log.error({ title: `${strDebugTitle} - File`, details: 'Failed to get or create folder' });
                }
            } else {
                log.debug({ title: `${strDebugTitle} - File`, details: 'No original file provided in request' });
            }

            // Set default and additional fields
            recordObj.setValue("custrecord_lstcptr_transaction_type", "1"); // Bill
            recordObj.setValue("custrecord_lstcptr_provider", "2"); // Nanonets
            recordObj.setValue("custrecord_lstcptr_process_status", "2"); // Matching Incomplete
            recordObj.setValue("custrecord_lstcptr_date_receiced_to_ocr", new Date());
            if (isValidString(attachedFileId)) {
                recordObj.setValue("custrecord_lstcptr_pdf_file", attachedFileId);
                log.debug({ title: `${strDebugTitle} - Record`, details: `PDF File ${attachedFileId} set to custrecord_lstcptr_pdf_file` });
            }

            // Process additional fields and items
            if (Array.isArray(requestBody.items)) {
                const vendorId = getVendorId(requestBody.vendor_name);
                log.debug("Vendor Id: ", vendorId);
                const subsidiaryId = getSubsidiaryId(requestBody.Subsidiary || "");
                log.debug("Subsidiary Id: ", subsidiaryId);
                const taxAmount = requestBody.taxamount || 0;
                const amount = requestBody.amount || 0;
                const billNumber = requestBody.BillNumber || "";

                log.debug({
                    title: `${strDebugTitle} - Header`,
                    details: `Vendor: ${requestBody.vendor_name} (ID: ${vendorId}), Subsidiary: ${requestBody.Subsidiary} (ID: ${subsidiaryId}), Tax: ${taxAmount}, Amount: ${amount}, Bill Number: ${billNumber}`
                });

                log.debug("Item Details: ", requestBody.items);
                const itemDetails = requestBody.items.map(item => 
                    `${item.Description}:${item.Line_amount}`).join(", ");
                log.debug({ title: `${strDebugTitle} - Items`, details: `Item Details: ${itemDetails}` });

                recordObj.setValue("custrecord_lstcptr_tran_status", "2");
                recordObj.setValue("custrecord_lstcptr_subsidiary", subsidiaryId);
                recordObj.setValue("custrecord_lstcptr_vendor", vendorId);
                recordObj.setValue("custrecord_lstcptr_tran_tax_amount", taxAmount);
                recordObj.setValue("custrecord_lstcptr_tran_amount_inc_tax", amount);
                recordObj.setValue("custrecord_lstcptr_bill_number", billNumber);
                recordObj.setValue("custrecord_lstcptr_json_item_data", JSON.stringify(requestBody.items));
            } else {
                log.debug({ title: `${strDebugTitle} - Items`, details: 'No items provided in request' });
            }

            // Save the record
            const recordId = recordObj.save();
            log.debug({ title: `${strDebugTitle} - Record`, details: `Record Created: ${recordId}` });

            return createSuccessResponse(recordId);

        } catch (err) {
            log.error({ title: `${strDebugTitle} - PostFunction Error`, details: `Error: ${err.name} - ${err.message}` });
            return createErrorResponse(err.name, err.message);
        }
    };

    const setFieldValue = (recordObj, fieldId, value, dateFormat) => {
        const field = recordObj.getField({ fieldId });
        if (!field) return;

        try {
            if (field.type === "select") {
                const options = field.getSelectOptions({ filter: value, operator: "is" });
                if (options.length === 1) {
                    recordObj.setValue(fieldId, options[0].value);
                }
            } else if (field.type === "date") {
                const formattedDate = getJSDateFormat(value, dateFormat);
                if (isValidString(formattedDate)) {
                    recordObj.setText(fieldId, formattedDate);
                }
            } else if (field.type === "timeofday") {
                recordObj.setText(fieldId, value);
            } else {
                recordObj.setValue(fieldId, value);
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
            recordid: recordId,
            recordlink: `https://${domain}${recordUrl}&whence=`
        };
    };

    const createErrorResponse = (code, message) => ({
        metadata: { error: { code, message }, message: "Script Error" },
        recordid: "",
        recordlink: ""
    });

    const isValidString = (value) => value != null && value !== '' && value !== ' ' && value !== 'null' && value !== 'undefined' && value !== NaN;

    const isValidObject = (obj) => isValidString(obj) && Object.keys(obj).length > 0;

    return { post: doPost };
});