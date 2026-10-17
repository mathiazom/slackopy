FROM node:lts
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY . .
RUN pnpm install --frozen-lockfile

# Builds against slackback at runtime, into the volume the auth gate serves.
CMD ["node", "builder.mjs"]
