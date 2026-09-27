import { defineConfig } from 'auth-astro';
import FusionAuth from "@auth/core/providers/fusionauth";

const fusionAuthUrl = process.env.FUSIONAUTH_URL as string;

type UserinfoRequestArgs = {
    tokens: { access_token?: string };
    provider: { userinfo?: { url?: string } };
};

// oauth4webapi's real userinfo request also validates the response's `sub` claim
// against the ID token's, guarding against token substitution - this bypass skips
// that, so it's only used for the plain-HTTP local dev case below, never in
// production (always HTTPS).
// TODO: revisit - ideally local dev wouldn't need this bypass at all (e.g. a local
// HTTPS proxy in front of FusionAuth), rather than reimplementing the request.
async function insecureUserinfoRequest({ tokens, provider }: UserinfoRequestArgs) {
    const response = await fetch(provider.userinfo?.url as string, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    return response.json();
}

export default defineConfig({
    secret: process.env.AUTH_SECRET,
    trustHost: process.env.AUTH_TRUST_HOST === "true",
    providers: [
        FusionAuth({
            clientId: process.env.FUSIONAUTH_CLIENT_ID,
            clientSecret: process.env.FUSIONAUTH_CLIENT_SECRET,
            issuer: fusionAuthUrl,
            redirectProxyUrl: `${process.env.HOST_URL}/api/auth`,
            token: `${fusionAuthUrl}/oauth2/token`,
            // @auth/core's built-in userinfo fetch (this code path, taken since we don't set
            // idToken: false) never passes oauth4webapi's allowInsecureRequests option, so it
            // unconditionally rejects a plain-HTTP issuer - only a problem for local dev against
            // a plain-HTTP FusionAuth. Production (always HTTPS) keeps the real implementation.
            userinfo: fusionAuthUrl.startsWith("http://")
                ? { url: `${fusionAuthUrl}/oauth2/userinfo`, request: insecureUserinfoRequest }
                : `${fusionAuthUrl}/oauth2/userinfo`,
            authorization: {
                params: {
                    scope: "openid offline_access profile",
                }
            }
        })
    ]
});