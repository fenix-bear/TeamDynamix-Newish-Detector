let cache = {};

async function checkTicketComments(ticketID, app) { // gets the comments of the ticket to determine how new it is
    //console.log(cache);
    if (cache[ticketID] == true) { // if it's already newish then there's no point in checking again
        var comments = cache[ticketID];
    } else {
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

        
        var comments = actualCommunicationsCount > 0; // Return true if there are actual communications
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
            //updated.push(ticketID);
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
    const assignments = document.getElementsByClassName("col-sm-8");
    for (const assignment of assignments) {
        if (assignment.style.width != "50%") {
            assignment.style.width = "50%";
            const attribute = assignment.nextElementSibling;
            const newAttribute = attribute.cloneNode(true);
            newAttribute.querySelector('span').textContent = "Status";
            newAttribute.childNodes[3].textContent = "...";
            attribute.parentElement.insertBefore(newAttribute, attribute);
        }
        //const status = assignment.nextElementSibling;
        //status.querySelector('span').textContent = "Status"
        ////status.textContent = ""
        //const ticketID = new URL(assignment.querySelector('a').href).searchParams.get('TicketID')
    }
    for (const assignment of assignments) {
        const attribute = assignment.nextElementSibling;
        if (attribute.childNodes[3].textContent.trim() === "...") {
            const ticketLink = assignment.querySelector('a').href;
            const response = await fetch(ticketLink);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let status = doc.getElementById("thTicket_lblStatus").textContent;
            if (status.trim() === 'New') {
                const ticketID = new URL(ticketLink).searchParams.get('TicketID');
                const app = Number(ticketLink.split('/')[5]);
                const hasComments = await checkTicketComments(ticketID, app);
                status = hasComments ? 'Newish' : 'New!';
            }
            attribute.childNodes[3].textContent = status;
        }
    }
    updating = false;
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
    updateTicketRows();
});