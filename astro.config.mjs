// @ts-check
import {defineConfig, fontProviders} from 'astro/config';

import auth from 'auth-astro';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    integrations: [auth()],

    adapter: node({
        mode: 'standalone'
    }),

    server: {
        allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',') : undefined
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