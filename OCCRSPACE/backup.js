// var apiKey = "K85925613188957";
// fileid = 16524

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/https', 'N/log', 'N/url'], function(file, https, log, url) {
    function onRequest(context) {
        try {
            var request = context.request;
            var response = context.response;
            var fileId = 16524;
            var recordId = 10;

            if (!fileId || !recordId) {
                response.write("Error: Missing File ID or Record ID.");
                return;
            }

            // Load the PDF from NetSuite File Cabinet
            var pdfFile = file.load({ id: fileId });

            // Validate File Type (Only PDFs Allowed)
            if (pdfFile.fileType !== 'PDF') {
                response.write("Error: Invalid file type. Only PDFs are allowed.");
                return;
            }

            // Convert PDF to Base64
            var pdfBase64 = pdfFile.getContents();

            // Send PDF to OCR.space API
            var apiKey = "K85925613188957";
            var ocrResponse = https.post({
                url: 'https://api.ocr.space/parse/image',
                headers: {
                    'apikey': apiKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "base64Image=" + encodeURIComponent("data:application/pdf;base64," + pdfBase64) +
                      "&filetype=pdf" + 
                      "&language=eng" +
                      "&isOverlayRequired=false"
            });

            var extractedText = "No text extracted";
            var extractedData = {};

            if (ocrResponse.code === 200) {
                var responseBody = JSON.parse(ocrResponse.body);
                log.debug('OCR Extracted Data', responseBody);

                if (!responseBody.IsErroredOnProcessing && responseBody.ParsedResults.length > 0) {
                    extractedText = responseBody.ParsedResults[0].ParsedText;

                    // Example: Extracting fields (Modify based on actual PDF format)
                    extractedData = {
                        invoiceNumber: extractedText.match(/Invoice\s*No[:\s]*(\d+)/i)?.[1] || "N/A",
                        totalAmount: extractedText.match(/Total[:\s]*\$(\d+\.\d{2})/i)?.[1] || "N/A",
                        date: extractedText.match(/Date[:\s]*(\d{2}\/\d{2}\/\d{4})/i)?.[1] || "N/A"
                    };
                }
            } else {
                log.error('OCR API Error', ocrResponse.body);
            }

            // Construct NetSuite record URL
            var recordUrl = "https://tstdrv1423092.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2239&id=" + recordId+"&e=T";

            // Split-Screen UI with Direct NetSuite Record Link
            response.write(`
                <html>
                <head>
                    <style>
                        .split-container { display: flex; height: 100vh; }
                        .left-panel, .right-panel { width: 50%; padding: 10px; box-sizing: border-box; }
                        .left-panel { border-right: 1px solid #ccc; }
                    </style>
                </head>
                <body>
                    <div class="split-container">
                        <div class="left-panel">
                            <h2>PDF Preview</h2>
                            <iframe src="${pdfFile.url}" width="100%" height="90%"></iframe>
                        </div>
                        <div class="right-panel">
                            <h2>Vendor Bill Record</h2>
                            <iframe src="${recordUrl}" width="100%" height="90%"></iframe>
                        </div>
                    </div>
                </body>
                </html>
            `);

        } catch (error) {
            log.error('Error Processing OCR', error.message);
            context.response.write("Error: " + error.message);
        }
    }

    return { onRequest: onRequest };
});
