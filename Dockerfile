# syntax=docker/dockerfile:1
FROM node:26.13.1-trixie-slim
WORKDIR /app

RUN npm install -g corepack && corepack enable

# Times are rendered at build time, so in the workspace's timezone.
ENV TZ=Europe/Oslo

# Dependencies first, so a source change doesn't reinstall them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Shown in the site footer. Last, since it changes on every commit.
ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

# Builds against slackback at runtime, into the volume the auth gate serves.
CMD ["node", "builder.mjs"]
