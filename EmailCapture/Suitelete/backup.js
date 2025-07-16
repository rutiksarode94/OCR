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
        const DEBUG_TITLE = 'nanonets_authorization_su';

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
                    handleGetRequest(request, response);
                } else if (request.method === https.Method.POST) {
                    handlePostRequest(request, response);
                } else {
                    response.writeCode = 405;
                    response.write({
                        output: JSON.stringify({ error: 'Method not allowed' })
                    });
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
                    details: `Returning API credentials: apiKey=${credentials.apiKey ? '****' : ''}, modelId=${credentials.modelId}`
                });

                response.writeCode = 200;
                response.write({
                    output: JSON.stringify({
                        apiKey: credentials.apiKey || '',
                        modelId: credentials.modelId || ''
                    })
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
            log.debug({ title: debugTitle, details: 'Processing POST request' });
            let body;
            log.debug({ title: debugTitle, details: `Request body: ${request.body}` });
            try {
                body = JSON.parse(request.body || '{}');
                log.debug({ title: debugTitle, details: `Parsed request body: ${JSON.stringify(body)}` });
            } catch (e) {
                log.error({ title: debugTitle, details: `Failed to parse request body: ${e.message}` });
                response.writeCode = 400;
                log.debug({ title: debugTitle, details: `Response Code: ${response.writeCode}` });      
                response.write({
                    output: JSON.stringify({ error: 'Invalid request body' })
                });
                return;
            }

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
                            custrecord_lstcptr_pdf_file_uploaded: true // Adjust field ID as needed
                        },
                        options: {
                            enablesourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                    log.debug({
                        title: debugTitle,
                        details: `Successfully updated record ${recordType}:${recordId} with custrecord_lstcptr_pdf_file_uploaded=true`
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