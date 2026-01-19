#!/usr/bin/env node
const args = process.argv.slice(2);

if (args.includes("--help")) {
    console.log(`
Usage: github-activity <username> [options]

Options:
  --help          Show help
  --limit <n>     Limit number of events displayed
`);
    process.exit(0);
}

const username = args[0];
const limitIndex = args.indexOf("--limit");
const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : null;

if (!username) {
    console.error("Error: GitHub username is required.");
    process.exit(1);
}


function handlePushEvent(event) {
    const commitCount = event.payload.commits?.length;
    return commitCount
        ? `Pushed ${commitCount} commits to ${event.repo.name}`
        : `Pushed commits to ${event.repo.name}`;
}

function handleWatchEvent(event) {
    return `Started watching ${event.repo.name}`;
}

function handleCreateEvent(event) {
    return `Created ${event.payload.ref_type} ${event.payload.ref} in ${event.repo.name}`;
}

function handleForkEvent(event) {
    const forkedRepo = event.payload.forkee?.full_name;
    return forkedRepo
        ? `Forked ${event.repo.name} to ${forkedRepo}`
        : `Forked ${event.repo.name}`;
}

function handleIssuesEvent(event) {
    const action = event.payload.action;
    const issue = event.payload.issue;
    if (!issue || !action) return null;

    if (action === "opened")
        return `Opened issue #${issue.number} "${issue.title}" in ${event.repo.name}`;

    if (action === "closed")
        return `Closed issue #${issue.number} "${issue.title}" in ${event.repo.name}`;

    if (action === "reopened")
        return `Reopened issue #${issue.number} "${issue.title}" in ${event.repo.name}`;

    return null;
}

function handlePullRequestEvent(event) {
    const action = event.payload.action;
    const pr = event.payload.pull_request;
    if (!pr || !action) return null;

    if (action === "opened")
        return `Opened pull request #${pr.number} "${pr.title}" in ${event.repo.name}`;

    if (action === "closed")
        return pr.merged
            ? `Merged pull request #${pr.number} "${pr.title}" in ${event.repo.name}`
            : `Closed pull request #${pr.number} "${pr.title}" in ${event.repo.name}`;

    if (action === "reopened")
        return `Reopened pull request #${pr.number} "${pr.title}" in ${event.repo.name}`;

    return null;
}


function formatEvent(event) {
    const handler = eventHandlers[event.type];
    return handler ? handler(event) : null;
}

const eventHandlers = {
    PushEvent: handlePushEvent,
    WatchEvent: handleWatchEvent,
    CreateEvent: handleCreateEvent,
    ForkEvent: handleForkEvent,
    IssuesEvent: handleIssuesEvent,
    PullRequestEvent: handlePullRequestEvent,

}


async function userActivity(user) {
    const url = `https://api.github.com/users/${user}/events`;

    try {
        let response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                console.error("Error: GitHub user not found.");
            } else if (response.status === 403) {
                console.error("Error: API rate limit exceeded. Try again later.");
            } else {
                console.error("Error: Failed to fetch user activity.");
                console.log("HTTP Status:", response.status);
            }
            process.exit(1);
        }



        let events = await response.json();

        if (events.length === 0) {
            console.error("No recent public activity found.");
            process.exit(0);
        }
    
        let printed = false;

        let count = 0;

        for (let event of events) {
            if (limit && count >= limit) break;

            const output = formatEvent(event);
            if (output) {
                console.log(`- ${output}`);
                count++;
                printed = true;
            }
        }

        if (!printed) {
            console.error("No supported recent activity found.");
        }

    } catch (error) {
            console.error("Error: ", error.message);
            process.exit(1);
    }

}

userActivity(username);