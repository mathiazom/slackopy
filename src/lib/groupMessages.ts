// Slack-style grouping of consecutive messages under one author header. Messages
// must be in chronological order. A new group starts when the author changes, when
// their identity (profile) changed between messages, after a gap of more than
// five minutes, or at a day boundary. Messages without an author (bots) never group,
// since there's no identity to tell them apart by.

type Groupable = {
    authorId: string | null;
    authorProfileId: number | null;
    timestamp: string;
};

const MAX_GAP_MS = 5 * 60 * 1000;

export function groupMessages<T extends Groupable>(messages: T[]): T[][] {
    const groups: T[][] = [];
    for (const message of messages) {
        const group = groups.at(-1);
        const previous = group?.at(-1);
        if (group && previous && continuesGroup(previous, message)) {
            group.push(message);
        } else {
            groups.push([message]);
        }
    }
    return groups;
}

function continuesGroup(previous: Groupable, next: Groupable) {
    const previousTime = new Date(previous.timestamp);
    const nextTime = new Date(next.timestamp);
    return next.authorId !== null
        && next.authorId === previous.authorId
        && next.authorProfileId === previous.authorProfileId
        && nextTime.getTime() - previousTime.getTime() <= MAX_GAP_MS
        // Same locale/time zone as the rendered timestamps, so the boundary
        // matches the dates people actually see.
        && previousTime.toLocaleDateString(new Intl.Locale('no')) === nextTime.toLocaleDateString(new Intl.Locale('no'));
}
