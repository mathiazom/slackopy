// @ts-check
import {defineConfig} from 'astro/config';

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
    }
});