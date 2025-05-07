let cache = {};

async function checkTicketComments(ticketID, app) { // gets the comments of the ticket to determine how new it is
    if (cache[ticketID] == true) { // if it's already newish then there's no point in checking again
        var comments = cache[ticketID];
    } else {
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/').filter(segment => segment);
    const newPathSegments = pathSegments.slice(0, pathSegments.length - 3);
    const newPath = '/' + newPathSegments.join('/');
    const url = window.location.origin + newPath + 'TDNext/Apps/Feed/Search?breadcrumbsDetail=1';
    const payload = {
        dateTo: '',
        dateFrom: '',
        replyCount: '3',
        returnCount: '25',
        includePrivate: 'true',
        projectId: '',
        parentId: '',
        appId: app,
        componentId: '9',
        shortcutIds: '',
        itemId: ticketID,
        personUid: '',
        flags: '',
        splitType: '0'
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: new URLSearchParams(payload).toString()
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        // Count only the actual communications
        const actualCommunicationsCount = data.entries.filter(
            entry => ((entry.type <= 2))).length;
        
        const worklistToggled = data.entries.filter(
            entry => ((entry.type == 5))
        ).length % 2;
        
        var comments = actualCommunicationsCount + worklistToggled > 0; // Return true if there are actual communications
    } catch (error) {
        console.error('Error fetching ticket comments:', error);
        var comments = false;
    }}
    cache[ticketID] = comments;
    return comments;
}

let updating = false;

// Function to update the ticket rows
async function updateTicketRows() {
    if (updating) {return;}
    updating = true;
    const rows = document.getElementsByTagName('tr'); // Select all rows in the table
    for (const row of rows) {
        const ticketLink = row.querySelector('td a[href*="TicketDet"]');
        if (ticketLink) {
            const ticketID = new URL(ticketLink.href).searchParams.get('TicketID');
            if (ticketID) {
                const app = ticketLink.href.split('/')[5];
                const statusCell = row.querySelector('td:nth-child(4) > div');
                if (statusCell && statusCell.textContent.trim() === 'New') { // only update if it's marked as New
                    const hasComments = await checkTicketComments(ticketID, app);
                    statusCell.textContent = hasComments ? 'Newish' : 'New!';
                }
            }
        }
    }
    updating = false;
}

const observer = new MutationObserver((mutations) => {
    updateTicketRows();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

document.addEventListener("DOMContentLoaded", (event) => {
    updateTicketRows();
});