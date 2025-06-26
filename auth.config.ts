import { defineConfig } from 'auth-astro';
import FusionAuth from "@auth/core/providers/fusionauth";

export default defineConfig({
    providers: [
        FusionAuth({
            clientId: import.meta.env.FUSIONAUTH_CLIENT_ID,
            clientSecret: import.meta.env.FUSIONAUTH_CLIENT_SECRET,
            issuer: import.meta.env.FUSIONAUTH_URL,
            redirectProxyUrl: `${import.meta.env.HOST_URL}/api/auth`,
            token: `${import.meta.env.FUSIONAUTH_URL}/oauth2/token`,
            userinfo: `${import.meta.env.FUSIONAUTH_URL}/oauth2/userinfo`,
            authorization: {
                params: {
                    scope: "openid offline_access profile",
                }
            }
        })
    ]
});