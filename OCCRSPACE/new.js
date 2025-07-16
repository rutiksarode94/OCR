/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/file', 'N/https', 'N/log', 'N/record', 'N/search', 'N/encode', 'N/url', 'N/runtime'], 
    function(serverWidget, file, https, log, record, search, encode, url, runtime) {
        function onRequest(context) {
            try {
                var request = context.request;
                var response = context.response;
                var fileId = request.parameters.fileid || 17266;
                var recordId = request.parameters.recordid || 10;
                var accountId = runtime.accountId || "tstdrv1423092";
    
                // Load the PDF file from NetSuite
                var pdfFile = file.load({ id: fileId });
                if (pdfFile.fileType !== file.Type.PDF) {
                    response.write(JSON.stringify({ error: "Invalid file type. Only PDFs are allowed." }));
                    return;
                }
                var fileName = pdfFile.name;
                var fileBase64 = pdfFile.getContents(); // Base64-encoded string
                var recordUrl = `https://${accountId}.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2239&id=${recordId}&e=T`;
    
                var apiKey = 'f65974d2-0a0e-11f0-9c0d-fa4e7f320381';
                var modelId = '48b494dd-8aa0-4e83-934e-9a4405f7ad9f';
                var authenticationToken = getAuthenticationToken(apiKey);
    
                var NANONETS_API = {
                    KEY: apiKey,
                    MODEL_ID: modelId,
                    BASE_URL: 'https://app.nanonets.com/api/v2/OCR/Model',
                    AUTH_TOKEN: 'Basic ' + authenticationToken
                };
    
                // Handle POST request (server-side fallback)
                if (context.request.method === 'POST') {
                    var boundary = "----NanonetsBoundary" + Math.random().toString(36).substring(2);
                    var formDataParts = [
                        '--' + boundary,
                        'Content-Disposition: form-data; name="file"; filename="' + fileName + '"',
                        'Content-Type: application/pdf',
                        '',
                        encode.convert({
                            string: fileBase64,
                            inputEncoding: encode.Encoding.BASE_64,
                            outputEncoding: encode.Encoding.UTF_8
                        }),
                        '--' + boundary + '--'
                    ];
                    var formDataBody = formDataParts.join('\r\n');
    
                    var ocrResponse = https.post({
                        url: `${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile/`,
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': NANONETS_API.AUTH_TOKEN,
                            'Content-Type': 'multipart/form-data; boundary=' + boundary
                        },
                        body: formDataBody
                    });
    
                    log.debug("OCR Response", ocrResponse.body);
                    context.response.write(ocrResponse.body);
                    return;
                }
    
                // Render the page with client-side upload
                response.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Create Record From Pdf</title>
                        <style>
                            .split-container { display: flex; height: 100vh; }
                            .left-panel, .right-panel { width: 50%; padding: 10px; box-sizing: border-box; }
                            .left-panel { border-right: 1px solid #ccc; }
                            iframe { width: 100%; height: 100%; border: none; }
                            #uploadStatus { margin-top: 10px; }
                            .extracted-data { margin-top: 10px; font-family: monospace; }
                        </style>
                        <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
                        <script>
                            document.addEventListener('DOMContentLoaded', function() {
                                uploadFile();
                            });
    
                            async function uploadFile() {
                                try {
                                    console.log('Starting uploadFile');
                                    document.getElementById('uploadStatus').innerHTML = 'Uploading file to Nanonets...';
    
                                    const base64File = "data:application/pdf;base64,${fileBase64}";
                                    const fileName = "${fileName}";
    
                                    // Convert Base64 to Blob for multipart/form-data
                                    const byteCharacters = atob(base64File.split(',')[1]);
                                    const byteNumbers = new Array(byteCharacters.length);
                                    for (let i = 0; i < byteCharacters.length; i++) {
                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                    }
                                    const byteArray = new Uint8Array(byteNumbers);
                                    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
                                    // Prepare form data
                                    var formData = new FormData();
                                    formData.append('file', blob, fileName);
    
                                    console.log('Sending request to Nanonets');
                                    const response = await fetch("${NANONETS_API.BASE_URL}/${NANONETS_API.MODEL_ID}/LabelFile", {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': "${NANONETS_API.AUTH_TOKEN}"
                                        },
                                        body: formData
                                    });
    
                                    const responseData = await response.json();
                                    console.log('Nanonets Response:', responseData);
    
                                    if (!response.ok) {
                                        throw new Error(responseData.message || 'Upload failed to Nanonets');
                                    }
    
                                    // Store JSON data in a variable and process it
                                    if (response.status === 200) {
                                        console.log('Upload to Nanonets successful, processing JSON');
                                        const ocrData = responseData; // Store JSON in variable
    
                                        // Extract values from the JSON
                                        let extractedData = {
                                           transactiontype: '',
                                            vendor: '',
                                            subsidiary: '',
                                            status: '',
                                            billNumber: '',
                                            amount: '',
                                            dueDate: ''
                                        };
                                       var jsonData = JSON.parse('${escapedJsonDataString}');
    
                                        if (ocrData.result && ocrData.result.length > 0) {
                                            const predictions = ocrData.result[0].prediction;
                                            predictions.forEach(field => {
                                                if (field.label === 'TransactionType') extractedData.transactiontype = field.ocr_text || '';
                                                if (field.label === 'Vendor') extractedData.vendor = field.ocr_text || '';
                                                if (field.label === 'Subsidiary') extractedData.subsidiary = field.ocr_text || '';
                                                if (field.label === 'Status') extractedData.status = field.ocr_text || '';
                                                if (field.label === 'BillNumber') extractedData.billnumber = field.ocr_text || '';
                                                if (field.label === 'Amount') extractedData.amount = field.ocr_text || '';
                                                if (field.label === 'DueDate') extractedData.dueDate = field.ocr_text || '';
                                            });
                                        }
    
                                        // Display extracted values in the UI
                                        document.getElementById('uploadStatus').innerHTML = 'Upload successful!';
                                        document.getElementById('extractedData').innerHTML = 
                                            'Extracted Data:\\n' +
                                            'TransactionType: ' + extractedData.transactiontype + '\\n' +
                                            'Vendor: ' + extractedData.vendor + '\\n' +
                                            'Subsidiary: ' + extractedData.subsidiary + '\\n' +
                                            'Status: ' + extractedData.status + '\\n' +
                                            'BillNumber: ' + extractedData.billnumber + '\\n' +
                                            'Amount: ' + extractedData.amount + '\\n' +
                                            'Due Date: ' + extractedData.dueDate;
                                    } else {
                                        throw new Error('Unexpected status: ' + response.status);
                                    }
                                } catch (error) {
                                    console.error('Upload Error:', error);
                                    document.getElementById('uploadStatus').innerHTML = '<div style="color: red;">Upload failed: ' + error.message + '</div>';
                                }
                            }
                        </script>
                    </head>
                    <body>
                        <div class="split-container">
                            <div class="left-panel">
                                <h2>PDF Preview</h2>
                                <iframe src="${pdfFile.url}"></iframe>
                            </div>
                            <div class="right-panel">
                                <h2>Vendor Bill Record</h2>
                                <iframe src="${recordUrl}"></iframe>
                                <div id="uploadStatus"></div>
                                <div id="extractedData" class="extracted-data"></div>
                            </div>
                        </div>
                    </body>
                    </html>
                `);

                let jsonData = {
                    transactionType:'',
                    vendor:'',
                    subsidiary:'',
                    status:'',
                    billNumber:'',
                    amount:'',
                    dueDate:''
                }
                log.debug("Json Data: ", jsonData);
                var jsonDataString = JSON.stringify(jsonData);
                var escapedJsonDataString = escapeXml(jsonDataString);
    
            } catch (e) {
                log.error('Error in Suitelet', e);
                context.response.write(JSON.stringify({ error: e.message }));
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
    
        return {
            onRequest: onRequest
        };
    });