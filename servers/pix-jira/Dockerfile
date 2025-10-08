# Pix JIRA MCP Server Dockerfile
# Build from monorepo root: docker build -f servers/pix-jira/Dockerfile -t pix-mcp/jira:latest .

FROM node:20-alpine AS base

WORKDIR /app

FROM base AS builder

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY servers/pix-jira/package*.json ./servers/pix-jira/

# Install all dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY servers/pix-jira ./servers/pix-jira
COPY tsconfig.json ./

# Build shared package first (pix-jira depends on it)
RUN npm run build -w packages/shared

# Build pix-jira server
RUN npm run build -w servers/pix-jira

FROM base AS runner

ENV NODE_ENV=production

# Copy package files for production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder /app/servers/pix-jira/package*.json ./servers/pix-jira/

# Install production dependencies only
RUN npm ci --production --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/servers/pix-jira/dist ./servers/pix-jira/dist
COPY --from=builder /app/servers/pix-jira/package.json ./servers/pix-jira/

# Set working directory to the server
WORKDIR /app/servers/pix-jira

# Keep container alive for docker exec connections from Claude Code
# The MCP server will be started on-demand via: docker exec -i <container> node dist/index.js
CMD ["sleep", "infinity"]
