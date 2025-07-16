/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/ui/message','N/url'], function (currentRecord, https, message, url) {

    function fieldChanged(context) {
        let record = currentRecord.get();
        let fieldId = context.fieldId;

        if (fieldId === 'custpage_subsidiary') {
            let subsidiaryId = record.getValue({ fieldId: 'custpage_subsidiary' });

            console.log("Selected Subsidiary ID:", subsidiaryId); // Debugging

            let vendorContainer = document.getElementById('custpage_vendor_container'); // Vendor field wrapper
            let vendorDropdown = document.getElementById('custpage_vendor'); // Vendor select dropdown

            // if (!subsidiaryId) {
            //     if (vendorContainer) vendorContainer.style.display = "none"; // Hide vendor dropdown
            //     return;
            // }

            // Show vendor field with "Loading..." before fetching
            if (vendorContainer) vendorContainer.style.display = "block";
            if (vendorDropdown) {
                vendorDropdown.innerHTML = "<option>Loading Vendors...</option>";
            }

            // Perform an HTTP POST request to fetch vendors
            https.post.promise({
                url: '/app/site/hosting/scriptlet.nl?script=2701&deploy=1', // Replace with actual Suitelet Script ID & Deployment ID
                body: JSON.stringify({ subsidiaryId: subsidiaryId }), // ✅ Send subsidiary ID
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

                // If no vendors are found, hide the vendor field
                if (!Array.isArray(vendors) || vendors.length === 0) {
                    console.log("No vendors found for this subsidiary.");
                    return;
                }

                // Show Vendor field
                if (vendorContainer) vendorContainer.style.display = "block";

                // Populate vendor dropdown dynamically
                if (!vendorDropdown) {
                    console.error("Vendor dropdown not found.");
                    return;
                }

                // Clear previous options
                vendorDropdown.innerHTML = ""; // ✅ Removes all existing options

                // Add default "Select Vendor" option
                let defaultOption = document.createElement("option");
                defaultOption.value = "";
                defaultOption.text = "Select Vendor";
                vendorDropdown.appendChild(defaultOption);

                // Add new vendor options from response
                vendors.forEach(vendor => {
                    let option = document.createElement("option");
                    option.value = vendor.id;
                    option.text = vendor.name;
                    vendorDropdown.appendChild(option);
                });

                console.log("Vendors updated successfully.");
            }).catch(error => {
                console.error("Error fetching vendors:", error);
                showMessage("Error fetching vendors: " + error.message, true);
               
            });
        }
    }

    return {  fieldChanged: fieldChanged
     };
});



