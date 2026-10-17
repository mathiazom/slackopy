// Links point at the bottom of the channel, so it opens at the newest message
// like Slack - the browser jumps to the anchor itself, no script needed.
export const latestAnchorId = "latest";

export function channelHref(id: string): string {
	return `/channels/${id}/#${latestAnchorId}`;
}

// Slack message ids (timestamps like "1788275017.115129") made safe to build
// element ids from.
export function idSafe(messageId: string): string {
	return messageId.replace(/[^a-zA-Z0-9-]/g, "-");
}
