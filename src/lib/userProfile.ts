// A profile is one version of a user's profile (see slackback's UserProfiles),
// the identity a message shows its author (or a mention) as, so links and
// popovers are per version rather than per user.

export function profileHref(userId: string, profileId: number): string {
	return `/users/${userId}/${profileId}/`;
}

// Each profile's popover is rendered once per channel page, and every avatar,
// name and mention showing it opens that one.
export function profilePopoverId(profileId: number): string {
	return `profile-${profileId}`;
}
