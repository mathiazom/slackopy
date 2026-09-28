// Slack escapes literal &, <, > in stored message text as HTML entities, purely
// to disambiguate from its own <@...>/<#...>/<https://...> syntax - it's not HTML.
// Must be undone before our own HTML-escaping, or a literal "&gt;" in a message
// (e.g. "a -&gt; b") would double-escape into the visibly-broken "-&amp;gt;".
import {emojify} from "slackmoji";

function decodeSlackEntities(text: string): string {
	const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">" };
	return text.replace(/&(amp|lt|gt);/g, (_, name: string) => entities[name]);
}

function escapeHtml(text: string): string {
	return decodeSlackEntities(text)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// Slack's mrkdwn, not standard Markdown: single-character markers, no nesting.
// Only http(s) links are matched by construction, so there's no separate scheme
// check needed to keep out javascript: links. Formatting markers require a
// non-word boundary on both sides (matching Slack's own behavior) so they don't
// misfire on stray underscores/asterisks inside URLs or snake_case text. The
// fenced code block alternative comes before inline code so a run of backticks
// is claimed by the block match rather than a spurious empty inline-code match.
// <emoji:url|name> is our own token, not Slack's - slackback substitutes it in
// for a resolved custom emoji shortcode, since it's the one that knows the
// SeaweedFS URL; this is where it actually becomes an <img>. A plain :name:
// slackback couldn't resolve (not a custom/archived emoji) falls through to a
// standard-shortcode lookup here instead, e.g. Slack's own ":smile:" - typing a
// shortcode isn't always auto-converted to the real character before storage.
const TOKEN_PATTERN = /<emoji:([^|>]+)\|([^>]+)>|<(https?:\/\/[^|>]+)(?:\|([^>]*))?>|(?<![\w*])\*([^*\n]+)\*(?![\w*])|(?<![\w_])_([^_\n]+)_(?![\w_])|(?<![\w~])~([^~\n]+)~(?![\w~])|```([^`]+)```|(?<![\w`])`([^`\n]+)`(?![\w`])|:([a-z0-9_+-]+):/g;

// Everything outside a recognized token is escaped before being written out, so
// this is the only place message text becomes real HTML rather than plain text.
function renderInline(text: string): string {
	let html = "";
	let lastIndex = 0;

	for (const match of text.matchAll(TOKEN_PATTERN)) {
		html += escapeHtml(text.slice(lastIndex, match.index));

		const [, emojiUrl, emojiName, linkUrl, linkLabel, bold, italic, strike, codeBlock, code, shortcode] = match;
		if (emojiUrl !== undefined) {
			html += `<img src="${escapeHtml(emojiUrl)}" alt="${escapeHtml(`:${emojiName}:`)}" width="20" height="20" />`;
		} else if (shortcode !== undefined) {
			html += escapeHtml(emojify(`:${shortcode}:`));
		} else if (linkUrl !== undefined) {
			html += `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel ?? linkUrl)}</a>`;
		} else if (bold !== undefined) {
			html += `<strong>${escapeHtml(bold)}</strong>`;
		} else if (italic !== undefined) {
			html += `<em>${escapeHtml(italic)}</em>`;
		} else if (strike !== undefined) {
			html += `<s>${escapeHtml(strike)}</s>`;
		} else if (codeBlock !== undefined) {
			html += `<pre style="white-space: pre-wrap; overflow-wrap: break-word;"><code>${escapeHtml(codeBlock)}</code></pre>`;
		} else {
			html += `<code>${escapeHtml(code)}</code>`;
		}

		lastIndex = match.index + match[0].length;
	}

	html += escapeHtml(text.slice(lastIndex));

	return html;
}

// A citation/quote line is a literal, unescaped ">" at line-start - Slack has no
// separate multi-line marker, just ">" repeated on each quoted line, ending at
// the first line that doesn't have it. A literal ">" someone typed as ordinary
// punctuation is stored as "&gt;" instead, so this can't misfire on that.
export function renderMessageText(text: string): string {
	const lines = text.split("\n");
	let html = "";
	let i = 0;

	while (i < lines.length) {
		if (lines[i].startsWith(">")) {
			const quoted: string[] = [];
			while (i < lines.length && lines[i].startsWith(">")) {
				quoted.push(lines[i].slice(1).replace(/^ /, ""));
				i++;
			}
			html += `<blockquote>${renderInline(quoted.join("\n"))}</blockquote>`;
		} else {
			const normal: string[] = [];
			while (i < lines.length && !lines[i].startsWith(">")) {
				normal.push(lines[i]);
				i++;
			}
			html += renderInline(normal.join("\n"));
		}
	}

	return html;
}
