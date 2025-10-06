FROM node:20-alpine AS base

WORKDIR /app

FROM base AS builder

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY servers/pix-jira/package*.json ./servers/pix-jira/

RUN npm ci

COPY packages/shared ./packages/shared
COPY servers/pix-jira ./servers/pix-jira
COPY tsconfig.json ./

RUN npm run build -w packages/shared
RUN npm run build -w servers/pix-jira

FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder /app/servers/pix-jira/package*.json ./servers/pix-jira/

RUN npm ci --production --ignore-scripts

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/servers/pix-jira/dist ./servers/pix-jira/dist
COPY --from=builder /app/servers/pix-jira/package.json ./servers/pix-jira/

WORKDIR /app/servers/pix-jira

CMD ["node", "dist/index.js"]
