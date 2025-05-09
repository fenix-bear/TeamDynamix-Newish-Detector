let cache = {};

async function checkTicketComments(ticketID, app, ticketLink) { // gets the comments of the ticket to determine how new it is
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
        
        // if only checking the comments leads us to conclude the ticket is being worked on, return immediately
        if (comments) return true;
        // otherwise, check for more things

        // filters through all messages of type responsibility change,
        // since human responsibility changes can indicate that the ticket is being worked on,
        // but automated responsibility changes are assumed to not indicate that the ticket is being worked on
        for (const entry of data.entries.filter(entry => (entry.type == 3))) {
            console.log(ticketID, entry.refId);

            if (entry.refId != undefined) { // checks to see if the responsibility change was automated, (refId will be undefined if so)
                // since the responsibility change was by a human, we don't know if it was changed to a group or a person
                // so we must check the ticket contents to find the actual responsibility.
                const html = await (await fetch(ticketLink, { credentials: "include" })).text();
                const ticketContents = new DOMParser().parseFromString(html, "text/html");

                console.log(ticketContents);

                // the responsibility node on the ticket page will have 2 children (1 for the group, 1 for the individual),
                // if there is individual responsibility and 1 (for the group) if there is only group responsibility.
                if (ticketContents.querySelector("#upResponsibility")?.children.length > 1) {
                    return true; // since there is individual responsibility, we know that the ticket must be being worked on so we return true immediately
                }
            }
        }


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
    const rows = Array.from(document.getElementsByTagName('tr')); // Select all rows in the table
    const tasks = rows.map(async row => {
        const ticketLink = row.querySelector('td a[href*="TicketDet"]');
        if (ticketLink) {
            const ticketID = new URL(ticketLink.href).searchParams.get('TicketID');
            if (ticketID) {
                const app = ticketLink.href.split('/')[5];
                const statusCell = row.querySelector('td:nth-child(4) > div');
                if (statusCell && statusCell.textContent.trim() === 'New') { // only update if it's marked as New
                    const hasComments = await checkTicketComments(ticketID, app, ticketLink);
                    statusCell.textContent = hasComments ? 'Newish' : 'New!';
                }
            }
        }
    });

    // Wait for all the per-row tasks to finish
    await Promise.all(tasks);
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