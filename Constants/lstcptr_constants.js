/*********************************************************************************************
 * Copyright © 2025, Oracle and/or its LST Consultancy Pvt. Ltd., All rights reserved.
 *
 * Name:            LSTCPTR Constraints (lstcptr_constants.js)
 *
 * Version:         1.0.0   -   15-July-2025 - RS      Initial Development.
 *
 * Author:          LiveStrong Technologies
 *
 * Purpose:         Centralized constants for LSTCPTR scripts, including field IDs and other reusable values.
 *
 *********************************************************************************************/

/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define([], () => {
    /**
     * Centralized constants for LSTCPTR scripts.
     * @returns {Object} Constants object grouped by category
     */
    return {
        // Debug Titles
        DEBUG_TITLE: 'LSTCPTR Debug',
        BILL_SPLIT_SCREEN_DEBUG_TITLE: 'lstcptr_bill_split_screen',
        VENDOR_CONFIG_CS_DEBUG_TITLE: 'lstcptr_vendor_config_cs',
        VENDOR_CONFIG_UE_DEBUG_TITLE: 'lstcptr_vendor_config_ue',
        AUTHORIZATION_SL_DEBUG_TITLE: 'lstcptr_authorization_sl',
        VENDOR_BILL_PROCESS_DEBUG_TITLE: 'lstcptr_vendor_bill_process',
        MAIN_CONFIG_UE_DEBUG_TITLE: 'lstcptr_main_configuration',
        SUBSIDIARY_CONFIG_UE_DEBUG_TITLE: 'lstcptr_subsidiary_configuration_ue',
        SUBSIDIARY_CONFIG_CS_DEBUG_TITLE: 'lstcptr_subsidiary_con_cs',
        STAGING_RECORD_SPLIT_ON_VIEW: 'lstcptr_called_suitelet_on_view_ue',
        CLIENT_LICENSE_CS_DEBUG_TITLE: 'lstcptr_client_license_cs',
        LICENSE_SL_DEBUG_TITLE: 'lstcptr_liccense_sl',
        BILL_PROCESS_REST_API_DEBUG_TITLE: 'lstcapture_bill_process_rest_api_rl',
        SPLIT_SCREEN_SUITELET_DEBUG_TITLE: 'split_screen_su',
        SUPPORT_EMAIL:'rutik.sarode@livestrongtechnologies.com',

        // Suitelet Configuration
        AUTHORIZATION_SUITELET: {
            SCRIPT_ID: 'customscript_lstcptr_authorization_sl',
            DEPLOYMENT_ID: 'customdeploy_lstcptr_authorization_sl'
        },
        VENDOR_BILL_PROCESS_SUITELET: {
            SCRIPT_ID: 'customscript_lstcptr_vendor_bill_process',
            DEPLOYMENT_ID: 'customdeploy_lstcptr_vendor_bill_process'
        },
        BILL_SPLIT_SCREEN_SUITELET: {
            SCRIPT_ID: 'customscript_lstcptr_bill_split_screen_su',
            DEPLOYMENT_ID: 'customdeploy_lstcptr_bill_split_screen_su'
        },
        STAGING_RECORD_SPLIT_SUITLET: {
            SCRIPT_ID: 'customscript_lstcptr_split_screen_su',
            DEPLOYMENT_ID: 'customdeploy_lstcptr_split_screen_su'
        },
        LICENSE_SUITELET: {
            SCRIPT_ID: 'customscript_lstcptr_liccense_sl',
            DEPLOYMENT_ID: 'customdeploy_lstcptr_liccense_sl'
        },
        MANUALLY_UPLOAD_FILE_SUITELET: {
            SCRIPT_ID: 'customscript_lstcptr_manually_uploadfile',
            DEPLOYMENT_ID: 'customdeploy_lstcptr_manually_uploadfile'
        },

        // Folder IDs
        FOLDER_IDS: {
            JSON_FILES: '8897', // Folder ID for JSON files
            LSTCAPTURE_FILES: 'LSTCapture Files' // Folder name for file attachments
        },

        // Template File Names
        TEMPLATE_FILES: {
            VENDOR_BILL_PROCESS: 'vendor_bill_to_process_html.html',
            SPLIT_SCREEN: 'lstcptr_splitScreenSuitelet.html',
            MANUALLY_UPLOAD_FILE: 'lstcptr_upload_file.html'
        },

        // Script File Names
        SCRIPT_FILES: {
            SUBSIDIARY_CONFIG_CS: 'lstcptr_subsidiary_con_cs.js',
            SEND_EMAIL_CS: './lstcptr_send_email_cs.js'
        },

        // Standard NetSuite Fields
        STANDARD_FIELDS: {
            SUBSIDIARY: {
                INTERNAL_ID: 'internalid',
                NAME: 'name'
            },
            VENDOR: {
                INTERNAL_ID: 'internalid',
                ENTITY_ID: 'entityid',
                COMPANY_NAME: 'companyname',
                SUBSIDIARY: 'subsidiary',
                PAYABLES_ACCOUNT: 'payablesaccount',
                CURRENCY: 'currency'
            },
            EXPENSE_CATEGORY: {
                INTERNAL_ID: 'internalid',
                NAME: 'name',
                ACCOUNT: 'account'
            },
            VENDOR_BILL: {
                ENTITY: 'entity',
                SUBSIDIARY: 'subsidiary',
                TRANID: 'tranid',
                TRANDATE: 'trandate',
                USERTOTAL: 'usertotal',
                DEPARTMENT: 'department',
                CLASS: 'class',
                LOCATION: 'location',
                ACCOUNT: 'account',
                CURRENCY: 'currency',
                PROCESS: 'custbody_lst_vendor_bill_process',
                TRANSACTIONNUMBER: 'transactionnumber',
                APPROVALSTATUS: 'approvalstatus'
            },
            SUBLISTS: {
                EXPENSE: 'expense',
                ITEM: 'item'
            },
            ITEM_FIELDS: {
                QUANTITY: 'quantity',
                PRICE: 'price',
                RATE: 'rate',
                AMOUNT: 'amount',
                DESCRIPTION: 'description'
            },
            EXPENSE_FIELDS: {
                AMOUNT: 'amount',
                MEMO: 'memo',
                CATEGORY: 'category',
                TAXCODE: 'taxcode',
                IS_TAXABLE: 'istaxable'
            },
            FILE: {
                INTERNAL_ID: 'internalid',
                NAME: 'name'
            }
        },

        // Client License Fields
        CLIENT_LICENSE_FIELDS: {
            LICENSE_STATUS: 'custrecord_lstcptr_client_license_status',
            LICENSE_END_DATE: 'custrecord_lstcptr_client_licen_end_date',
            API_KEY: 'custrecord_lstcptr_nanonet_api_key',
            MODEL_ID: 'custrecord_lstcptr_nanonet_model_id',
            ACCOUNT_ID: 'custrecord_lstcptr_client_license_acc_id',
            LICENSE_KEY: 'custrecord_lstcptr_license_key',
            START_DATE: 'custrecord_lstcptr_client_lic_start_date',
            LICENSE_PLAN: 'custrecord_lstcptr_client_license_plan',
            COMPANY_NAME: 'custrecord_lstcptr_company_name',
            COMPANY_EMAIL: 'custrecord_lstcptr_company_email',
            COMPANY_WEBSITE: 'custrecord_lstcptr_company_website',
            INSTALL_USER_NAME: 'custrecord_lstcptr_install_user_name',
            USER_EMAIL: 'custrecord_lstcptr_user_email',
            USER_ROLE: 'custrecord_lstcptr_user_role',
            PRODUCT_VERSION: 'custrecord_lstcptr_client_product_ver',
            PRODUCT_NAME: 'custrecord_lstcptr_client_product_name',
            BUNDLE_ID: 'custrecord_lstcptr_client_bundle_id',
            USAGE_LIMIT: 'custrecord_lstcptr_client_usage_limit',
            DURATION_LIMIT: 'custrecord_lstcptr_client_duration_limit',
            EXPIRE_LICENSE: 'custrecord_lstcptr_client_expire_license'
        },

        // License Record Fields (for customrecord_lstcptr_license)
        LICENSE_RECORD_FIELDS: {
            SYSTEM_GEN_LICENSE_KEY: 'custrecord_lstcptr_system_gen_licensekey',
            ACCOUNT_ID: 'custrecord_lstcptr_account_id',
            LICENSE_STATUS: 'custrecord_lstcptr_license_status',
            INCLUDED_USAGE: 'custrecord_lstcptr_included_usage',
            PRODUCT_NAME: 'custrecord_lstcptr_license_product_name',
            PRODUCT_VERSION: 'custrecord_lstcptr_product_version',
            BUNDLE_ID: 'custrecord_lstcptr_bundle_id',
            USAGE_LIMIT: 'custrecord_lstcptr_license_usage_limit',
            DURATION_LIMIT: 'custrecord_lstcptr_duration_limit',
            EXPIRED_LICENSE: 'custrecord_lstcptr_expired_license',
            START_DATE: 'custrecord_lstcptr_client_license_start_date',
            END_DATE: 'custrecord_lstcptr_client_license_end_date'
        },

        // Vendor Configuration Fields
        VENDOR_BILL_STAGING_FIELDS: {
            BILL_NUMBER: 'custrecord_lstcptr_bill_number',
            BILL_DATE: 'custrecord_lstcptr_bill_date',
            TRAN_AMOUNT_INC_TAX: 'custrecord_lstcptr_tran_amount_inc_tax',
            TRAN_TAX_AMOUNT: 'custrecord_lstcptr_tran_tax_amount',
            VENDOR: 'custrecord_lstcptr_vendor',
            PROCESS_STATUS: 'custrecord_lstcptr_process_status',
            JSON_ITEM_DATA: 'custrecord_lstcptr_json_item_data',
            PDF_FILE: 'custrecord_lstcptr_pdf_file',
            JSON_FILE: 'custrecord_lstcptr_vb_stg_json_file',
            JSON_FILEID: 'custrecord_lstcptr_json_fileid',
            TRANSACTION_TYPE: 'custrecord_lstcptr_transaction_type',
            GEN_TRANSACTION: 'custrecord_lstcptr_gen_transaction',
            GEN_TRANSACTION_DATE: 'custrecord_lstcptr_gen_transaction_date',
            GEN_TRAN_APP_STATUS: 'custrecord_lstcptr_gen_tran_app_status',
            SUBSIDIARY: 'custrecord_lstcptr_subsidiary',
            PROVIDER: 'custrecord_lstcptr_provider',
            DATE_SENT_TO_OCR: 'custrecord_lstcptr_date_sent_to_ocr',
            MEMO: 'custrecord_lstcptr_memo',
            EMAIL_BODY_HTML_TEXT: 'custrecord_lstcptr_email_body_html_text'
        },

        // Main Configuration Fields
        MAIN_CONFIG_FIELDS: {
            BILL_SPLIT_CREATION: 'custrecord_lstcptr_bill_split_creation',
            BILL_SPLIT_EDIT: 'custrecord_lstcptr_bill_split_edit',
            BILL_SPLIT_VIEW: 'custrecord_lstcptr_bill_split_view',
            HTML_TEMPLATE: 'custrecord_lstcptr_html_temp_1',
            HTML_TEMPLATE_2: 'custrecord_lstcptr_html_temp_2',
            FOLDER_INTERNAL_ID: 'custrecord_lstcptr_folder_internal_id'
        },

        // Vendor Bill Staging Fields
        VENDOR_BILL_STAGING_FIELDS: {
            BILL_NUMBER: 'custrecord_lstcptr_bill_number',
            BILL_DATE: 'custrecord_lstcptr_bill_date',
            TRAN_AMOUNT_INC_TAX: 'custrecord_lstcptr_tran_amount_inc_tax',
            TRAN_TAX_AMOUNT: 'custrecord_lstcptr_tran_tax_amount',
            VENDOR: 'custrecord_lstcptr_vendor',
            PROCESS_STATUS: 'custrecord_lstcptr_process_status',
            JSON_ITEM_DATA: 'custrecord_lstcptr_json_item_data',
            PDF_FILE: 'custrecord_lstcptr_pdf_file',
            JSON_FILE: 'custrecord_lstcptr_vb_stg_json_file',
            JSON_FILEID: 'custrecord_lstcptr_json_fileid',
            TRANSACTION_TYPE: 'custrecord_lstcptr_transaction_type',
            GEN_TRANSACTION: 'custrecord_lstcptr_gen_transaction',
            GEN_TRANSACTION_DATE: 'custrecord_lstcptr_gen_transaction_date',
            GEN_TRAN_APP_STATUS: 'custrecord_lstcptr_gen_tran_app_status',
            SUBSIDIARY: 'custrecord_lstcptr_subsidiary',
            PROVIDER: 'custrecord_lstcptr_provider',
            DATE_SENT_TO_OCR: 'custrecord_lstcptr_date_sent_to_ocr',
            MEMO: 'custrecord_lstcptr_memo',
            EMAIL_BODY_HTML_TEXT: 'custrecord_lstcptr_email_body_html_text'
        },

        // Subsidiary Configuration Fields
        SUBSIDIARY_CONFIG_FIELDS: {
            SUBSIDIARY: 'custrecord_lstcptr_sub_config_subsidiary',
            DEPARTMENT: 'custrecord_lstcptr_department',
            CLASS: 'custrecord_lstcptr_class',
            LOCATION: 'custrecord_lstcptr_location',
            FOLDER_ID: 'custrecord_lstcptr_sub_con_folder_id',
            MAIN_CONFIG: 'custrecord_lstcptr_sub_con_main_config'
        },

        // Custom Fields
        CUSTOM_FIELDS: {
            JSON_DATA: 'custpage_lstcptr_json_data',
            HIDDEN_VENDOR_TO_BILL: 'custpage_hidden_vendor_to_bill',
            FILE_URL: 'custpage_lstcptr_file_url',
            SHOW_FILE: 'custpage_lstcptr_show_file',
            FILE_TYPE: 'custpage_file_type',
            FILE_EXTENSION: 'custpage_file_extension',
            SUPPORTED_TYPES: 'custpage_supported_types',
            INLINE_HTML: 'custpage_lstcptr_inline_html',
            TOGGLE_FILE_BUTTON: 'custpage_lstcptr_toggle_file_button',
            CONTEXT_TYPE: 'custpage_lstcptr_context_type',
            HIDDEN_TEXT: 'custpage_hidden_text',
            VB_LINE_DEPARTMENT: 'custbody_lstcptr_vb_line_dep',
            VB_LINE_LOCATION: 'custbody_lstcptr_vb_line_loc',
            VB_LINE_CLASS: 'custbody_lstcptr_vb_line_class',
            HTML_TABLE: 'custpage_lst_html_table',
            FOLDER_DROPDOWN: 'custpage_lstcptr_folder_dropdown',
            FOLDER_DISPLAY: 'custpage_lstcptr_folder_display',
            CONFIGURED_SUBSIDIARIES: 'custpage_lstcptr_configured_subsidiaries',
            LICENSE_KEY: 'custpage_lstcptr_license_key',
            ACCOUNT_ID: 'custpage_lstcptr_account_id',
            INCLUDED_USAGE: 'custpage_lstcptr_included_usage',
            USAGE_LIMIT: 'custpage_lstcptr_usage_limit',
            PRODUCT_NAME: 'custpage_lstcptr_product_name',
            PRODUCT_VERSION: 'custpage_lstcptr_product_version',
            BUNDLE_ID: 'custpage_lstcptr_bundle_id',
            LICENSING_TAB: 'custpage_lstcptr_licensing_tab',
            LICENSE_SUBLIST: 'custpage_lstcptr_license',
            LICENSE_START_DATE: 'custpage_lstcptr_license_start_date',
            LICENSE_END_DATE: 'custpage_lstcptr_license_end_date',
            LICENSE_STATUS: 'custpage_lstcptr_license_status',
            LICENSE_PLAN: 'custpage_lstcptr_license_plan',
            AI_API_KEY: 'custpage_lstcptr_ai_api_key',
            AI_MODEL_ID: 'custpage_lstcptr_ai_model_id',
            SEND_EMAIL_BUTTON: 'custpage_send_email',
            RECORD_ID: 'recordId',
            TRANSACTION_TYPE: 'transactionType',
            SUBSIDIARY: 'subsidiary',
            VENDOR: 'vendor',
            AMOUNT: 'amount',
            MEMO: 'memo',
            DOCUMENT_ORIGIN: 'documentOrigin'
        },

        // Process Status Values
        PROCESS_STATUSES: {
            PROCEED: '1',
            REJECTED: '2',
            PENDING: '2',
            NOT_STARTED: '4',
            EXCLUDED_STATUSES: ['6', '7', '1'] // For getLSTCPTRRecordCount
        },

        // Record Types
        RECORD_TYPES: {
            VENDOR_BILL_STAGING: 'customrecord_lstcptr_vendor_bill_process',
            VENDOR_CONFIG: 'customrecord_lstcptr_vendor_config',
            MAIN_CONFIG: 'customrecord_lstcptr_main_configuration',
            SUBSIDIARY_CONFIG: 'customrecord_lstcptr_subsidiary_config',
            CLIENT_LICENSE: 'customrecord_lstcptr_client_license',
            LICENSE_RECORD: 'customrecord_lstcptr_license'
        },

        // License Plan Values
        LICENSE_PLANS: {
            TRIAL: '1',
            TRIED_VERSION: 'Tried Version',
            UNLIMITED: '2',
            STANDARD: '3',
            PREMIUM: '4'
        },

        // Custom Lists
        CUSTOM_LISTS: {
            LICENSE_PLAN: 'customlist_lstcptr_license_plan',
            TRANSACTION_TYPE: 'customlist_lstcptr_tran_type'
        },

        // File Viewer Supported Types
        FILE_VIEWER: {
            SUPPORTED_TYPES: [
                'text/cache-manifest',
                'application/octet-stream',
                'image/bmp',
                'application/pkix-cert',
                'text/csv',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/x-shockwave-flash',
                'image/gif',
                'text/html',
                'image/x-icon',
                'application/javascript',
                'image/jpeg',
                'image/tiff',
                'application/json',
                'message/rfc822',
                'audio/mpeg',
                'audio/mp4',
                'application/vnd.ms-project',
                'application/pdf',
                'image/pjpeg',
                'text/plain',
                'image/png',
                'application/postscript',
                'application/vnd.ms-powerpoint',
                'video/quicktime',
                'application/rtf',
                'text/css',
                'image/svg+xml',
                'application/x-tar',
                'application/vnd.visio',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/xml',
                'application/zip'
            ],
            SUPPORTED_UPLOAD_EXTENSIONS: ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'docx']
        },

        // Document Origin Values
        DOCUMENT_ORIGIN: {
            NANONET: 'Nanonet'
        },

        // Nanonets Field Mappings
        NANONETS_FIELDS: {
            HEADER_FIELDS: {
                COMPANY_NAME: { nanonets_id: "company_name", ns_id: "" },
                UPLOADED_DATE: { nanonets_id: "uploaded_date", ns_id: "" },
                UPDATED_AT: { nanonets_id: "updated_at", ns_id: "" },
                VENDOR_NAME: { nanonets_id: "vendor_name", ns_id: "custrecord_lstcptr_vendor" },
                DELIVERY_DATE: { nanonets_id: "delivery_date", ns_id: "" },
                PO_DATE: { nanonets_id: "po_date", ns_id: "" },
                BILL_NUMBER: { nanonets_id: "BillNumber", ns_id: "custrecord_lstcptr_bill_number" },
                VENDOR_ADDRESS: { nanonets_id: "vendor_address", ns_id: "" },
                TOTAL_TAX: { nanonets_id: "totaltax", ns_id: "custrecord_lstcptr_tran_tax_amount" },
                TOTAL_AMOUNT: { nanonets_id: "total_amount", ns_id: "custrecord_lstcptr_tran_amount_inc_tax" },
                SUBSIDIARY: { nanonets_id: "Subsidiary", ns_id: "custrecord_lstcptr_subsidiary" }
            },
            ITEM_FIELDS: {
                DESCRIPTION: { nanonets_id: "Description", ns_id: "" },
                LINE_AMOUNT: { nanonets_id: "Line_amount", ns_id: "" },
                UNIT_PRICE: { nanonets_id: "Unit_price", ns_id: "" },
                QUANTITY: { nanonets_id: "Quantity", ns_id: "" }
            },
            FILE_FIELDS: {
                FILENAME: { nanonets_id: "filename", ns_id: "name" },
                FILETYPE: { nanonets_id: "filetype", ns_id: "" },
                CONTENTS: { nanonets_id: "contents", ns_id: "" }
            }
        }
    };
});