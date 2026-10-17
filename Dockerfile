FROM node:lts
WORKDIR /app

RUN npm install -g corepack && corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

# Builds against slackback at runtime, into the volume the auth gate serves.
CMD ["node", "builder.mjs"]
