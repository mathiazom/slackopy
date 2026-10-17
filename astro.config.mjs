// @ts-check
import {defineConfig, fontProviders} from 'astro/config';

// https://astro.build/config
export default defineConfig({
    server: {
        allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',') : undefined
    },

    // File URLs are relative ("/files/<fid>"), served by the auth gate in front
    // of the site. The dev server stands in for it, against local SeaweedFS.
    vite: {
        server: {
            proxy: {
                '/files': {
                    target: 'http://localhost:8080',
                    rewrite: (path) => path.replace(/^\/files/, ''),
                },
            },
        },
    },

    // Downloaded from Fontsource at build time and served from our own origin,
    // so the font looks the same on every OS without visitors contacting a
    // third party. Faces are only fetched when used, so 700 italic costs nothing
    // unless bold text appears inside italics.
    experimental: {
        fonts: [{
            provider: fontProviders.fontsource(),
            name: 'Lato',
            cssVariable: '--font-lato',
            weights: [400, 700],
            styles: ['normal', 'italic'],
            subsets: ['latin', 'latin-ext'],
            fallbacks: ['sans-serif'],
        }]
    }
});