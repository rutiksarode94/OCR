/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/url'], function(url) {
    function pageInit(context) {
        document.querySelectorAll('a').forEach(link => {
            if (link.innerText === 'View') {
                var recordId = link.href.match(/id=(\d+)/)[1]; // Extract record ID from existing link
                link.href = 'https://tstdrv1423092.app.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_lst_split_screen_su&deploy=1&internalId=' + recordId;
                link.target = '_blank'; // Open in new tab
            }
        });
    }

    return {
        pageInit: pageInit
    };
});
