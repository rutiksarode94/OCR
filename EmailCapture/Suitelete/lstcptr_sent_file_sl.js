/*********************************************************************************************
* Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
*
* Name:            LSTCapture Send File To Nanonet From Email SL(emaicaptureforrecord.js)
*
* Version:         2025.1.0   -   25-Apr-2025  -   Added customrecord_lstcptr_vendor_bill_process
*
* Author:          LiveStrong Technologies
*
* Purpose:         This script processes get the fileId at edit mode and ,
*                  sends all attachments to Nanonets for OCR, and attaches files to custrecord_lstcptr_email_pdf_attachment.
*
* Script:          customscript_lstcptr_sent_file_sl
* Deploy:          customdeploy_lstcptr_sent_file_sl
*
* Notes:           Supports all NetSuite file types for Nanonets upload and record attachment.
*
*********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/https', 'N/search', 'N/record', 'N/log'],
    /**
     * @param {https} https
     * @param {search} search
     * @param {record} record
     * @param {log} log
     */
    function(https, search, record, log) {
        const DEBUG_TITLE = 'lstcptr_sent_file_sl';

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} context
         * @param {ServerRequest} context.request - Incoming request
         * @param {ServerResponse} context.response - Suitelet response
         */
        function onRequest(context) {
            const { request, response } = context;
            const debugTitle = `${DEBUG_TITLE}:onRequest`;

            try {
                if (request.method === https.Method.GET) {
                    log.debug("GET request received");
                    handleGetRequest(request, response);
                } else if (request.method === https.Method.POST) {
                    log.debug("POST request received");
                    handlePostRequest(request, response);
                }
            } catch (err) {
                log.error({
                    title: `${debugTitle} Error`,
                    details: JSON.stringify({ error: { code: err.name, message: err.message } })
                });
                response.writeCode = 500;
                response.write({
                    output: JSON.stringify({ error: 'Internal server error' })
                });
            }
        }

        /**
         * Handles GET requests to retrieve Nanonets API credentials.
         * @param {ServerRequest} request
         * @param {ServerResponse} response
         */
        function handleGetRequest(request, response) {
            const debugTitle = `${DEBUG_TITLE}:handleGetRequest`;
            const params = request.parameters;

            if (params.apiCredentials === 'Yes') {
                const credentials = getNanonetsCredentials();
                log.debug({
                    title: debugTitle,
                    details: `Returning API credentials: ${JSON.stringify(credentials)}`
                });

                response.writeCode = 200;
                log.debug({"Response Code": response.writeCode});
                log.debug({"Response Body": JSON.stringify({
                    apiKey: credentials.apiKey || '',
                    modelId: credentials.modelId || ''
                })});
                response.write({
                    output: JSON.stringify({
                        apiKey: credentials.apiKey || '',
                        modelId: credentials.modelId || ''
                    })
                });
                log.debug({
                    title: debugTitle,
                    details: `Response sent successfully`
                });
            } else {
                response.writeCode = 400;
                response.write({
                    output: JSON.stringify({ error: 'Invalid request' })
                });
            }
        }

        /**
         * Handles POST requests to process Nanonets API responses.
         * @param {ServerRequest} request
         * @param {ServerResponse} response
         */
        function handlePostRequest(request, response) {
            const debugTitle = `${DEBUG_TITLE}:handlePostRequest`;
            const body = JSON.parse(request.body || '{}');
            const { recordId, recordType, success, error } = body;

            log.debug({
                title: debugTitle,
                details: `Processing POST request: recordId=${recordId}, recordType=${recordType}, success=${!!success}, error=${!!error}`
            });

            if (!isThereValue(recordId) || !isThereValue(recordType)) {
                response.writeCode = 400;
                response.write({
                    output: JSON.stringify({ error: 'Missing recordId or recordType' })
                });
                return;
            }

            try {
                if (success) {
                    // Update the record to indicate successful upload
                    record.submitFields({
                        type: recordType,
                        id: recordId,
                        values: {
                            custbody_nanonets_upload_file: true
                        },
                        options: {
                            enablesourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    log.debug({
                        title: debugTitle,
                        details: `Successfully updated record ${recordType}:${recordId} with custbody_nanonets_upload_file=true`
                    });

                    response.writeCode = 200;
                    response.write({
                        output: JSON.stringify({ status: 'success', message: 'File uploaded to Nanonets' })
                    });
                } else if (error) {
                    log.error({
                        title: debugTitle,
                        details: `Nanonets API error for record ${recordType}:${recordId}: ${JSON.stringify(error)}`
                    });

                    response.writeCode = 200;
                    response.write({
                        output: JSON.stringify({ status: 'error', message: 'Failed to upload file to Nanonets' })
                    });
                } else {
                    response.writeCode = 400;
                    response.write({
                        output: JSON.stringify({ error: 'Invalid POST data' })
                    });
                }
            } catch (err) {
                log.error({
                    title: `${debugTitle} Error`,
                    details: JSON.stringify({ error: { code: err.name, message: err.message } })
                });
                response.writeCode = 500;
                response.write({
                    output: JSON.stringify({ error: 'Failed to process Nanonets response' })
                });
            }
        }

        /**
         * Retrieves Nanonets API credentials from custom record.
         * @returns {Object} - API key and model ID
         */
        function getNanonetsCredentials() {
            const debugTitle = `${DEBUG_TITLE}:getNanonetsCredentials`;
            const credentials = { apiKey: '', modelId: '' };

            try {
                const licenseSearch = search.create({
                    type: 'customrecord_lstcptr_client_license',
                    filters: [],
                    columns: [
                        search.createColumn({ name: 'custrecord_lstcptr_nanonet_api_key', label: 'API Key' }),
                        search.createColumn({ name: 'custrecord_lstcptr_nanonet_model_id', label: 'Model ID' })
                    ]
                });

                const searchResult = licenseSearch.run().getRange({ start: 0, end: 1 })[0];
                if (searchResult) {
                    credentials.apiKey = searchResult.getValue('custrecord_lstcptr_nanonet_api_key') || '';
                    credentials.modelId = searchResult.getValue('custrecord_lstcptr_nanonet_model_id') || '';
                }
                log.debug({
                    title: debugTitle,
                    details: `Retrieved credentials: apiKey=${credentials.apiKey ? '****' : ''}, modelId=${credentials.modelId}`
                });
            } catch (err) {
                log.error({
                    title: `${debugTitle} Error`,
                    details: JSON.stringify({ error: { code: err.name, message: err.message } })
                });
            }

            return credentials;
        }

        /**
         * Checks if a value exists.
         * @param {any} value - The value to check
         * @returns {boolean} - True if value exists, false otherwise
         */
        function isThereValue(value) {
            return value != null && value !== 'null' && value !== '' && value !== undefined && value !== 'undefined' && value !== 'NaN' && value !== ' ';
        }

        return {
            onRequest: onRequest
        };
    });