// Channel URLs are "/channels/<id>-<name>". The name is only a human-readable
// hint: routing uses the ID alone, and the name is never checked, so a renamed
// channel's old links (and bare "/channels/<id>" links) keep working. Slack
// channel IDs never contain "-", so everything after the first one is the name.
export function channelHref(id: string, name: string): string {
	return name === "" ? `/channels/${id}` : `/channels/${id}-${encodeURIComponent(name)}`;
}

export function channelIdFromSegment(segment: string): string {
	const separator = segment.indexOf("-");
	return separator === -1 ? segment : segment.slice(0, separator);
}
