/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/ui/message', 'N/record'], function (currentRecord, https, message, record) {

    function fieldChanged(context) {
        let record = currentRecord.get();
        let fieldId = context.fieldId;

            let vendorField = record.getField({ fieldId: 'custpage_vendor' });
            log.debug("Vendor Id ", vendorField);

            let fileId = record.getField({fieldId:'custpage_upload'});

            if (!vendorField) {
                console.error("Vendor field is missing in the form.");
                showMessage("Vendor field is missing. Check Suitelet setup.", true);
                return;
            }

            // ✅ Clear existing vendor options
            vendorField.removeSelectOption({ value: null });
            vendorField.insertSelectOption({ value: '', text: 'Loading Vendors...' });

            
            // Perform an HTTP POST request to fetch vendors
            https.post.promise({
                url: '/app/site/hosting/scriptlet.nl?script=customscript_extract_data_from_pdf&deploy=customdeploy_extract_data_deploy', // ✅ Replace with actual Suitelet Script ID & Deployment ID
                body: JSON.stringify({ vendorField: vendorField, fileId: fileId }),
                headers: { 'Content-Type': 'application/json' }
            }).then(response => {
                console.log("Response received:", response.body);

                let vendors;
                try {
                    vendors = JSON.parse(response.body);
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                    showMessage("Error parsing vendor data.", true);
                    return;
                }

                // ✅ Clear previous options and add "Select Vendor" option
                vendorField.removeSelectOption({ value: null });
                vendorField.insertSelectOption({ value: '', text: 'Select Vendor' });

                if (!Array.isArray(vendors) || vendors.length === 0) {
                    console.log("No vendors found for this subsidiary.");
                    vendorField.insertSelectOption({ value: '', text: 'No Vendors Found' });
                    return;
                }

                // ✅ Add new vendor options from response
                vendors.forEach(vendor => {
                    vendorField.insertSelectOption({
                        value: vendor.id,
                        text: vendor.name
                    });
                });

                console.log("Vendors updated successfully.");
            }).catch(error => {
                console.error("Error fetching vendors:", error);
                showMessage("Error fetching vendors: " + error.message, true);
                vendorField.removeSelectOption({ value: null });
                vendorField.insertSelectOption({ value: '', text: 'Error Loading Vendors' });
            });
        
    }

    function showMessage(text, isError) {
        message.create({
            title: isError ? 'Error' : 'Info',
            message: text,
            type: isError ? message.Type.ERROR : message.Type.INFORMATION
        }).show({ duration: 5000 });
    }

    return { fieldChanged: fieldChanged };
});