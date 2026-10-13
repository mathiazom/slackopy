// Channel URLs are "/channels/<id>-<name>". The name is only a human-readable
// hint: routing uses the ID alone, and the name is never checked, so a renamed
// channel's old links (and bare "/channels/<id>" links) keep working. Slack
// channel IDs never contain "-", so everything after the first one is the name.
//
// Links point at the bottom of the channel, so it opens at the newest message
// like Slack - the browser jumps to the anchor itself, no script needed.
export const latestAnchorId = "latest";

export function channelHref(id: string, name: string): string {
	const path = name === "" ? `/channels/${id}` : `/channels/${id}-${encodeURIComponent(name)}`;
	return `${path}#${latestAnchorId}`;
}

export function channelIdFromSegment(segment: string): string {
	const separator = segment.indexOf("-");
	return separator === -1 ? segment : segment.slice(0, separator);
}
