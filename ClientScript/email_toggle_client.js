/**
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 */
define([], function() {

    function fieldChanged(context) {
        var currentRecord = context.currentRecord;
        var fieldId = context.fieldId;

        if (fieldId === 'custpage_enable_email') {
            var isChecked = currentRecord.getValue({ fieldId: 'custpage_enable_email' });
            currentRecord.getField({ fieldId: 'custpage_email' }).isDisplay = isChecked;
        }
    }

    return { fieldChanged: fieldChanged };
});
