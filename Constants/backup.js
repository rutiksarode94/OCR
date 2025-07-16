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

        // Folder IDs
        FOLDER_IDS: {
            JSON_FILES: '3465' // Folder ID for JSON files
        },

        // Standard NetSuite Fields
        STANDARD_FIELDS: {
            SUBSIDIARY: {
                INTERNAL_ID: 'internalid',
                NAME: 'name'
            },
            VENDOR: {
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

        // Vendor Configuration Fields
        VENDOR_CONFIG_FIELDS: {
            PARENT_VENDOR: 'custrecord_lstcptr_vendor_con_parent_ven',
            DEPARTMENT: 'custrecord_lstcptr_vendor_con_department',
            CLASS: 'custrecord_lstcptr_vendorr_config_class',
            LOCATION: 'custrecord_lstcptr_vendor_con_location',
            AP_ACCOUNT: 'custrecord_lstcptr_ap_account',
            CURRENCY: 'custrecord_lstcptr_vendor_con_currency',
            ITEM: 'custrecord_lstcptr_vendor_con_item',
            TAX_CODE: 'custrecord_lstcptr_vendor_con_tax_code',
            CATEGORY: 'custrecord_lstcptr_vendor_con_category',
            CONFIGURED_VENDORS: 'custpage_lstcptr_vendor_configured'
        },

        // Main Configuration Fields
        MAIN_CONFIG_FIELDS: {
            BILL_SPLIT_CREATION: 'custrecord_lstcptr_bill_split_creation',
            BILL_SPLIT_EDIT: 'custrecord_lstcptr_bill_split_edit',
            BILL_SPLIT_VIEW: 'custrecord_lstcptr_bill_split_view',
            HTML_TEMPLATE: 'custrecord_lstcptr_html_temp_1'
        },

        // Vendor Bill Staging Fields
        VENDOR_BILL_STAGING_FIELDS: {
            BILL_NUMBER: 'custrecord_lstcptr_bill_number',
            BILL_DATE: 'custrecord_lstcptr_bill_date',
            TRAN_AMOUNT_INC_TAX: 'custrecord_lstcptr_tran_amount_inc_tax',
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
        }, 

        // Subsidiary Configuration Fields
        SUBSIDIARY_CONFIG_FIELDS: {
            SUBSIDIARY: 'custrecord_lstcptr_sub_config_subsidiary',
            DEPARTMENT: 'custrecord_lstcptr_department',
            CLASS: 'custrecord_lstcptr_class',
            LOCATION: 'custrecord_lstcptr_location'
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
            HTML_TABLE: 'custpage_lst_html_table'
        },

        // Process Status Values
        PROCESS_STATUSES: {
            PROCEED: '1',
            REJECTED: '2'
        },

        // Record Types
        RECORD_TYPES: {
            VENDOR_BILL_STAGING: 'customrecord_lstcptr_vendor_bill_process',
            VENDOR_CONFIG: 'customrecord_lstcptr_vendor_config',
            MAIN_CONFIG: 'customrecord_lstcptr_main_configuration',
            SUBSIDIARY_CONFIG: 'customrecord_lstcptr_subsidiary_config',
            CLIENT_LICENSE: 'customrecord_lstcptr_client_license'
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
            ]
        }
    };
});