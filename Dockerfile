FROM node:lts
WORKDIR /app

RUN npm install -g corepack && corepack enable

# Times are rendered at build time, so in the workspace's timezone.
ENV TZ=Europe/Oslo

# Shown in the site footer.
ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

COPY . .
RUN pnpm install --frozen-lockfile

# Builds against slackback at runtime, into the volume the auth gate serves.
CMD ["node", "builder.mjs"]
