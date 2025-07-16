/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/file', 'N/https', 'N/log', 'N/record', 'N/search', 'N/encode', 'N/url', 'N/runtime'],
    function (serverWidget, file, https, log, record, search, encode, url, runtime) {
        function onRequest(context) {
            try {
                var request = context.request;
                var response = context.response;
                var recordId = request.parameters.recordid || 10;
                var accountId = runtime.accountId || "tstdrv1423092";

                var apiKey = '890c9708-0a0e-11f0-a991-aa7ddb3249ef';
                var modelId = '28cf02e0-3cdd-459f-bc1e-22c2d9b8a779';
                var authenticationToken = '';
                authenticationToken = getAuthenticationToken(apiKey);

                NANONETS_API = {
                    KEY: apiKey,
                    MODEL_ID: modelId,
                    BASE_URL: 'https://app.nanonets.com/api/v2/OCR/Model',
                    AUTH_TOKEN: 'Basic ' + authenticationToken
                };
               if(context.request.method === 'GET'){
                    let form = serverWidget.createForm({ title: 'Upload Bill to Process' });

                    // Subsidiary Field
                    let subsidiaryField = form.addField({
                        id: 'custpage_subsidiary',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiary',
                        source: 'subsidiary'
                    });

                    let vendorField = form.addField({
                        id: 'custpage_vendor',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Vendor'
                    });

                    vendorField.addSelectOption({ value: '', text: '' }); // Empty initially

                    let html = form.addField({
                        id: 'custpage_upload',
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Upload PDF File'
                    });
                    html.defaultValue = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Upload bill to process</title>
                <link rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.7.2/font/bootstrap-icons.min.css"
                    integrity="sha512-1fPmaHba3v4A7PaUsComSM4TBsrrRGs+/fv0vrzafQ+Rw+siILTiJa0NtFfvGeyY5E182SDTaF5PqP+XOHgJag=="
                    crossorigin="anonymous" referrerpolicy="no-referrer" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: auto;
                        padding: 20px;
                        height: 100vh;
                        font-size: 1rem;
                    }
                    
                    .page-border {
                        height: 600px;
                        border: 2px solid #4d5f89;
                        padding: 2%;
                        border-radius: 8px;
                    }

                    .heading {
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 20px;
                        color: #4d5f89;
                    }
                    
                    .upload-zone {
                        width: 600px;
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
                       }a
                    
                    .upload-zone label {
                        font-size: 16px;
                    }
                    
                    .upload-btn {
                        width: 150px;
                        height: 40px;
                        margin-top: 20px;
                        left:-100px;
                        background-color: #1976d2;
                        color: white;
                        padding: 10px 0;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        }
                    #infoBox {
                         display: none; /* Hide the message initially */
                    }

                    #uploadStatus {
                        margin-top: 10px;
                        padding: 10px;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    
                    #uploadForm {
                        display: flex;
                        flex-direction: row;
                        flex-wrap: wrap;
                        gap: 250px;
                    }
                    
                    #pdfFile {
                        margin-top: 10px;
                        margin-left: 40px;
                         }
                    
                    .upload-container {
                        display: flex;
                        flex-direction: column;
                        flex-wrap: wrap;
                    }
                    
                    #pdfContainer {
                        display: none;
                        margin-top: 40px;
                        align-items: center;
                        font-family: Arial, sans-serif;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        width: 600px;
                        background-color: #f9f9f9;
                    }

                    #pdfLogo {
                        font-size: 24px;
                        color: #007bff; /* Blue color for PDF icon */
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

                    #uploadStatus {
                        font-size: 12px;
                        color: #666;
                        margin-top: 5px;
                    }

                    #pdfDetails {
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        width: 100%;    
                    }

                    #uploadBar {
                        width: 100%;
                    }
                    
                    #uploadProgress {
                        position: relative;
                        width: 100%;
                        height: 6px;
                        background-color: #e0e0e0;
                        border-radius: 3px;
                        overflow: hidden;
                        margin-top: 8px;
                    }

                    .loading-progress {
                        position: absolute;
                        top: 0;
                        left: 0;
                        height: 100%;
                        width: 100%;
                        background-color: #007bff;
                        animation: loadingAnimation 2s infinite;
                    }

                    @keyframes loadingAnimation {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }

                    #deleteLogo {
                        font-size: 18px;
                        color: #666;
                        cursor: pointer;
                        margin-left: 10px;
                    }

                    #deleteLogo:hover {
                        color: #dc3545 !important;
                    }

                    #status-info {
                        display: flex;
                        flex-direction: row;
                    }   

                    #redirectBtn {
                        margin-top: 14px;
                        font-size: 14px;
                        display: none;
                    }

                    .info-box {
                        background-color: #e0f3ff;
                        padding: 15px;
                        border-radius: 5px;
                        width: 600px;
                        font-family: Arial, sans-serif;
                        position: relative;
                        left: 10px;
                        margin-top: 10px;
                    }
                    .info-box b {
                        font-size: 14px;
                        color: rgb(3, 3, 3);
                    }
                    .info-box ul {
                        padding-left: 20px;
                        margin: 5px 0;
                    }
                    .info-box ul li {
                        font-size: 12px;
                    }
                    .info-box .close-btn {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        cursor: pointer;
                        color: #999;
                        font-size: 14px;
                    }
                    .info-box .close-btn:hover {
                        color: #000;
                    }
                    .info-box .checkbox-container {
                    position: absolute;
                    top: 10px;
                    right: 50px;
                    font-size: 12px;
                }
                </style>

                 <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>

                <script>
                document.addEventListener("DOMContentLoaded", function() {
                let infoBox = document.getElementById("infoBox");
                if (localStorage.getItem("hideInfoMessage") !== "true") {
                    infoBox.style.display = "block"; // Show message only if not hidden
                }
            });

            function hideMessage() {
                let checkbox = document.getElementById("hide_message");
                if (checkbox.checked) {
                    localStorage.setItem("hideInfoMessage", "true"); // Store preference
                }
                document.getElementById("infoBox").style.display = "none"; // Hide the message
            }

                    async function uploadFile() 
                    {
                        try 
                        {
                            var fileInput = document.getElementById('pdfFile');
                            var file = fileInput.files[0];
                            var progressBar = document.getElementById("uploadProgress");
                            var loadingProgress = document.querySelector('.loading-progress');
                            var statusDiv = document.getElementById('uploadStatus');
                            var uploadBtn = document.querySelector('.upload-btn');
                            var uploadZone = document.querySelector('.upload-zone');
                            var redirectBtn = document.getElementById('redirectBtn');
                            var deleteLogo = document.getElementById('deleteLogo');

                            if (file) {
                                // Disable upload button and change styles
                                fileInput.disabled = true;
                                fileInput.style.cursor = 'not-allowed';
                                uploadZone.style.backgroundColor = '#E8E9EB';
                                uploadZone.style.cursor = 'not-allowed';
                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';
                                progressBar.style.display = 'block';
                                loadingProgress.style.display = 'block';

                            }
                            
                              if (!file) {
                                  alert('Please select a PDF file first.');
                                   return;
                               }

                               // Convert file to base64
                                    const base64File = await convertFileToBase64(file);
                                    const fileName = file.name; 
                                    console.log('Base64 file prepared');

                                   // Prepare the form data
                                    var formData = new FormData();
                                    formData.append('file', file);

                                    // Log the request details
                                    console.log('Request URL:', "${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile");

                                    document.getElementById('uploadStatus').innerHTML = 'Uploading file to NanoNets...';

                                    // Make the API call
                                    const response = await fetch("${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile", {
                                        method: 'POST',
                                        headers: {
                                            'accept': 'multipart/form-data',
                                            'Authorization': "${NANONETS_API.AUTH_TOKEN}"
                                        },
                                        body: formData
                                    });

                                    statusDiv.style.color = 'green';
                                    statusDiv.innerHTML = 'File uploaded successfully!';
                                    redirectBtn.style.display = 'block';
                                    fileInput.disabled = false;
                                    fileInput.style.cursor = 'pointer';
                                    uploadZone.style.backgroundColor = '#f9fcfd';
                                    uploadZone.style.cursor = 'pointer';
                                    uploadBtn.disabled = true;
                                    uploadBtn.style.cursor = 'not-allowed';
                                    uploadBtn.style.backgroundColor = '#b3e5f5';
                                    uploadProgress.style.backgroundColor = 'green';
                                    deleteLogo.style.pointerEvents = 'none';
                                    loadingProgress.style.display = 'none';

                                    const responseData = await response.json();
                                    if (!response.ok) {
                                        throw new Error(responseData.message || 'Upload failed to NanoNets');
                                    }
                                    
                                    console.log('Response:', response.status);
                                    
                                    // Combine data for a single AJAX call
                                    const combinedData = {
                                        pdfFile: {
                                            fileName: fileName,
                                            fileType: 'PDF',
                                            b64Data: base64File.split(',')[1]
                                        },
                                        jsonFile: {
                                            fileName: fileName.replace('.pdf', '_mu.json'),
                                            fileType: 'JSON',
                                            b64Data: JSON.stringify(responseData)
                                        },
                                    };
                                    
                                    console.log('Upload completed successfully');

                                    if (response.status === 200 || response.status === 201) 
                                    {
                                        $.ajax({
                                        url: "${url.resolveScript({ scriptId: 'customscript_extract_data_from_pdf', deploymentId: 'customdeploy_extract_data_deploy' })}",
                                        type: "POST",
                                        contentType: 'application/json',
                                        data: JSON.stringify(combinedData),
                                        success: function (data) {
                                            if (data.success) {
                                                console.log('Files uploaded to NetSuite File Cabinet successfully. PDF ID: ', data.pdfFileId, 'JSON ID: ', data.jsonFileId);
                                            }
                                        },
                                        error: function(xhr, status, error) {
                                            console.error('Error uploading to NetSuite:', error);
                                            document.getElementById('uploadStatus').innerHTML = '<div style="color: red;">Upload failed: ' + error.message + '</div>';
                                        }
                                        });

                                    } else {
                                        console.log('Error sending file to Nanonet', 'Failed with response: ', response.body);
                                        document.getElementById('uploadStatus').innerHTML = '<div style="color: red;">Upload failed due to response status: ' + error.message + '</div>';
                                    }
                                    

                            
                        } catch (error) {
                            console.error('Upload Error:', error);
                            document.getElementById('uploadStatus').innerHTML = 
                                '<div style="color: red;">Upload failed to OrderPilot: ' + error.message + '</div>';
                        }

                        try {
                            var fileInput = document.getElementById('pdfFile');
                            if (!fileInput.files.length) {
                                alert("Please select a PDF file.");
                                return;
                            }
                            
                            var file = fileInput.files[0];
                            var formData = new FormData();
                            formData.append("file", file);

                            // Get subsidiary and vendor values from the form
                            var subsidiaryId = document.getElementById('custpage_subsidiary').value;
                            var vendorId = document.getElementById('custpage_vendor').value;
                            if (subsidiaryId) formData.append('MSsubsidiaryId', subsidiaryId);
                            if (vendorId) formData.append('MSvendorId', vendorId);

                            // Call the Suitelet to handle file upload
                            let response = await fetch(window.location.href, {
                                method: "POST",
                                body: formData
                            });

                            let result = await response.json();
                            console.log("Suitelet Response:", result);

                            if (result.success) {
                                alert("Upload Successful! Check console for data.");
                            } else {
                                alert("Upload Failed: " + (result.error || "Unknown error"));
                            }
                        } catch (error) {
                            console.error("Upload Error:", error);
                            alert("Error processing file: " + error.message);
                        }
                    }

                    function convertFileToBase64(file) {
                                return new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(file);
                                });
                            }


                    function validateFile() 
                    {
                        var fileInput = document.getElementById('pdfFile');
                        var file = fileInput.files[0];
                        var progressBar = document.getElementById("uploadProgress");
                        var loadingProgress = document.querySelector('.loading-progress');
                        var statusDiv = document.getElementById('uploadStatus');
                        var uploadBtn = document.querySelector('.upload-btn');
                        var uploadZone = document.querySelector('.upload-zone');
                        var redirectBtn = document.getElementById('redirectBtn');
                        var pdfContainer = document.getElementById('pdfContainer');
                        var deleteLogo = document.getElementById('deleteLogo');
                        
                        
                        if (file) {
                            uploadBtn.disabled = false;
                            uploadBtn.style.cursor = 'pointer';
                            uploadBtn.style.backgroundColor = '#1976d2';
                            uploadZone.style.backgroundColor = '#f9fcfd';
                            uploadZone.style.cursor = 'pointer';
                            progressBar.style.display = 'none';
                            progressBar.style.backgroundColor = '#e0e0e0';
                            loadingProgress.style.display = 'none';
                            deleteLogo.style.pointerEvents = 'all';
                            deleteLogo.style.color = '#666';
                            statusDiv.innerHTML = '';
                            statusDiv.style.color = '#666';
                            redirectBtn.style.display = 'none';
                            
                            console.log('Selected file:', {
                                name: file.name,
                                size: file.size,
                                type: file.type
                            });
                            if (file.type !== 'application/pdf') {
                                alert('Please select a PDF file only.');
                                fileInput.value = '';
                                uploadBtn.disabled = true;
                                uploadBtn.style.cursor = 'not-allowed';
                                uploadBtn.style.backgroundColor = '#b3e5f5';
                                pdfContainer.style.display = 'none';
                            } else {
                                displayFileName(file);
                            }
                        }
                    }
                    
                    function displayFileName(file) {
                        var pdfContainer = document.getElementById('pdfContainer');
                        var pdfLogo = document.getElementById('pdfLogo');
                        var pdfName = document.getElementById('pdfName');
                        var pdfSize = document.getElementById('pdfSize');
                        var deleteLogo = document.getElementById('deleteLogo');
                        pdfContainer.style.display = 'flex';
                        pdfContainer.style.flexDirection = 'Column';
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

                        uploadZone.style.backgroundColor = '#f9fcfd';
                        uploadZone.style.cursor = 'pointer';
                        uploadBtn.disabled = true;
                        uploadBtn.style.cursor = 'not-allowed';
                        uploadBtn.style.backgroundColor = '#b3e5f5';
                        pdfContainer.style.display = 'none';
                        fileInput.value = '';
                    }
                    
                    // Drag and drop functionality
                    document.addEventListener('DOMContentLoaded', function() {
                        var uploadZone = document.querySelector('.upload-zone');
                        var fileInput = document.getElementById('pdfFile');
                        var uploadBtn = document.querySelector('.upload-btn');

                        uploadBtn.disabled = true;
                        uploadBtn.style.cursor = 'not-allowed';
                        uploadBtn.style.backgroundColor = '#b3e5f5';

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

                    // Call the function when the page loads
                    window.addEventListener('load', calculateHeight);

                    // Call the function whenever the window is resized
                    window.addEventListener('resize', calculateHeight);

                </script>
            </head>
            <body> 
                    <div>
                    <div class="info-box" id="infoBox">
                    <span class="close-btn" onclick="hideMessage()">✖</span>
                         <div class="checkbox-container">
                          <input type="checkbox" id="hide_message"> Don't show this message again
                        </div>
                         <b class="info-icon">ⓘ</b>  <b> IMPORTANT</b>
                     <ul>
                            <li>Only PDF files are supported.</li>  
                     </ul>
                    </div>

                    <form id="uploadForm">

                        <div class="container">
                            <div class="upload-container">
                                <div class="upload-zone">
                                    <i class="bi bi-camera" style="font-size: 40px;"></i>
                                    <label for="pdfFile">Upload PDF Files</label>
                                    <input type="file" id="pdfFile" name="file" accept="application/pdf" required onchange="validateFile()">
                                </div>

                                <div id="pdfContainer">
                                    <div id="pdfDetails">
                                        <i class="bi bi-file-pdf" id="pdfLogo" style="display:none;"></i>
                                        <div id="pdfInfo">
                                            <span id="pdfName"></span>
                                            <span id="pdfSize"></span>
                                        </div>
                                        <i class="bi bi-trash" id="deleteLogo" style="display:none;" onClick="deleteLogoHandler()"></i>
                                    </div>
                                    <div id="uploadBar">
                                        <div id="status-info">
                                            <div id="uploadStatus"></div>
                                            <a href="https://${accountId}.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lst_vendor_bill_to_process&deploy=customdeploylst_vendor_bill_to_process&whence=" target="_blank" id="redirectBtn">Redirect To Vendor Bill To Process <i class="bi bi-box-arrow-up-right" id="arrow"></i></a>
                                        </div>
                                        <div id="uploadProgress" style="display: none;">
                                            <div class="loading-progress" style="display:none;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>  
                             </div>
                          <input type="button" class="upload-btn" id="submit" value="Proceed" onclick="uploadFile()">
                    </form>
                </div>
            </body>
        </html>
        `;

                    form.clientScriptModulePath = 'SuiteScripts/OCR Vendor to Bill Process/cs.js';
                    context.response.writePage(form);
               }
               else if (context.request.method === 'POST') {
                    try {
                        let subsidiaryId = context.request.parameters.MSsubsidiaryId;
                        log.debug("Suubsidiary Id1", subsidiaryId);
                        let vendorId ;
                        let requestBody;

                        // Log incoming request details for debugging
                        log.debug("POST Request Details", {
                            parameters: context.request.parameters,
                            body: context.request.body,
                            files: context.request.files ? Object.keys(context.request.files) : null
                        });

                        // Handle file upload (multipart/form-data)
                        if (context.request.files && context.request.files.file) {
                            let uploadedFile = context.request.files.file;
                            let fileObj = file.create({
                                name: uploadedFile.name,
                                fileType: file.Type.PDF,
                                contents: uploadedFile.getContents(),
                                folder: 8896
                            });
                            let fileId = fileObj.save();
                            log.debug("File uploaded", "File ID: " + fileId);

                            let customRecord = record.create({
                                type: 'customrecord_lst_vendor_bill_to_process',
                                isDynamic: true
                            });

                            // Set subsidiaryId and vendorId from form parameters if provided
                            if (context.request.parameters.MSsubsidiaryId && context.request.parameters.MSsubsidiaryId !== 'MSsubsidiaryId') {
                                subsidiaryId = context.request.parameters.MSsubsidiaryId;
                                log.debug("Subsidiary Set", subsidiaryId);
                                customRecord.setValue({
                                    fieldId: 'custrecord_lst_subsidiary',
                                    value: subsidiaryId
                                });
                            }
                            if (context.request.parameters.MSvendorId && context.request.parameters.MSvendorId !== 'MSvendorId') {
                                vendorId = context.request.parameters.MSvendorId;
                                log.debug("Vendor Set", vendorId);
                                customRecord.setValue({
                                    fieldId: 'custrecord_lst_vendor',
                                    value: vendorId
                                });
                            }

                            customRecord.setValue({
                                fieldId: 'custrecord_lst_pdf_file',
                                value: fileId
                            });

                            let customRecordId = customRecord.save();
                            log.debug("Custom Record Created", "Custom Record ID: " + customRecordId);

                            context.response.write(JSON.stringify({ success: true, fileId: fileId, customRecordId: customRecordId }));
                            return;
                        }

                        // Handle JSON body (e.g., from Client Script or AJAX)
                        if (context.request.body) {
                            try {
                                requestBody = JSON.parse(context.request.body);
                                log.debug("Request Body", requestBody);
                            } catch (e) {
                                log.error("JSON Parse Error", e.message);
                                context.response.write(JSON.stringify({ error: "Invalid JSON input" }));
                                return;
                            }

                            subsidiaryId = requestBody.MSsubsidiaryId || null;
                            vendorId = requestBody.MSvendorId ;
                            log.debug("Subsidiary ID", subsidiaryId);
                            log.debug("Vendor ID", vendorId);

                            // Vendor fetch logic (unchanged)
                            let vendorList = [];
                            if (subsidiaryId) {
                                let vendorSearch = search.create({
                                    type: search.Type.VENDOR,
                                    filters: [['subsidiary', 'anyof', subsidiaryId]],
                                    columns: ['entityid', 'companyname']
                                });

                                vendorSearch.run().each(result => {
                                    let companyName = result.getValue('companyname');
                                    let entityId = result.getValue('entityid');
                                    vendorList.push({
                                        id: entityId,
                                        name: entityId + ' ' + companyName
                                    });
                                    return true;
                                });
                                context.response.write(JSON.stringify(vendorList));
                                return;
                            }

                            // Handle JSON file upload from AJAX (e.g., combinedData)
                            if (requestBody.pdfFile && requestBody.jsonFile) {
                                let pdfFile = file.create({
                                    name: requestBody.pdfFile.fileName,
                                    fileType: file.Type.PDF,
                                    contents: requestBody.pdfFile.b64Data,
                                    folder: 8896
                                });
                                let fileId = pdfFile.save();
                                log.debug("PDF File Uploaded", "File ID: " + fileId);

                                let customRecord = record.create({
                                    type: 'customrecord_lst_vendor_bill_to_process',
                                    isDynamic: true
                                });

                                if (subsidiaryId) {
                                    customRecord.setValue({
                                        fieldId: 'custrecord_lst_subsidiary',
                                        value: subsidiaryId
                                    });
                                    log.debug("Subsidiary Set", subsidiaryId);
                                }
                                if (vendorId) {
                                    customRecord.setValue({
                                        fieldId: 'custrecord_lst_vendor',
                                        value: vendorId
                                    });
                                    log.debug("Vendor Set", vendorId);
                                }

                                customRecord.setValue({
                                    fieldId: 'custrecord_lst_pdf_file',
                                    value: fileId
                                });

                                let customRecordId = customRecord.save();
                                log.debug("Custom Record Created", "Custom Record ID: " + customRecordId);

                                context.response.write(JSON.stringify({ success: true, fileId: fileId, customRecordId: customRecordId }));
                                return;
                            }
                        }
                    } catch (error) {
                        log.error({ title: 'Error in POST Method', details: error });
                        context.response.write(JSON.stringify({ error: error.message }));
                    }
                }

                function getAuthenticationToken(apiKey) {
                    var authenticationToken = '';
                    try {
                        var authenticationToken = encode.convert({
                            string: apiKey + ":",
                            inputEncoding: encode.Encoding.UTF_8,
                            outputEncoding: encode.Encoding.BASE_64
                        });
                    } catch (error) {
                        log.error({ title: 'getAuthenticationToken Error', details: JSON.stringify({ code: error.name, message: error.message }) });
                    }
                    return authenticationToken;
                }

            } catch (e) {
                log.error(e);
            }
        }
        return {
            onRequest: onRequest
        };
    });