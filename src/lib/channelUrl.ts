// Links point at the bottom of the channel, so it opens at the newest message
// like Slack - the browser jumps to the anchor itself, no script needed.
export const latestAnchorId = "latest";

export function channelHref(id: string): string {
	return `/channels/${id}/#${latestAnchorId}`;
}
