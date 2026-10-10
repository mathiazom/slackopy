// Slack escapes literal &, <, > in stored message text as HTML entities, purely
// to disambiguate from its own <@...>/<#...>/<https://...> syntax - it's not HTML.
// Must be undone before our own HTML-escaping, or a literal "&gt;" in a message
// (e.g. "a -&gt; b") would double-escape into the visibly-broken "-&amp;gt;".
import {emoji as emojiMap, emojify} from "slackmoji";

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

// Reverse of slackmoji's shortcode map, for emoji Slack stored as real Unicode
// characters rather than shortcodes. First shortcode wins, which follows
// iamcal/emoji-data's order and so Slack's own primary name (👍 is ":+1:", not
// ":thumbsup:"). Map values are all fully-qualified RGI emoji, the same form
// UNICODE_EMOJI_PATTERN matches in text, so no normalization is needed. (A bare
// "❤" without U+FE0F isn't RGI and renders as text, so it gets no title.)
const shortcodesByEmoji = new Map<string, string>();
for (const [shortcode, char] of Object.entries(emojiMap)) {
	if (!shortcodesByEmoji.has(char)) {
		shortcodesByEmoji.set(char, shortcode);
	}
}

const SKIN_TONE_MODIFIER_PATTERN = /[\u{1F3FB}-\u{1F3FF}]/gu;

// Skin-toned emoji aren't in the map themselves, so they're looked up by base
// emoji and given Slack's own "::skin-tone-N" suffix (U+1F3FB is skin-tone-2).
// Emoji with several modifiers (e.g. multi-person) have no Slack equivalent of
// that form, so they get no shortcode.
function shortcodeForEmoji(char: string): string | undefined {
	const direct = shortcodesByEmoji.get(char);
	if (direct !== undefined) {
		return direct;
	}
	const modifiers = char.match(SKIN_TONE_MODIFIER_PATTERN);
	if (modifiers?.length !== 1) {
		return undefined;
	}
	const base = shortcodeForEmoji(char.replace(SKIN_TONE_MODIFIER_PATTERN, ""));
	const tone = modifiers[0].codePointAt(0)! - 0x1F3FB + 2;
	return base !== undefined ? `${base}::skin-tone-${tone}` : undefined;
}

function renderEmoji(char: string, shortcode: string): string {
	return `<span title="${escapeHtml(`:${shortcode}:`)}">${escapeHtml(char)}</span>`;
}

const UNICODE_EMOJI_PATTERN = /\p{RGI_Emoji}/gv;

// Plain (non-code) text, escaped, with any Unicode emoji given their shortcode
// as a title.
function renderPlain(text: string): string {
	let html = "";
	let lastIndex = 0;

	for (const match of text.matchAll(UNICODE_EMOJI_PATTERN)) {
		html += escapeHtml(text.slice(lastIndex, match.index));
		const shortcode = shortcodeForEmoji(match[0]);
		html += shortcode !== undefined ? renderEmoji(match[0], shortcode) : escapeHtml(match[0]);
		lastIndex = match.index + match[0].length;
	}

	return html + escapeHtml(text.slice(lastIndex));
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
// A trailing skin tone (":+1::skin-tone-3:") is part of the same token, so the
// modifier isn't split from its base emoji into a separate element.
// User/channel mentions arrive with their name already filled in by slackback
// (only archived channels keep the <#...> form, so every one can be linked).
// @here/@channel/@everyone may carry a redundant |label, which is ignored.
const TOKEN_PATTERN = /<emoji:([^|>]+)\|([^>]+)>|<@[UW][A-Z0-9]+\|([^>]*)>|<#([CG][A-Z0-9]+)\|([^>]*)>|<!(here|channel|everyone)(?:\|[^>]*)?>|<(https?:\/\/[^|>]+)(?:\|([^>]*))?>|(?<![\w*])\*([^*\n]+)\*(?![\w*])|(?<![\w_])_([^_\n]+)_(?![\w_])|(?<![\w~])~([^~\n]+)~(?![\w~])|```([^`]+)```|(?<![\w`])`([^`\n]+)`(?![\w`])|:([a-z0-9_+-]+(?:::skin-tone-[2-6])?):/g;

// Everything outside a recognized token is escaped before being written out, so
// this is the only place message text becomes real HTML rather than plain text.
function renderInline(text: string): string {
	let html = "";
	let lastIndex = 0;

	for (const match of text.matchAll(TOKEN_PATTERN)) {
		html += renderPlain(text.slice(lastIndex, match.index));

		const [, emojiUrl, emojiName, userName, channelId, channelName, specialMention, linkUrl, linkLabel, bold, italic, strike, codeBlock, code, shortcode] = match;
		if (emojiUrl !== undefined) {
			html += `<img src="${escapeHtml(emojiUrl)}" alt="${escapeHtml(`:${emojiName}:`)}" title="${escapeHtml(`:${emojiName}:`)}" width="20" height="20" />`;
		} else if (userName !== undefined) {
			html += `<span class="mention">@${renderPlain(userName)}</span>`;
		} else if (channelId !== undefined) {
			html += `<a class="mention" href="/channels/${escapeHtml(channelId)}">#${renderPlain(channelName)}</a>`;
		} else if (specialMention !== undefined) {
			html += `<span class="mention mention--special">@${specialMention}</span>`;
		} else if (shortcode !== undefined) {
			const char = emojify(`:${shortcode}:`);
			html += char !== `:${shortcode}:` ? renderEmoji(char, shortcode) : escapeHtml(char);
		} else if (linkUrl !== undefined) {
			html += `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer">${linkLabel !== undefined ? renderPlain(linkLabel) : escapeHtml(linkUrl)}</a>`;
		} else if (bold !== undefined) {
			html += `<strong>${renderPlain(bold)}</strong>`;
		} else if (italic !== undefined) {
			html += `<em>${renderPlain(italic)}</em>`;
		} else if (strike !== undefined) {
			html += `<s>${renderPlain(strike)}</s>`;
		} else if (codeBlock !== undefined) {
			html += `<pre style="white-space: pre-wrap; overflow-wrap: break-word;"><code>${escapeHtml(codeBlock)}</code></pre>`;
		} else {
			html += `<code>${escapeHtml(code)}</code>`;
		}

		lastIndex = match.index + match[0].length;
	}

	html += renderPlain(text.slice(lastIndex));

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
