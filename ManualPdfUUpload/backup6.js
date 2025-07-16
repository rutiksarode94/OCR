/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Counsaltacy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCPTR Manually Upload File (manually_upload_sl.js)
*
* Version:         1.0.0   -   12-March-2025 - RS      Initial Development     
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script is used to upload a file manually (supports multiple file types) and send it to Nanonets.
*
* Script:          customscript_lstcptr_manually_uploadfile
* Deploy:          customdeploy_lstcptr_manually_uploadfile
*
*********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/runtime', 'N/url', 'N/https', 'N/file', 'N/record', 'N/encode'],
    function (serverWidget, search, runtime, url, https, file, record, encode) {
        var strDebugTitle = "manually_upload_sl";
        var licenseStatus = '';
        var apiKey = '';
        var modelId = '';
        var authenticationToken = '';

        function onRequest(context) {
            var request = context.request;
            var response = context.response;
            var nUserObj = runtime.getCurrentUser();
            var nCurrentUserId = nUserObj.id;
            var nUserRoleId = nUserObj.role;
            var nUserName = nUserObj.name;
            var accountId = runtime.accountId;

            log.debug({ title: strDebugTitle, details: "nCurrentUserId : " + nCurrentUserId + " || nUserRoleId : " + nUserRoleId + " || nUserName : " + nUserName });

            var clientLicenseDetails = checkLicenseStatus(accountId);
            var lstCaptureLicenseDetails = getSTCaptureLicenseDetails();

            if (isValidString(clientLicenseDetails)) {
                licenseStatus = clientLicenseDetails.licenseStatus;
            }

            if (isValidString(lstCaptureLicenseDetails)) {
                apiKey = lstCaptureLicenseDetails.apiKey;
                modelId = lstCaptureLicenseDetails.modelId;
            }

            if (isValidString(apiKey)) {
                authenticationToken = getAuthenticationToken(apiKey);
            }

            var NANONETS_API = {
                KEY: apiKey,
                MODEL_ID: modelId,
                BASE_URL: 'https://app.nanonets.com/api/v2/OCR/Model',
                AUTH_TOKEN: 'Basic ' + authenticationToken
            };

            if (context.request.method === 'GET') {
                let form = serverWidget.createForm({ title: 'Upload Multiple Files to Process' });

                let html = form.addField({
                    id: 'custpage_upload',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: 'Upload Files'
                });

                var subsidiaries = getSubsidiaryOptions();
                var vendors = getAllVendors();

                html.defaultValue = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Upload Multiple Files to Process</title>
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
                                background-color: #3bd219ff;
                                color: white;
                                padding: 10px 0;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                            }

                             .upload-proceed-btn {
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

                            .file-container {
                                margin-top: 10px;
                                font-family: Arial, sans-serif;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                width: 70%;
                                background-color: #f9f9f9;
                                padding: 10px;
                                display: none;
                            }

                            .file-details {
                                display: flex;
                                flex-direction: row;
                                align-items: center;
                                width: 100%;
                                position: relative;
                            }

                            .file-logo {
                                font-size: 24px;
                                color: #007bff;
                                margin-right: 10px;
                            }

                            .file-info {
                                flex-grow: 1;
                            }

                            .file-name {
                                font-weight: bold;
                                font-size: 14px;
                                display: block;
                            }

                            .file-size {
                                color: #666;
                                font-size: 12px;
                                display: block;
                                margin-top: 2px;
                            }

                            .delete-logo {
                                font-size: 18px;
                                color: #666;
                                cursor: pointer;
                                margin-left: 10px;
                            }

                            .delete-logo:hover {
                                color: #dc3545;
                            }

                            .upload-progress {
                                width: calc(100% - 60px);
                                height: 4px;
                                background-color: #e0e0e0;
                                border-radius: 2px;
                                overflow: hidden;
                                margin-top: 5px;
                                display: none;
                                position: absolute;
                                bottom: -10px;
                                left: 30px;
                            }

                            .loading-progress {
                                height: 100%;
                                width: 100%;
                                background-color: #007bff;
                                animation: loadingAnimation 2s infinite;
                            }

                            .upload-status {
                                margin-top: 5px;
                                color: #666;
                                font-size: 14px;
                            }

                            @keyframes loadingAnimation {
                                0% { transform: translateX(-100%); }
                                100% { transform: translateX(100%); }
                            }
                        </style>
                        <script>
                            let subsidiaryOptions = ${JSON.stringify(subsidiaries)};
                            let vendorOptions = ${JSON.stringify(vendors)};
                            let abortControllers = new Map();
                            let selectedFiles = new Map();

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

                                select.addEventListener('change', function () {
                                    let selectedSubsidiaryId = this.value;
                                    populateVendors(selectedSubsidiaryId);
                                });
                            }

                            function populateVendors(subsidiaryId) {
                                let vendorSelect = document.getElementById('vendor');
                                vendorSelect.innerHTML = '<option value=""></option>';

                                let filteredVendors = vendorOptions.filter(vendor => vendor.subsidiaryId === subsidiaryId);

                                filteredVendors.forEach(vendor => {
                                    let newOption = document.createElement('option');
                                    newOption.value = vendor.id;
                                    newOption.text = vendor.name;
                                    vendorSelect.appendChild(newOption);
                                });
                            }

                            async function uploadFile(file, fileId) {
                                const fileContainer = document.getElementById(\`fileContainer-\${fileId}\`);
                                const progressBar = document.getElementById(\`uploadProgress-\${fileId}\`);
                                const loadingProgress = document.getElementById(\`loadingProgress-\${fileId}\`);
                                const statusDiv = document.getElementById(\`uploadStatus-\${fileId}\`);
                                const uploadBtn = document.querySelector('.upload-btn');
                                const uploadZone = document.querySelector('.upload-zone');

                                uploadZone.style.backgroundColor = '#E8E9EB';
                                uploadZone.style.cursor = 'not-allowed';
                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';
                                progressBar.style.display = 'block';
                                loadingProgress.style.display = 'block';
                                statusDiv.innerHTML = 'Uploading file to Nanonets...';

                                try {
                                    let abortController = new AbortController();
                                    abortControllers.set(fileId, abortController);
                                    let formData = new FormData();
                                    formData.append('file', file, file.name);

                                    const response = await fetch("${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile", {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': "${NANONETS_API.AUTH_TOKEN}"
                                        },
                                        body: formData,
                                        signal: abortController.signal
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
                                            signal: abortController.signal
                                        });

                                        const suiteletResult = await suiteletResponse.json();
                                        if (suiteletResult.success) {
                                            statusDiv.innerHTML = 'File processed successfully! ';
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
                                    abortControllers.delete(fileId);
                                    checkAllUploadsComplete();
                                }
                            }

                            function checkAllUploadsComplete() {
                                const uploadBtn = document.querySelector('.upload-btn');
                                const uploadZone = document.querySelector('.upload-zone');
                                if (abortControllers.size === 0) {
                                    uploadBtn.disabled = selectedFiles.size === 0;
                                    uploadBtn.style.cursor = selectedFiles.size === 0 ? 'not-allowed' : 'pointer';
                                    uploadBtn.style.backgroundColor = selectedFiles.size === 0 ? '#b3e5f5' : '#1976d2';
                                    uploadZone.style.backgroundColor = '#f9fcfd';
                                    uploadZone.style.cursor = 'pointer';
                                }
                            }

                            function validateFiles(files) {
                                const fileInput = document.getElementById('inputFile');
                                const uploadBtn = document.querySelector('.upload-btn');
                                const uploadZone = document.querySelector('.upload-zone');
                                const filesContainer = document.getElementById('filesContainer');

                                const supportedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'docx'];

                                filesContainer.innerHTML = '';
                                selectedFiles.clear();

                                if (files.length === 0) {
                                    alert('Please select at least one file.');
                                    fileInput.value = '';
                                    uploadBtn.disabled = true;
                                    uploadBtn.style.cursor = 'not-allowed';
                                    uploadBtn.style.backgroundColor = '#b3e5f5';
                                    filesContainer.style.display = 'none';
                                    return;
                                }

                                let validFiles = true;
                                for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    const fileExtension = file.name.split('.').pop().toLowerCase();
                                    const isValidType = supportedExtensions.includes(fileExtension);

                                    if (!isValidType) {
                                        alert('Please select a supported file type: ' + supportedExtensions.join(', '));
                                        validFiles = false;
                                        break;
                                    }
                                }

                                if (!validFiles) {
                                    fileInput.value = '';
                                    uploadBtn.disabled = true;
                                    uploadBtn.style.cursor = 'not-allowed';
                                    uploadBtn.style.backgroundColor = '#b3e5f5';
                                    filesContainer.style.display = 'none';
                                    return;
                                }

                                for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    const fileId = \`file-\${i}-\${Date.now()}\`;
                                    selectedFiles.set(fileId, file);
                                    displayFile(file, fileId);
                                }

                                uploadBtn.disabled = false;
                                uploadBtn.style.cursor = 'pointer';
                                uploadBtn.style.backgroundColor = '#28d219ff';
                                uploadZone.style.backgroundColor = '#f9fcfd';
                                uploadZone.style.cursor = 'pointer';
                                filesContainer.style.display = 'block';
                            }

                            function displayFile(file, fileId) {
                                const filesContainer = document.getElementById('filesContainer');
                                const fileContainer = document.createElement('div');
                                fileContainer.id = \`fileContainer-\${fileId}\`;
                                fileContainer.className = 'file-container';
                                fileContainer.style.display = 'block';

                                const fileDetails = document.createElement('div');
                                fileDetails.className = 'file-details';

                                const fileLogo = document.createElement('i');
                                fileLogo.id = \`fileLogo-\${fileId}\`;
                                fileLogo.className = 'file-logo';
                                fileLogo.style.display = 'block';

                                const fileInfo = document.createElement('div');
                                fileInfo.className = 'file-info';

                                const fileName = document.createElement('span');
                                fileName.id = \`fileName-\${fileId}\`;
                                fileName.className = 'file-name';
                                fileName.textContent = file.name;

                                const fileSize = document.createElement('span');
                                fileSize.id = \`fileSize-\${fileId}\`;
                                fileSize.className = 'file-size';
                                fileSize.textContent = (file.size / 1024).toFixed(2) + ' KB';

                                const deleteLogo = document.createElement('i');
                                deleteLogo.id = \`deleteLogo-\${fileId}\`;
                                deleteLogo.className = 'bi bi-trash delete-logo';
                                deleteLogo.style.display = 'block';
                                deleteLogo.onclick = () => deleteFile(fileId);

                                const uploadProgress = document.createElement('div');
                                uploadProgress.id = \`uploadProgress-\${fileId}\`;
                                uploadProgress.className = 'upload-progress';

                                const loadingProgress = document.createElement('div');
                                loadingProgress.id = \`loadingProgress-\${fileId}\`;
                                loadingProgress.className = 'loading-progress';
                                loadingProgress.style.display = 'none';

                                const uploadStatus = document.createElement('div');
                                uploadStatus.id = \`uploadStatus-\${fileId}\`;
                                uploadStatus.className = 'upload-status';

                                const fileExtension = file.name.split('.').pop().toLowerCase();
                                if (fileExtension === 'pdf') {
                                    fileLogo.className = 'bi bi-file-pdf file-logo';
                                } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
                                    fileLogo.className = 'bi bi-image file-logo';
                                } else if (fileExtension === 'tiff') {
                                    fileLogo.className = 'bi bi-file-image file-logo';
                                } else if (['docx'].includes(fileExtension)) {
                                    fileLogo.className = 'bi bi-file-word file-logo';
                                }

                                fileInfo.appendChild(fileName);
                                fileInfo.appendChild(fileSize);
                                fileDetails.appendChild(fileLogo);
                                fileDetails.appendChild(fileInfo);
                                fileDetails.appendChild(deleteLogo);
                                fileDetails.appendChild(uploadProgress);
                                uploadProgress.appendChild(loadingProgress);
                                fileContainer.appendChild(fileDetails);
                                fileContainer.appendChild(uploadStatus);
                                filesContainer.appendChild(fileContainer);
                            }

                            function deleteFile(fileId) {
                                const fileContainer = document.getElementById(\`fileContainer-\${fileId}\`);
                                const fileInput = document.getElementById('inputFile');
                                const uploadBtn = document.querySelector('.upload-btn');
                                const uploadZone = document.querySelector('.upload-zone');

                                if (abortControllers.has(fileId)) {
                                    abortControllers.get(fileId).abort();
                                    abortControllers.delete(fileId);
                                }

                                selectedFiles.delete(fileId);
                                fileContainer.remove();

                                if (selectedFiles.size === 0) {
                                    fileInput.value = '';
                                    uploadBtn.disabled = true;
                                    uploadBtn.style.cursor = 'not-allowed';
                                    uploadBtn.style.backgroundColor = '#b3e5f5';
                                    document.getElementById('filesContainer').style.display = 'none';
                                }

                                uploadZone.style.backgroundColor = '#f9fcfd';
                                uploadZone.style.cursor = 'pointer';
                            }

                            document.addEventListener('DOMContentLoaded', function() {
                                var uploadZone = document.querySelector('.upload-zone');
                                var fileInput = document.getElementById('inputFile');
                                var uploadBtn = document.querySelector('.upload-btn');
                                var filesContainer = document.getElementById('filesContainer');

                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';

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
                                    const files = e.dataTransfer.files;
                                    fileInput.files = files;
                                    validateFiles(files);
                                });

                                uploadBtn.addEventListener('click', async function() {
                                    for (let [fileId, file] of selectedFiles) {
                                        await uploadFile(file, fileId);
                                    }
                                    if (selectedFiles.size > 0 && abortControllers.size === 0) {
                                        if (confirm('All files processed successfully. Click OK to continue.')) {
                                            window.location.href = 'https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_manually_uploadfile&deploy=customdeploy_lstcptr_manually_uploadfile&whence=';
                                        }
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
                                <input type="button" class="upload-btn" id="submit" value="Save">
                            </div>
                            <div class="right-panel">
                                <div class="upload-zone">
                                    <i class="bi bi-camera" style="font-size: 40px;"></i>
                                    <label for="inputFile">Upload Files (PDF, PNG, JPG, JPEG, TIFF, DOCX Supported)</label>
                                    <input type="file" id="inputFile" name="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx" required onchange="validateFiles(this.files)">
                                </div>
                                <div id="filesContainer"></div>
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

                    let uploadedFiles = Object.values(files).filter(file => file && ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'docx'].includes(file.name.split('.').pop().toLowerCase()));
                    let subsidiaryId = parameters['subsidiaryId'] || '';
                    let vendorId = parameters['vendorId'] || '';
                    let extractedData = parameters['extractedData'] ? JSON.parse(parameters['extractedData']) : null;
                    let nanonetsJson = parameters['nanonetsJson'] ? JSON.parse(parameters['nanonetsJson']) : null;

                    if (uploadedFiles.length === 0) {
                        log.error("Missing required field: File");
                        context.response.write(JSON.stringify({ success: false, message: "Please upload at least one file (PDF, PNG, JPG, JPEG, TIFF, DOCX)" }));
                        return;
                    }

                    let recordIds = [];
                    for (let uploadedFile of uploadedFiles) {
                        // Create Custom Record first to get recordId
                        let newRecord = record.create({ type: 'customrecord_lstcptr_vendor_bill_process' });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_subsidiary', value: subsidiaryId || null });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_vendor', value: vendorId || null });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_provider', value: 1 });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_process_status', value: 4 });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_transaction_type', value: 1 });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_date_sent_to_ocr', value: new Date() });
                        newRecord.setValue({ fieldId: 'custrecord_lstcptr_tran_amount_inc_tax', value: 0 });

                        let recordId = newRecord.save();
                        log.debug("Record Created Successfully", recordId);
                        recordIds.push(recordId);

                        // Save the uploaded file to folder 8896 with recordId_filename naming
                        uploadedFile.folder = 8896;
                        let fileId = uploadedFile.save();
                        log.debug("File saved to file cabinet", `File ID: ${fileId}, Name: ${uploadedFile.name}`);

                        // Load the file to get its URL
                        var fileObj = file.load({ id: fileId });
                        var fileUrl = fileObj.url;
                        log.debug("File URL: ", fileUrl);

                        // Update the record with the file ID and URL
                        let updatedRecord = record.load({ type: 'customrecord_lstcptr_vendor_bill_process', id: recordId });
                        updatedRecord.setValue({ fieldId: 'custrecord_lstcptr_pdf_file', value: fileId });
                        updatedRecord.setValue({ fieldId: 'custrecord_lstcptr_file_id', value: fileId });
                        updatedRecord.setValue({ fieldId: 'custrecord_lstcptr_file_url', value: fileUrl || '' });
                        updatedRecord.save();
                        log.debug("Record Updated with File ID and URL", `Record ID: ${recordId}, File ID: ${fileId}`);

                        if (fileId) {
                            uploadedFile = file.load({ id: fileId });
                            log.debug('Loaded File', 'Name: ' + uploadedFile.name + ', Size: ' + uploadedFile.size + ' bytes');

                            record.attach({
                                record: { type: 'file', id: uploadedFile.id },
                                to: { type: 'customrecord_lstcptr_vendor_bill_process', id: recordId }
                            });
                            log.debug('File Attached to Record', 'File: ' + uploadedFile.name + ' attached to Record ID: ' + recordId);
                        }

                        if (nanonetsJson) {
                            // Process Nanonets JSON without saving as a file
                            log.debug('Raw Nanonets JSON:', JSON.stringify(nanonetsJson, null, 2));

                            // Extract and format line items
                            let formattedLineItems = [];

                            if (nanonetsJson && nanonetsJson.result && nanonetsJson.result.length > 0) {
                                const predictions = nanonetsJson.result[0].prediction;
                                predictions.forEach(item => {
                                    if (item.label === 'table' && item.cells) {
                                        item.cells.forEach(cell => {
                                            if (cell.label.toLowerCase().includes('description') || cell.label.toLowerCase().includes('item')) {
                                                formattedLineItems.push({
                                                    label: 'description',
                                                    text: cell.text || ''
                                                });
                                            } else if (cell.label.toLowerCase().includes('amount') || cell.label.toLowerCase().includes('line_amount')) {
                                                formattedLineItems.push({
                                                    label: 'amount',
                                                    text: cell.text || ''
                                                });
                                            }
                                        });
                                    }
                                });
                            }

                            // Pair descriptions and amounts
                            function pairLineItems(items) {
                                let pairedItems = [];
                                for (let i = 0; i < items.length; i++) {
                                    if (items[i].label === 'description' && i + 1 < items.length && items[i + 1].label === 'amount') {
                                        let cleanedAmount = (items[i + 1].text || '').replace('*', '').trim();
                                        // Remove ₹ or any other non-numeric characters (except dot and comma)
                                        cleanedAmount = cleanedAmount.replace(/[₹,]/g, '').trim();
                                        if (items[i].text.trim()) {
                                            pairedItems.push({
                                                description: items[i].text.trim(),
                                                amount: cleanedAmount || '0.00'
                                            });
                                        }
                                        i++; // Skip the next item
                                    }
                                }
                                return pairedItems;
                            }

                            let pairedLineItems = pairLineItems(formattedLineItems);
                            log.debug('Paired Line Items:', JSON.stringify(pairedLineItems, null, 2));
                        }
                    }

                    context.response.write(JSON.stringify({
                        success: true,
                        recordIds: recordIds,
                        error: null,
                        redirectUrl: `https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lstcptr_manually_uploadfile&deploy=customdeploy_lstcptr_manually_uploadfile&whence=`
                    }));
                } catch (error) {
                    log.error({ title: 'Error in POST', details: error });
                    context.response.write(JSON.stringify({
                        success: false,
                        recordIds: [],
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
                columns: ['internalid', 'entityid', 'companyname', 'subsidiary'],
                filters: [['isinactive', 'is', 'false']]
            });

            let pagedResults = vendorSearch.runPaged({ pageSize: 1000 });

            pagedResults.pageRanges.forEach(function(pageRange) {
                let page = pagedResults.fetch({ index: pageRange.index });
                page.data.forEach(function(result) {
                    vendors.push({
                        id: result.getValue('internalid'),
                        name: result.getValue('entityid') + ' ' + (result.getValue('companyname') || ''),
                        subsidiaryId: result.getValue('subsidiary')
                    });
                });
            });

            log.debug({ title: 'All Vendors', details: 'Fetched vendors count: ' + vendors.length });
            return vendors;
        }

        /**
         * Defines the function that checks the license status
         * @param {string} accountId - The account ID to be processed
         * @returns {string} - Returns the license status
         * since 2015.2
         */
        function checkLicenseStatus(accountId) {
            var rtnData = { "licenseStatus": "" };
            try {
                var nHeaders = new Array();
                nHeaders['Content-type'] = 'application/json';
                var accountIDValue = accountId;
                var nResponse = https.requestSuitelet({
                    scriptId: 'customscript_lstcptr_authorization_sl',
                    deploymentId: 'customdeploy_lstcptr_authorization_sl',
                    method: https.Method.GET,
                    urlParams: {
                        accountID: accountIDValue
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                log.debug({ title: strDebugTitle, details: 'Raw Response Body: ' + nResponse.body });

                if (nResponse.code == 200) {
                    var nResponseObj = JSON.parse(nResponse.body);
                    var clientLicenseStatus = nResponseObj.licenseStatus;
                    rtnData.licenseStatus = clientLicenseStatus;
                } else {
                    log.error({ title: strDebugTitle, details: 'Error occurred while fetching the active status.' });
                    return null;
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (checkLicenseStatus) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        /**
         * Defines a function to get the Lstcapture license details
         * @returns {Object} - Returns the LSTcapture license details
         * since 2015.2
         */
        function getSTCaptureLicenseDetails() {
            var rtnData = {};
            try {
                var lstCaptureLicenseSearch = search.create({
                    type: 'customrecord_lstcptr_client_license',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_client_license_status', label: 'License Status' }),
                        search.createColumn({ name: 'custrecord_lstcptr_client_licen_end_date', label: 'License End Date' }),
                        search.createColumn({ name: 'custrecord_lstcptr_nanonet_api_key', label: 'API Key' }),
                        search.createColumn({ name: 'custrecord_lstcptr_nanonet_model_id', label: 'Model ID' })
                    ]
                });

                var searchResult = lstCaptureLicenseSearch.run().getRange({ start: 0, end: 1 })[0];
                if (searchResult) {
                    rtnData.licenseStatus = searchResult.getValue('custrecord_lstcptr_client_license_status');
                    rtnData.licenseEndDate = searchResult.getValue('custrecord_lstcptr_client_licen_end_date');
                    rtnData.apiKey = searchResult.getValue('custrecord_lstcptr_nanonet_api_key');
                    rtnData.modelId = searchResult.getValue('custrecord_lstcptr_nanonet_model_id');
                }
            } catch (err) {
                log.error({ title: strDebugTitle + ' (getSTCaptureLicenseDetails) Error', details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        /**
         * Get the internal ID of an expense category by fuzzy matching the name.
         * @param {string} itemName - The approximate name of the expense category.
         * @returns {string|null} - Internal ID if found, otherwise null.
         */
        function getExpenseItemId(itemName) {
            try {
                var expenseSearch = search.create({
                    type: 'expensecategory',
                    filters: [
                        ['name', 'contains', itemName],
                        'AND',
                        ['isinactive', 'is', 'F']
                    ],
                    columns: ['internalid', 'name']
                });

                let internalId = null;

                expenseSearch.run().each(function (result) {
                    let name = result.getValue({ name: 'name' });
                    log.debug({ title: 'Matching Expense Category', details: name });
                    internalId = result.getValue({ name: 'internalid' });
                    return false; // Stop after first match
                });

                if (internalId) {
                    log.debug({
                        title: 'Expense Category Found',
                        details: 'ID: ' + internalId + ' for Approx Name: ' + itemName
                    });
                } else {
                    log.debug({
                        title: 'Expense Category Not Found',
                        details: 'No match found for approx name: ' + itemName
                    });
                }

                return internalId;

            } catch (error) {
                log.error({
                    title: 'getExpenseItemId Error',
                    details: error.message
                });
                return null;
            }
        }

        /**
         * Helper function to check if a string is valid (non-empty and not null).
         * @param {string} value - String to be checked
         * @returns {boolean} True if the string is valid, false otherwise
         */
        function isValidString(value) {
            if (value != 'null' && value != null && value != '' && value != ' ' && value != undefined && value != 'undefined' && value != 'NaN' && value != NaN)
                return true;
            else
                return false;
        }

        return { onRequest: onRequest };
    });