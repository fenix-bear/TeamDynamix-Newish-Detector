async function checkTicketComments(ticketID, app) { // gets the comments of the ticket to determine how new it is
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(segment => segment);
    const newPathSegments = pathSegments.slice(0, pathSegments.length - 3);
    const newPath = '/' + newPathSegments.join('/');
    const url = window.location.origin + newPath + '/Apps/Feed/Search?breadcrumbsDetail=1';
    //console.log(url);
    const payload = {
        dateTo: '',
        dateFrom: '',
        replyCount: 3,
        returnCount: 25,
        includePrivate: true,
        projectId: '',
        parentId: '',
        appId: app,
        componentId: 9,
        shortcutIds: '',
        itemId: ticketID, // Use the provided ticket ID
        personUid: '',
        flags: '',
        splitType: 0
    };
    //console.log(payload);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        //console.log(data);

        // Count only the actual communications
        const actualCommunicationsCount = data.entries.filter(
            entry => ((entry.type <= 2) || (entry.type >= 5))).length;

        return actualCommunicationsCount > 0; // Return true if there are actual communications
    } catch (error) {
        console.error('Error fetching ticket comments:', error);
        return false; // Default to no comments on error
    }
}

// Function to update the ticket rows
async function updateTicketRows() {
    const rows = document.getElementsByTagName('tr'); // Select all rows in the table
    //console.log("rows: " + rows.length);
    for (const row of rows) {
        const ticketLink = row.querySelector('td a[href*="TicketDet"]');
        if (ticketLink) {
            const ticketID = new URL(ticketLink.href).searchParams.get('TicketID');
            if (ticketID) {
                const app = Number(ticketLink.href.split('/')[5]);
                const statusCell = row.querySelector('td:nth-child(4)');
                if (statusCell && statusCell.textContent.trim() === 'New') { // only update if it's marked as New
                    const hasComments = await checkTicketComments(ticketID, app);
                    statusCell.textContent = hasComments ? 'Newish' : 'New!';
                }
            }
        }
    }
}

// Set up a MutationObserver to watch for changes in the DOM
const observer = new MutationObserver((mutations) => {
    //console.log("muted");
    updateTicketRows(); // Call the function when the DOM changes
});

// Start observing the document body for added or removed nodes
observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener("DOMContentLoaded", (event) => {
    //console.log("loaded");
    updateTicketRows();
});