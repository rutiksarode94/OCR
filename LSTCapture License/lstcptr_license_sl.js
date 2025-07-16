/*************************************************************************************
 * Copyright © 2024, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCapture License (lstcptr_license_sl.js)
 *
 * Version:         1.0.0   -   26-Nov-2024  -   RS.     -   Initial development.
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         This Suitelet script is used to retrieve the license information for the LSTCapture Bundle.
 *
 * Script:          customscript_lstcptr_license_sl
 * Deploy:          customdeploy_lstcptr_license_sl
 *
 * Notes:
 *
 * Dependencies:    ./lstcptr_constants
 *
 *************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @FileName lstcptr_license_sl.js
 */
define(['N/https', 'N/config', 'N/search', 'N/record', 'N/format', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget', 'N/email', './lstcptr_constants'],
    /**
     * @param {https} https
     * @param {config} config
     * @param {search} search
     * @param {record} record
     * @param {format} format
     * @param {runtime} runtime
     * @param {message} message
     * @param {serverWidget} serverWidget
     * @param {email} email
     * @param {Object} constants
     */
    function (https, config, search, record, format, runtime, message, serverWidget, email, constants) {
        const strDebugTitle = constants.LICENSE_SL_DEBUG_TITLE;

        function onRequest(context) {
            try {
                const { request, response } = context;
                const nUserObj = runtime.getCurrentUser();
                const nCurrentUserId = nUserObj.id;
                const nUserRoleId = nUserObj.role;
                const nUserName = nUserObj.name;
                const accountId = runtime.accountId;
                log.debug({ title: strDebugTitle, details: `nCurrentUserId: ${nCurrentUserId} || nUserRoleId: ${nUserRoleId} || nUserName: ${nUserName} || accountId: ${accountId}` });

                if (request.method === 'GET') {
                    const form = serverWidget.createForm({
                        title: 'License Overview'
                    });

                    const licenseKeyField = form.addField({
                        id: constants.CUSTOM_FIELDS.LICENSE_KEY,
                        type: serverWidget.FieldType.TEXT,
                        label: 'License Key'
                    });
                    licenseKeyField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    const accountIDField = form.addField({
                        id: constants.CUSTOM_FIELDS.ACCOUNT_ID,
                        type: serverWidget.FieldType.TEXT,
                        label: 'Account ID'
                    });
                    accountIDField.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    const includedUsage = form.addField({
                        id: constants.CUSTOM_FIELDS.INCLUDED_USAGE,
                        type: serverWidget.FieldType.LABEL,
                        label: 'Included Usage'
                    });

                    const usageLimitField = form.addField({
                        id: constants.CUSTOM_FIELDS.USAGE_LIMIT,
                        type: serverWidget.FieldType.INLINEHTML,
                        label: 'Included Usage'
                    });

                    const productName = form.addField({
                        id: constants.CUSTOM_FIELDS.PRODUCT_NAME,
                        type: serverWidget.FieldType.TEXT,
                        label: 'Product Name'
                    });
                    productName.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    const productVersion = form.addField({
                        id: constants.CUSTOM_FIELDS.PRODUCT_VERSION,
                        type: serverWidget.FieldType.TEXT,
                        label: 'Product Version'
                    });
                    productVersion.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    const bundleId = form.addField({
                        id: constants.CUSTOM_FIELDS.BUNDLE_ID,
                        type: serverWidget.FieldType.TEXT,
                        label: 'Bundle ID'
                    });
                    bundleId.updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.INLINE
                    });

                    form.addTab({
                        id: constants.CUSTOM_FIELDS.LICENSING_TAB,
                        label: 'Licensing'
                    });

                    const licenseSublist = form.addSublist({
                        id: constants.CUSTOM_FIELDS.LICENSE_SUBLIST,
                        type: serverWidget.SublistType.LIST,
                        label: 'License',
                        tab: constants.CUSTOM_FIELDS.LICENSING_TAB
                    });

                    licenseSublist.addField({
                        id: constants.CUSTOM_FIELDS.LICENSE_START_DATE,
                        type: serverWidget.FieldType.DATE,
                        label: 'License Start Date'
                    });

                    licenseSublist.addField({
                        id: constants.CUSTOM_FIELDS.LICENSE_END_DATE,
                        type: serverWidget.FieldType.DATE,
                        label: 'License End Date'
                    });

                    licenseSublist.addField({
                        id: constants.CUSTOM_FIELDS.LICENSE_STATUS,
                        type: serverWidget.FieldType.TEXT,
                        label: 'License Status'
                    });

                    licenseSublist.addField({
                        id: constants.CUSTOM_FIELDS.LICENSE_PLAN,
                        type: serverWidget.FieldType.TEXT,
                        label: 'License Plan'
                    });

                    const licenseData = fetchLicenseData();

                    licenseKeyField.defaultValue = licenseData.licenseKey || '';
                    accountIDField.defaultValue = licenseData.accountId || '';
                    includedUsage.defaultValue = licenseData.includedUsage || '';
                    productName.defaultValue = licenseData.productName || '';
                    productVersion.defaultValue = licenseData.productVersion || '';
                    bundleId.defaultValue = licenseData.bundleId || '';

                    const nResponse = fetchLicenseResponse(accountIDField.defaultValue);
                    handleLicenseResponse(nResponse, form, licenseSublist, usageLimitField, licenseData);

                    const nResponseData = nResponse && nResponse.body ? JSON.parse(nResponse.body) : {};
                    const isExpired = nResponseData.expiredLicense === 'T' || (nResponseData.endDate && new Date(nResponseData.endDate) < new Date());
                    const clientLicenseStatus = nResponseData.licenseStatus || '';
                    if (isExpired || clientLicenseStatus === 'Inactive') {
                        form.addButton({
                            id: constants.CUSTOM_FIELDS.SEND_EMAIL_BUTTON,
                            label: 'Send Email',
                            functionName: 'sendEmail'
                        });
                    }

                    form.clientScriptModulePath = constants.SCRIPT_FILES.SEND_EMAIL_CS;

                    response.writePage(form);
                } else if (request.method === 'POST') {
                    try {
                        const apiKey = request.parameters[constants.CUSTOM_FIELDS.AI_API_KEY];
                        const modelId = request.parameters[constants.CUSTOM_FIELDS.AI_MODEL_ID];

                        const orderCaptureLicenseSearch = search.create({
                            type: constants.RECORD_TYPES.LICENSE_RECORD,
                            filters: [],
                            columns: [search.createColumn({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID, label: 'Internal ID' })]
                        });

                        const searchResult = orderCaptureLicenseSearch.run().getRange({ start: 0, end: 1 });
                        if (searchResult.length) {
                            const recordId = searchResult[0].getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                            log.debug({ title: strDebugTitle, details: `Record ID: ${recordId}, API Key: ${apiKey}, Model ID: ${modelId}` });
                        }

                        context.response.sendRedirect({
                            type: 'SUITELET',
                            identifier: constants.LICENSE_SUITELET.SCRIPT_ID,
                            id: constants.LICENSE_SUITELET.DEPLOYMENT_ID
                        });
                    } catch (e) {
                        log.error({ title: strDebugTitle, details: `Error processing POST request: ${e.message}` });
                    }
                }
            } catch (e) {
                log.error({ title: strDebugTitle, details: `Error processing request: ${e.message}` });
                context.response.writePage({
                    title: 'Error',
                    contents: `<p>An error occurred while processing the request: ${e.message}</p>`
                });
            }
        }

        function fetchLicenseResponse(accountIDValue) {
            const debugTitle = 'fetchLicenseResponse';
            try {
                const nResponse = https.requestSuitelet({
                    scriptId: constants.AUTHORIZATION_SUITELET.SCRIPT_ID,
                    deploymentId: constants.AUTHORIZATION_SUITELET.DEPLOYMENT_ID,
                    method: https.Method.GET,
                    urlParams: {
                        accountID: accountIDValue
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                log.debug({ title: debugTitle, details: `Raw Response Body: ${nResponse.body}` });

                if (nResponse.code !== 200) {
                    log.error({ title: debugTitle, details: `Non-200 Response Code: ${nResponse.code}` });
                    throw new Error('Failed to fetch license data: Non-200 response.');
                }

                return nResponse;
            } catch (err) {
                log.error({
                    title: `${debugTitle} (fetchLicenseResponse) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return null;
            }
        }

        function getFormattedDate(date) {
            try {
                if (!isValidString(date)) {
                    log.error({ title: strDebugTitle, details: 'The provided date is null, undefined, or empty.' });
                    return null;
                }
                const dateObj = new Date(date);
                if (isNaN(dateObj.getTime())) {
                    log.error({ title: strDebugTitle, details: `The provided date is invalid: ${date}` });
                    return null;
                }
                const formattedDate = format.format({
                    value: dateObj,
                    type: format.Type.DATE
                });

                log.debug({ title: strDebugTitle, details: `Formatted Date: ${formattedDate}` });
                return formattedDate;
            } catch (err) {
                log.error({ title: `${strDebugTitle} (getFormattedDate) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
                return null;
            }
        }

        function getLSTCPTRRecordCount(durationLimit) {
            let rtnData = 0;
            try {
                const filters = [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['custrecord_lstcptr_process_status', 'noneof', constants.PROCESS_STATUSES.EXCLUDED_STATUSES]
                ];

                if (durationLimit === 'Month') {
                    filters.push('AND', ['created', 'within', 'thismonth']);
                } else if (durationLimit === 'Year') {
                    filters.push('AND', ['created', 'within', 'thisyear']);
                }

                const soStagingSearch = search.create({
                    type: constants.RECORD_TYPES.VENDOR_BILL_STAGING,
                    filters,
                    columns: [
                        search.createColumn({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID, label: 'Internal ID' })
                    ]
                });
                log.debug({ title: strDebugTitle, details: JSON.stringify(soStagingSearch) });

                rtnData = soStagingSearch.runPaged().count;
                log.debug({ title: strDebugTitle, details: `SO Staging record count: ${rtnData}` });
            } catch (err) {
                log.error({ title: `${strDebugTitle} (getLSTCPTRRecordCount) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return rtnData;
        }

        function fetchLicenseData() {
            const licenseData = {};
            try {
                const orderCaptureLicenseSearch = search.create({
                    type: constants.RECORD_TYPES.LICENSE_RECORD,
                    filters: [],
                    columns: [
                        search.createColumn({ name: constants.STANDARD_FIELDS.FILE.INTERNAL_ID, sort: search.Sort.DESC, label: 'Internal ID' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.SYSTEM_GEN_LICENSE_KEY, label: 'System Generated License Key' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.ACCOUNT_ID, label: 'Account ID' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.LICENSE_STATUS, label: 'License Status' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.INCLUDED_USAGE, label: 'Included Usage' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.PRODUCT_NAME, label: 'Product Name' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.PRODUCT_VERSION, label: 'Product Version' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.BUNDLE_ID, label: 'Bundle ID' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.USAGE_LIMIT, label: 'Usage Limit' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.DURATION_LIMIT, label: 'Duration Limit' }),
                        search.createColumn({ name: constants.LICENSE_RECORD_FIELDS.EXPIRED_LICENSE, label: 'Expired License' }),
                    ]
                });

                const searchResult = orderCaptureLicenseSearch.run().getRange({ start: 0, end: 1 })[0];
                if (searchResult) {
                    licenseData.licenseKey = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.SYSTEM_GEN_LICENSE_KEY);
                    licenseData.accountId = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.ACCOUNT_ID);
                    licenseData.licenseStatus = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.LICENSE_STATUS) ? 'Active' : 'Inactive';
                    licenseData.includedUsage = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.INCLUDED_USAGE);
                    licenseData.productName = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.PRODUCT_NAME);
                    licenseData.productVersion = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.PRODUCT_VERSION);
                    licenseData.bundleId = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.BUNDLE_ID);
                    licenseData.internalId = searchResult.getValue(constants.STANDARD_FIELDS.FILE.INTERNAL_ID);
                    licenseData.expiredLicense = searchResult.getValue(constants.LICENSE_RECORD_FIELDS.EXPIRED_LICENSE);
                }

                log.debug({ title: strDebugTitle, details: `License Data: ${JSON.stringify(licenseData)}` });
            } catch (err) {
                log.error({ title: `${strDebugTitle} (fetchLicenseData) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
            }
            return licenseData;
        }

        function handleLicenseResponse(nResponse, form, licenseSublist, usageLimitField, licenseData) {
            try {
                if (!nResponse || !nResponse.body) {
                    log.error({ title: strDebugTitle, details: 'Invalid or undefined response from fetchLicenseResponse' });
                    form.addPageInitMessage({
                        type: message.Type.ERROR,
                        message: 'Failed to fetch license data. Please try again or contact support.',
                        title: 'Error Fetching License Data'
                    });
                    return;
                }

                const nResponseData = JSON.parse(nResponse.body);
                log.debug({ title: strDebugTitle, details: `Parsed Response Data: ${JSON.stringify(nResponseData)}` });

                const { formattedStartDate, formattedEndDate, clientLicenseStatus, isExpired, licensePlan } = formatAndLogLicenseDates(nResponseData);
                const { usageLimit, durationLimit, lstcptrRecordCount } = displayUsageInfo(nResponseData, usageLimitField);

                displayWarnings(form, clientLicenseStatus, lstcptrRecordCount, usageLimit, isExpired);
                setLicenseSublistValues(licenseSublist, formattedStartDate, formattedEndDate, clientLicenseStatus, licensePlan);
                updateLicenseRecord(licenseData.internalId, formattedStartDate, formattedEndDate, clientLicenseStatus, usageLimit, durationLimit, isExpired);
            } catch (err) {
                log.error({ title: `${strDebugTitle} (handleLicenseResponse) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
                form.addPageInitMessage({
                    type: message.Type.ERROR,
                    message: `An error occurred while processing the license data: ${err.message}`,
                    title: 'Error Processing License Data'
                });
            }
        }

        function formatAndLogLicenseDates(nResponseData) {
            try {
                const clientLicenseStartDate = nResponseData.startDate;
                const clientLicenseEndDate = nResponseData.endDate;
                let clientLicenseStatus = nResponseData.licenseStatus;
                const licensePlan = nResponseData.licensePlan || '';
                const isExpired = nResponseData.expiredLicense === 'T' || (clientLicenseEndDate && new Date(clientLicenseEndDate) < new Date());
                if (isExpired) {
                    clientLicenseStatus = 'Inactive';
                }

                log.debug({ title: strDebugTitle, details: `Client License Start Date: ${clientLicenseStartDate}` });

                const formattedStartDate = isValidString(clientLicenseStartDate) ? getFormattedDate(clientLicenseStartDate) : null;
                const formattedEndDate = isValidString(clientLicenseEndDate) ? getFormattedDate(clientLicenseEndDate) : null;

                if (formattedStartDate && formattedEndDate && new Date(formattedEndDate) <= new Date(formattedStartDate)) {
                    throw new Error('End date must be greater than start date.');
                }

                log.debug({ title: strDebugTitle, details: `Formatted Start Date: ${formattedStartDate}` });
                log.debug({ title: strDebugTitle, details: `Formatted End Date: ${formattedEndDate}` });

                return { formattedStartDate, formattedEndDate, clientLicenseStatus, isExpired, licensePlan };
            } catch (err) {
                log.error({ title: `${strDebugTitle} (formatAndLogLicenseDates) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
                throw err;
            }
        }

        function displayUsageInfo(nResponseData, usageLimitField) {
            try {
                const licensePlan = nResponseData.licensePlan || constants.LICENSE_PLANS.TRIAL;
                const durationLimit = nResponseData.durationLimit || 'Month';
                const lstcptrRecordCount = getLSTCPTRRecordCount(durationLimit);

                let usageLimit = 0;
                let usageLabel = '';

                if (licensePlan === constants.LICENSE_PLANS.TRIAL) {
                    usageLimit = 100;
                    usageLabel = `${usageLimit}/${durationLimit}`;
                } else if (licensePlan === constants.LICENSE_PLANS.UNLIMITED) {
                    usageLimit = Number.MAX_SAFE_INTEGER;
                    usageLabel = `Unlimited/${durationLimit}`;
                } else {
                    usageLimit = 100;
                    usageLabel = `${usageLimit}/${durationLimit}`;
                }

                usageLimitField.defaultValue = `
                    <div style="
                        border: 1px solid #ccc;
                        padding: 10px;
                        background-color: #f9f9f9;
                        border-radius: 5px;
                        width: 110px;
                        font-size: 16px;
                        color: black;">
                        ${lstcptrRecordCount}
                        <div style="color: #7f7f82; font-size: 12px;">
                        ${usageLabel}
                        </div>
                    </div>`;

                return { usageLimit, durationLimit, lstcptrRecordCount };
            } catch (err) {
                log.error({
                    title: `${strDebugTitle} (displayUsageInfo) Error`,
                    details: JSON.stringify({ code: err.name, message: err.message })
                });
                return { usageLimit: 0, durationLimit: '', lstcptrRecordCount: 0 };
            }
        }

        function displayWarnings(form, clientLicenseStatus, lstcptrRecordCount, usageLimit, isExpired) {
            try {
                if (isExpired) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license has expired. Please contact support to renew your license.',
                        title: 'License Expired'
                    });
                } else if (clientLicenseStatus === 'Inactive' && lstcptrRecordCount > usageLimit) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license is inactive and your usage limit has been exceeded. Please contact support to reactivate your license and request an increase in your usage limit.',
                        title: 'License Inactive and Usage Limit Exceeded'
                    });
                } else if (clientLicenseStatus === 'Inactive') {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license is inactive. Please contact support to reactivate your license.',
                        title: 'License Inactive'
                    });
                } else if (lstcptrRecordCount > usageLimit) {
                    form.addPageInitMessage({
                        type: message.Type.WARNING,
                        message: 'Your OrderPilot license usage limit has been exceeded. Please contact support to request an increase in your usage limit.',
                        title: 'Usage Limit Exceeded'
                    });
                }
            } catch (err) {
                log.error({ title: `${strDebugTitle} (displayWarnings) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function setLicenseSublistValues(licenseSublist, formattedStartDate, formattedEndDate, clientLicenseStatus, licensePlan) {
            const licensePlanText = getLicensePlanText(licensePlan);
            try {
                licenseSublist.setSublistValue({
                    id: constants.CUSTOM_FIELDS.LICENSE_START_DATE,
                    line: 0,
                    value: formattedStartDate || null
                });

                licenseSublist.setSublistValue({
                    id: constants.CUSTOM_FIELDS.LICENSE_END_DATE,
                    line: 0,
                    value: formattedEndDate || null
                });

                licenseSublist.setSublistValue({
                    id: constants.CUSTOM_FIELDS.LICENSE_STATUS,
                    line: 0,
                    value: clientLicenseStatus === 'Active'
                        ? '<p style="color:#32CD32; margin-left: 5px;">Active</p>'
                        : '<p style="color:red; margin-left: 5px;">Inactive</p>'
                });

                licenseSublist.setSublistValue({
                    id: constants.CUSTOM_FIELDS.LICENSE_PLAN,
                    line: 0,
                    value: licensePlanText || ''
                });
            } catch (err) {
                log.error({ title: `${strDebugTitle} (setLicenseSublistValues) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
            }
        }

        function updateLicenseRecord(recordId, formattedStartDate, formattedEndDate, clientLicenseStatus, usageLimit, durationLimit, isExpired) {
            try {
                const orderCaptureLicenseRecord = record.load({
                    type: constants.RECORD_TYPES.LICENSE_RECORD,
                    id: recordId
                });

                const parsedStartDate = formattedStartDate ? format.parse({
                    value: formattedStartDate,
                    type: format.Type.DATE
                }) : null;

                const parsedEndDate = formattedEndDate ? format.parse({
                    value: formattedEndDate,
                    type: format.Type.DATE
                }) : null;

                if (parsedStartDate && parsedEndDate && parsedEndDate <= parsedStartDate) {
                    throw new Error('End date must be greater than start date.');
                }

                orderCaptureLicenseRecord.setValue(constants.LICENSE_RECORD_FIELDS.START_DATE, parsedStartDate);
                orderCaptureLicenseRecord.setValue(constants.LICENSE_RECORD_FIELDS.END_DATE, parsedEndDate);
                orderCaptureLicenseRecord.setValue(constants.LICENSE_RECORD_FIELDS.LICENSE_STATUS, clientLicenseStatus === 'Active');
                orderCaptureLicenseRecord.setValue(constants.LICENSE_RECORD_FIELDS.USAGE_LIMIT, usageLimit);
                orderCaptureLicenseRecord.setText(constants.LICENSE_RECORD_FIELDS.DURATION_LIMIT, durationLimit);
                orderCaptureLicenseRecord.setValue(constants.LICENSE_RECORD_FIELDS.EXPIRED_LICENSE, !!isExpired);
                orderCaptureLicenseRecord.save();

                log.debug({ title: strDebugTitle, details: 'License record updated successfully.' });
            } catch (err) {
                log.error({ title: `${strDebugTitle} (updateLicenseRecord) Error`, details: JSON.stringify({ code: err.name, message: err.message }) });
                throw err;
            }
        }

        function getLicensePlanText(licensePlanId) {
            const debugTitle = 'getLicensePlanText';
            try {
                if (!licensePlanId) {
                    log.debug(debugTitle, 'No license plan ID provided');
                    return '';
                }

                const result = search.lookupFields({
                    type: constants.CUSTOM_LISTS.LICENSE_PLAN,
                    id: licensePlanId,
                    columns: ['name']
                });

                const planName = result.name || '';
                log.debug(debugTitle, `License Plan Name: ${planName}`);
                return planName;
            } catch (e) {
                log.error(`${debugTitle} Error`, e.message);
                return '';
            }
        }

        function isValidString(value) {
            return value != null && value !== '' && value !== 'undefined' && value !== 'NaN' && !isNaN(new Date(value).getTime());
        }

        return {
            onRequest
        };
    });