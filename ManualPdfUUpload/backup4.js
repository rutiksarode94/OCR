/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/runtime', 'N/url', 'N/https', 'N/file', 'N/record', 'N/encode'],
    function (serverWidget, search, runtime, url, https, file, record, encode) {
        var strDebugTitle = "lst_ocr_manual_upload_page";

        function onRequest(context) {
            var request = context.request;
            var response = context.response;
            var nUserObj = runtime.getCurrentUser();
            var nCurrentUserId = nUserObj.id;
            var nUserRoleId = nUserObj.role;
            var nUserName = nUserObj.name;
            var accountId = runtime.accountId;

            log.debug({ title: strDebugTitle, details: "nCurrentUserId : " + nCurrentUserId + " || nUserRoleId : " + nUserRoleId + " || nUserName : " + nUserName });

            var apiKey = 'f65974d2-0a0e-11f0-9c0d-fa4e7f320381';
            var modelId = '48b494dd-8aa0-4e83-934e-9a4405f7ad9f';
            var authenticationToken = getAuthenticationToken(apiKey);

            var NANONETS_API = {
                KEY: apiKey,
                MODEL_ID: modelId,
                BASE_URL: 'https://app.nanonets.com/api/v2/OCR/Model',
                AUTH_TOKEN: 'Basic ' + authenticationToken
            };

            if (context.request.method === 'GET') {
                let form = serverWidget.createForm({ title: 'Upload Bill to Process' });

                let html = form.addField({
                    id: 'custpage_upload',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Upload PDF File'
                });

                // Pre-fetch subsidiaries and vendors
                var subsidiaries = getSubsidiaryOptions();
                var vendors = getAllVendors();

                html.defaultValue = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Upload Bill to Process</title>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.7.2/font/bootstrap-icons.min.css" integrity="sha512-1fPmaHba3v4A7PaUsComSM4TBsrrRGs+/fv0vrzafQ+Rw+siILTiJa0NtFfvGeyY5E182SDTaF5PqP+XOHgJag==" crossorigin="anonymous" referrerpolicy="no-referrer" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                height: 100vh;
                                font-size: 1rem;
                                display: flex;
                                flex-direction: column;
                            }

                            .container {
                                display: flex;
                                flex-direction: row;
                                gap: 20px;
                                height: 100%;
                            }

                            .left-panel {
                                flex: 0 0 30%;
                            }

                            .right-panel {
                                flex: 1;
                            }

                            .form-group {
                                margin-bottom: 15px;
                            }

                            .form-group label {
                                display: block;
                                margin-bottom: 5px;
                                color: #4d5f89;
                            }

                            .form-group select {
                                width: 90%;
                                padding: 8px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                font-size: 14px;
                            }

                            .upload-zone {
                                width: 70%;
                                border: 2px dashed #00aaff;
                                padding: 40px 0;
                                text-align: center;
                                border-radius: 5px;
                                color: #a0a0a0;
                                margin-top: 20px;
                                display: flex;
                                flex-direction: column;
                                justify-content: center;
                                align-items: center;
                                height: 200px;
                                background-color: #f9fcfd;
                            }

                            .upload-zone label {
                                font-size: 16px;
                            }

                            .upload-btn {
                                width: 150px;
                                height: 40px;
                                margin-top: 20px;
                                background-color: #1976d2;
                                color: white;
                                padding: 10px 0;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                            }

                            #uploadStatus {
                                margin-top: 10px;
                                color: #666;
                                font-size: 14px;
                            }

                            #pdfContainer {
                                margin-top: 20px;
                                align-items: center;
                                font-family: Arial, sans-serif;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                width: 70%;
                                background-color: #f9f9f9;
                                padding: 10px;
                                display: none; /* Hidden by default until a file is selected */
                            }

                            #pdfDetails {
                                display: flex;
                                flex-direction: row;
                                align-items: center;
                                width: 100%;
                                position: relative;
                            }

                            #pdfLogo {
                                font-size: 24px;
                                color: #007bff;
                                margin-right: 10px;
                            }

                            #pdfInfo {
                                flex-grow: 1;
                            }

                            #pdfName {
                                font-weight: bold;
                                font-size: 14px;
                                display: block;
                            }

                            #pdfSize {
                                color: #666;
                                font-size: 12px;
                                display: block;
                                margin-top: 2px;
                            }

                            #deleteLogo {
                                font-size: 18px;
                                color: #666;
                                cursor: pointer;
                                margin-left: 10px;
                            }

                            #deleteLogo:hover {
                                color: #dc3545;
                            }

                            #uploadProgress {
                                width: calc(100% - 60px); /* Adjust width to fit within preview */
                                height: 4px; /* Single-line height */
                                background-color: #e0e0e0;
                                border-radius: 2px;
                                overflow: hidden;
                                margin-top: 5px;
                                display: none;
                                position: absolute;
                                bottom: -10px; /* Position below the preview details */
                                left: 30px; /* Align with pdfLogo */
                            }

                            .loading-progress {
                                height: 100%;
                                width: 100%;
                                background-color: #007bff;
                                animation: loadingAnimation 2s infinite;
                            }

                            @keyframes loadingAnimation {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(100%); }
                            }
                        </style>
                        <script>
                            let subsidiaryOptions = ${JSON.stringify(subsidiaries)};
                            let vendorOptions = ${JSON.stringify(vendors)};
                            let abortController = null; // To manage upload cancellation

                            function populateSubsidiary() {
                                let select = document.getElementById('subsidiary');
                                let emptyOption = document.createElement('option');
                                emptyOption.value = '';
                                emptyOption.text = '';
                                select.appendChild(emptyOption);
                                subsidiaryOptions.forEach(option => {
                                    let newOption = document.createElement('option');
                                    newOption.value = option.id;
                                    newOption.text = option.name;
                                    select.appendChild(newOption);
                                });
                            }

                            function populateVendors() {
                                let vendorSelect = document.getElementById('vendor');
                                vendorSelect.innerHTML = '<option value=""></option>';
                                vendorOptions.forEach(vendor => {
                                    let newOption = document.createElement('option');
                                    newOption.value = vendor.id;
                                    newOption.text = vendor.name;
                                    vendorSelect.appendChild(newOption);
                                });
                            }

                            async function uploadFile() {
                                var fileInput = document.getElementById('pdfFile');
                                var file = fileInput.files[0];
                                var progressBar = document.getElementById("uploadProgress");
                                var loadingProgress = document.querySelector('.loading-progress');
                                var statusDiv = document.getElementById('uploadStatus');
                                var uploadBtn = document.querySelector('.upload-btn');
                                var uploadZone = document.querySelector('.upload-zone');
                                var pdfContainer = document.getElementById('pdfContainer');

                                if (!file) {
                                    alert('Please upload a PDF file.');
                                    return;
                                }

                                // Disable inputs but keep delete logo enabled
                                fileInput.style.cursor = 'not-allowed';
                                uploadZone.style.backgroundColor = '#E8E9EB';
                                uploadZone.style.cursor = 'not-allowed';
                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';
                                progressBar.style.display = 'block';
                                loadingProgress.style.display = 'block';
                                statusDiv.innerHTML = 'Uploading file to Nanonets...';
                                pdfContainer.style.display = 'block'; // Keep preview visible

                                try {
                                    abortController = new AbortController(); // Initialize AbortController
                                    let formData = new FormData();
                                    formData.append('file', file, file.name);

                                    const response = await fetch("${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile", {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': "${NANONETS_API.AUTH_TOKEN}"
                                        },
                                        body: formData,
                                        signal: abortController.signal // Allow cancellation
                                    });

                                    const responseData = await response.json();
                                    console.log('Nanonets Response:', JSON.stringify(responseData, null, 2));

                                    if (!response.ok) {
                                        throw new Error(responseData.message || 'Upload failed to Nanonets');
                                    }

                                    if (response.status === 200) {
                                        statusDiv.innerHTML = 'Processing JSON from Nanonets...';
                                        let extractedData = {
                                            transactiontype: '',
                                            vendor_name: '',
                                            Subsidiary: '',
                                            status: '',
                                            billnumber: '',
                                            Line_amount: '',
                                            dueDate: ''
                                        };

                                        if (responseData.result && responseData.result.length > 0) {
                                            const predictions = responseData.result[0].prediction;
                                            predictions.forEach(field => {
                                                if (field.label === 'Transaction Type') extractedData.transactiontype = field.ocr_text || '';
                                                if (field.label === 'Vendor') extractedData.vendor_name = field.ocr_text || '';
                                                if (field.label === 'Subsidiary') extractedData.Subsidiary = field.ocr_text || '';
                                                if (field.label === 'Status') extractedData.status = field.ocr_text || '';
                                                if (field.label === 'BillNumber') extractedData.billnumber = field.ocr_text || '';
                                                if (field.label === 'Amount') extractedData.Line_amount = field.ocr_text || '';
                                                if (field.label === 'DueDate') extractedData.dueDate = field.ocr_text || '';
                                            });
                                        }

                                        let suiteletFormData = new FormData();
                                        suiteletFormData.append('pdfFile', file);
                                        suiteletFormData.append('subsidiaryId', document.getElementById('subsidiary').value || '');
                                        suiteletFormData.append('vendorId', document.getElementById('vendor').value || '');
                                        suiteletFormData.append('extractedData', JSON.stringify(extractedData));
                                        suiteletFormData.append('nanonetsJson', JSON.stringify(responseData));

                                        const suiteletResponse = await fetch('/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_manually_uploadfile&deploy=customdeploy_lstcptr_manually_uploadfile', {
                                            method: 'POST',
                                            body: suiteletFormData,
                                            signal: abortController.signal // Allow cancellation
                                        });

                                        const suiteletResult = await suiteletResponse.json();
                                        if (suiteletResult.success) {
                                            statusDiv.innerHTML = 'File processed successfully! Record ID: ' + suiteletResult.recordId;
                                            if (confirm('Record saved successfully with ID: ' + suiteletResult.recordId + '. Click OK to continue.')) {
                                                window.location.href = 'https://tstdrv1423092.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_manually_uploadfile&deploy=customdeploy_lstcptr_manually_uploadfile&whence=';
                                            }
                                        } else {
                                            statusDiv.innerHTML = '<div style="color: red;">Error: ' + suiteletResult.error + '</div>';
                                        }
                                    } else {
                                        throw new Error('Unexpected status: ' + response.status);
                                    }
                                } catch (error) {
                                    if (error.name === 'AbortError') {
                                        statusDiv.innerHTML = 'Upload cancelled.';
                                    } else {
                                        console.error('Upload Error:', error);
                                        statusDiv.innerHTML = '<div style="color: red;">Upload failed: ' + error.message + '</div>';
                                    }
                                } finally {
                                    progressBar.style.display = 'none';
                                    loadingProgress.style.display = 'none';
                                    uploadBtn.disabled = false;
                                    uploadBtn.style.cursor = 'pointer';
                                    uploadBtn.style.backgroundColor = '#1976d2';
                                    uploadZone.style.backgroundColor = '#f9fcfd';
                                    uploadZone.style.cursor = 'pointer';
                                    fileInput.style.cursor = 'pointer';
                                    abortController = null; // Reset abort controller
                                }
                            }

                            function validateFile() {
                                var fileInput = document.getElementById('pdfFile');
                                var file = fileInput.files[0];
                                var progressBar = document.getElementById("uploadProgress");
                                var statusDiv = document.getElementById('uploadStatus');
                                var uploadBtn = document.querySelector('.upload-btn');
                                var uploadZone = document.querySelector('.upload-zone');
                                var pdfContainer = document.getElementById('pdfContainer');
                                var deleteLogo = document.getElementById('deleteLogo');

                                if (file) {
                                    uploadBtn.disabled = false;
                                    uploadBtn.style.cursor = 'pointer';
                                    uploadBtn.style.backgroundColor = '#1976d2';
                                    uploadZone.style.backgroundColor = '#f9fcfd';
                                    uploadZone.style.cursor = 'pointer';
                                    progressBar.style.display = 'none';
                                    deleteLogo.style.display = 'block';
                                    statusDiv.innerHTML = '';
                                    statusDiv.style.color = '#666';

                                    if (file.type !== 'application/pdf') {
                                        alert('Please select a PDF file only.');
                                        fileInput.value = '';
                                        uploadBtn.disabled = true;
                                        uploadBtn.style.cursor = 'not-allowed';
                                        uploadBtn.style.backgroundColor = '#b3e5f5';
                                        pdfContainer.style.display = 'none';
                                        deleteLogo.style.display = 'none';
                                    } else {
                                        displayFileName(file);
                                    }
                                } else {
                                    uploadBtn.disabled = true;
                                    uploadBtn.style.cursor = 'not-allowed';
                                    uploadBtn.style.backgroundColor = '#b3e5f5';
                                    pdfContainer.style.display = 'none';
                                    deleteLogo.style.display = 'none';
                                }
                            }

                            function displayFileName(file) {
                                var pdfContainer = document.getElementById('pdfContainer');
                                var pdfLogo = document.getElementById('pdfLogo');
                                var pdfName = document.getElementById('pdfName');
                                var pdfSize = document.getElementById('pdfSize');
                                var deleteLogo = document.getElementById('deleteLogo');

                                pdfContainer.style.display = 'block'; // Ensure it's visible
                                pdfLogo.style.display = 'block';
                                deleteLogo.style.display = 'block';
                                pdfName.textContent = file.name;
                                pdfSize.textContent = (file.size / 1024).toFixed(2) + ' KB';
                            }

                            function deleteLogoHandler() {
                                var pdfContainer = document.getElementById('pdfContainer');
                                var fileInput = document.getElementById('pdfFile');
                                var uploadZone = document.querySelector('.upload-zone');
                                var uploadBtn = document.querySelector('.upload-btn');
                                var statusDiv = document.getElementById('uploadStatus');
                                var deleteLogo = document.getElementById('deleteLogo');
                                var progressBar = document.getElementById("uploadProgress");

                                // If an upload is in progress, abort it
                                if (abortController) {
                                    abortController.abort();
                                }

                                uploadZone.style.backgroundColor = '#f9fcfd';
                                uploadZone.style.cursor = 'pointer';
                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';
                                pdfContainer.style.display = 'none';
                                fileInput.value = '';
                                statusDiv.innerHTML = ''; // Clear status
                                deleteLogo.style.display = 'none';
                                progressBar.style.display = 'none';
                            }

                            document.addEventListener('DOMContentLoaded', function() {
                                var uploadZone = document.querySelector('.upload-zone');
                                var fileInput = document.getElementById('pdfFile');
                                var uploadBtn = document.querySelector('.upload-btn');
                                var deleteLogo = document.getElementById('deleteLogo');

                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';
                                deleteLogo.style.display = 'none';

                                populateSubsidiary();
                                populateVendors();

                                uploadZone.addEventListener('dragover', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    uploadZone.classList.add('dragover');
                                });

                                uploadZone.addEventListener('dragleave', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    uploadZone.classList.remove('dragover');
                                });

                                uploadZone.addEventListener('drop', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    uploadZone.classList.remove('dragover');
                                    var files = e.dataTransfer.files;
                                    if (files.length > 1) {
                                        alert('Please upload only one PDF file.');
                                        return;
                                    }
                                    if (files.length > 0) {
                                        fileInput.files = files;
                                        validateFile();
                                    }
                                });
                            });
                        </script>
                    </head>
                    <body>
                        <div class="container">
                            <div class="left-panel">
                                <div class="form-group">
                                    <label for="subsidiary" style="font-size: 16px;">Subsidiary</label>
                                    <select id="subsidiary"></select>
                                </div>
                                <div class="form-group">
                                    <label for="vendor" style="font-size: 16px;">Vendor</label>
                                    <select id="vendor"></select>
                                </div>
                            </div>
                            <div class="right-panel">
                                <div class="upload-zone">
                                    <i class="bi bi-camera" style="font-size: 40px;"></i>
                                    <label for="pdfFile">Upload PDF File</label>
                                    <input type="file" id="pdfFile" name="file" accept="application/pdf" required onchange="validateFile()">
                                </div>
                                <div id="pdfContainer">
                                    <div id="pdfDetails">
                                        <i class="bi bi-file-pdf" id="pdfLogo" style="display:none;"></i>
                                        <div id="pdfInfo">
                                            <span id="pdfName"></span>
                                            <span id="pdfSize"></span>
                                        </div>
                                        <i class="bi bi-trash" id="deleteLogo" style="display:none;" onclick="deleteLogoHandler()"></i>
                                        <div id="uploadProgress">
                                            <div class="loading-progress" style="display:none;"></div>
                                        </div>
                                    </div>
                                    <div id="uploadBar">
                                        <div id="uploadStatus"></div>
                                    </div>
                                </div>
                                <input type="button" class="upload-btn" id="submit" value="Proceed" onclick="uploadFile()">
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                context.response.writePage(form);
            } else if (context.request.method === 'POST') {
                try {
                    let files = context.request.files;
                    let parameters = context.request.parameters;

                    let pdfFile = files['pdfFile'];
                    let subsidiaryId = parameters['subsidiaryId'] || '';
                    let vendorId = parameters['vendorId'] || '';
                    let extractedData = parameters['extractedData'] ? JSON.parse(parameters['extractedData']) : null;
                    let nanonetsJson = parameters['nanonetsJson'] ? JSON.parse(parameters['nanonetsJson']) : null;

                    if (!pdfFile) {
                        log.error("Missing required field: PDF file");
                        context.response.write(JSON.stringify({ success: false, message: "Please upload a PDF file" }));
                        return;
                    }

                    // Save the uploaded PDF to folder 8896
                    pdfFile.folder = 8896;
                    let fileId = pdfFile.save();
                    log.debug("PDF saved to file cabinet", fileId);

                    // Create Custom Record
                    let newRecord = record.create({ type: 'customrecord_lstcptr_vendor_bill_process' });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_subsidiary', value: subsidiaryId || null });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_vendor', value: vendorId || null });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_pdf_file', value: fileId });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_tran_status', value: 2 });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_process_status', value: 2 });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_tran_tax_amount', value: 0 });
                    newRecord.setValue({ fieldId: 'custrecord_lstcptr_tran_amount_inc_tax', value: 0 });

                    let recordId = newRecord.save();
                    log.debug("Record Created Successfully", recordId);
                    if (fileId) {
                        pdfFile = file.load({
                            id: fileId
                        });
                        log.debug('Loaded JSON File', 'Name: ' + pdfFile.name + ', Size: ' + pdfFile.size + ' bytes');

                        record.attach({
                            record: {
                                type: 'file',
                                id: pdfFile.id
                            },
                            to: {
                                type: 'customrecord_lstcptr_vendor_bill_process',
                                id: recordId
                            }
                        });
                        log.debug('File Attached to Record', 'File: ' + pdfFile.name + ' attached to Record ID: ' + recordId);
                    }

                    let jsonFilesFolder = 8897;
                    if (nanonetsJson) {
                        let jsonFileId = attachJsonResponse(nanonetsJson, recordId, jsonFilesFolder);
                        log.debug("Nanonets JSON saved", jsonFileId);
                    }

                    context.response.write(JSON.stringify({
                        success: true,
                        recordId: recordId,
                        error: null,
                        redirectUrl: 'https://tstdrv1423092.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_manually_uploadfile&deploy=customdeploy_lstcptr_manually_uploadfile&whence='
                    }));
                } catch (error) {
                    log.error({ title: 'Error in POST', details: error });
                    context.response.write(JSON.stringify({
                        success: false,
                        recordId: '',
                        error: error.message
                    }));
                }
            }
        }

        function getAuthenticationToken(apiKey) {
            try {
                return encode.convert({
                    string: apiKey + ":",
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                });
            } catch (error) {
                log.error('getAuthenticationToken Error', error);
                return '';
            }
        }

        function getSubsidiaryOptions() {
            let subsidiaries = [];
            let subsidiarySearch = search.create({
                type: search.Type.SUBSIDIARY,
                columns: ['internalid', 'name'],
                filters: [['isinactive', 'is', 'false']]
            });

            subsidiarySearch.run().each(result => {
                subsidiaries.push({
                    id: result.getValue('internalid'),
                    name: result.getValue('name')
                });
                return true;
            });

            return subsidiaries;
        }

        function getAllVendors() {
            let vendors = [];
            let vendorSearch = search.create({
                type: search.Type.VENDOR,
                columns: ['internalid', 'entityid', 'companyname'],
                filters: [['isinactive', 'is', 'false']]
            });

            vendorSearch.run().each(result => {
                vendors.push({
                    id: result.getValue('internalid'),
                    name: result.getValue('internalid') + ' ' + (result.getValue('entityid') + ' ' + (result.getValue('companyname') || ''))
                });
                return true;
            });

            log.debug({ title: 'All Vendors', details: 'Fetched all vendors: ' + JSON.stringify(vendors) });
            return vendors;
        }

        function attachJsonResponse(ocrResponse, recordId, folderId) {
            let jsonContent = JSON.stringify(ocrResponse);
            let fileObj = file.create({
                name: 'ocr_response_' + new Date().getTime() + '.json',
                fileType: file.Type.JSON,
                contents: jsonContent,
                folder: folderId
            });

            let fileId = fileObj.save();

            record.attach({
                record: {
                    type: 'file',
                    id: fileId
                },
                to: {
                    type: 'customrecord_lstcptr_vendor_bill_process',
                    id: recordId
                }
            });

            log.debug({ title: strDebugTitle, details: 'JSON File Attached: ' + fileId });
            return fileId;
        }

        return { onRequest: onRequest };
    });