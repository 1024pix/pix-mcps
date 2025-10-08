# Pix JIRA MCP Server

Model Context Protocol server for interacting with JIRA.

## Overview

This MCP server enables Claude to retrieve and interact with JIRA issues from the Pix project. It provides tools to fetch issue details, including all relevant metadata, custom Pix fields, development information, and more.

## Features

- 🔍 **Get Issue Details**: Retrieve comprehensive information about any JIRA issue
- 🔐 **Secure Authentication**: Uses personal API tokens (per-user authentication)
- 📊 **Rich Information**: Includes status, assignee, priority, labels, fix versions, parent issues, related issues, and comments
- 🎯 **Pix-Specific Fields**: Supports custom fields like equipix, appli pix, and development information
- ⚡ **Error Handling**: User-friendly error messages without exposing sensitive data
- 🧪 **Type-Safe**: Full TypeScript implementation with Zod validation

## Prerequisites

- **For Docker Setup (Recommended)**: Docker installed on your machine
- **For Development Setup**: Node.js 20.x (specified in root `.nvmrc`)
- JIRA account with access to Pix JIRA instance
- JIRA API token ([Generate here](https://id.atlassian.com/manage-profile/security/api-tokens))

## Quick Start with Docker (Recommended)

**The easiest way to run this MCP server - automatically starts on machine boot!**

### 1. Setup Environment

```bash
cd servers/pix-jira
cp .env.example .env
# Edit .env with your JIRA credentials (see Configuration section below)
```

### 2. Build and Start Container

```bash
# Build and start the container
docker compose up -d --build

# Verify it's running
docker ps | grep pix-jira-mcp
```

### 3. Configure Claude Code

Add to your `~/.config/claude/mcp.json` (or project `.mcp.json`):

```json
{
  "mcpServers": {
    "pix-jira": {
      "command": "docker",
      "args": ["exec", "-i", "pix-jira-mcp", "node", "dist/index.js"]
    }
  }
}
```

### 4. Auto-start on Boot

Add this function to your `~/.zshrc` or `~/.bashrc`:

```bash
# Function to start Pix JIRA MCP container
pix_jira_mcp_start() {
  if command -v docker &> /dev/null; then
    if ! docker ps | grep -q pix-jira-mcp; then
      docker start pix-jira-mcp 2>/dev/null || \
      (cd ~/path/to/pix-mcps/servers/pix-jira && docker compose up -d 2>/dev/null)
    fi
  fi
}

# Auto-start on shell initialization
pix_jira_mcp_start
```

**Note**: Replace `~/path/to/pix-mcps` with the actual path to this repository.

You can now also call `pix_jira_mcp_start` manually, or use it in other functions like:

```bash
# Example: Combined Pix boot function
pixboot() {
  pix_jira_mcp_start
  # Add other Pix MCP servers here
}
```

### Docker Management

```bash
# View logs
docker compose logs -f

# Stop container
docker compose down

# Restart container
docker compose restart

# Rebuild after code changes
docker compose up -d --build
```

## Installation (Development Setup)

From the monorepo root:

```bash
# Install dependencies
npm install

# Install dependencies for this server specifically
npm install --workspace=servers/pix-jira
```

## Configuration

### 1. Create Environment File

Copy the example environment file and configure it:

```bash
cd servers/pix-jira
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` and set your credentials:

```env
# For a JIRA : https://<YOURWORKSPACE>.atlassian.net/browse/<YOUR_PROJECT_ID>-123456

# JIRA Configuration
JIRA_BASE_URL=https://YOURWORKSPACE.atlassian.net
JIRA_EMAIL=your.email@xxx.com
JIRA_API_TOKEN=your_api_token_here

# Optional: Default project key
JIRA_PROJECT_KEY=YOUR_PROJECT_ID

# Logging
LOG_LEVEL=info
```

### 3. Generate JIRA API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Claude MCP")
4. Copy the token and paste it into your `.env` file

**Important**: Keep your API token secure! Never commit the `.env` file to version control.

## Usage

### Running the Server

```bash
# Development mode with hot reload
npm run dev --workspace=servers/pix-jira

# Production mode
npm run build --workspace=servers/pix-jira
npm run start --workspace=servers/pix-jira
```

### Using with Claude Code

Add this server to your `.mcp.json` configuration:

```json
{
  "mcpServers": {
    "pix-jira": {
      "command": "npx",
      "args": ["-w", "servers/pix-jira", "tsx", "src/index.ts"],
      "env": {
        "JIRA_BASE_URL": "https://YOURWORKSPACE.atlassian.net",
        "JIRA_EMAIL": "${JIRA_EMAIL}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}"
      }
    }
  }
}
```

## Available Tools

### `get_issue`

Retrieves detailed information about a JIRA issue.

### `analyze_ticket`

Generates a structured technical analysis prompt for a JIRA ticket. This tool fetches the ticket data and provides Claude with a comprehensive framework to assess complexity, identify risks, analyze dependencies, and recommend development approaches.

**Parameters:**

- `issueKey` (required): JIRA issue key in format `PROJECT-NUMBER` (e.g., `PROJ-1234`)

**Example Usage with Claude:**

```
Get me the details of issue PROJ-1234
```

```
Show me PROJ-5678 without comments
```

```
Analyze ticket PROJ-1234
```

**What it provides:**

- Complexity assessment (Low/Medium/High)
- Potential technical risks
- Dependencies and integration points
- Recommended development approach

**Response Includes:**

- Basic information (summary, status, type, priority, project)
- People (assignee, reporter)
- Parent issue or epic (if applicable)
- Description
- Labels
- Fix versions
- Related issues (issue links)
- Pix custom fields (equipix, appli pix, etc.)
- Development information (branches, pull requests)
- Recent comments
- Timestamps (created, updated)
- Direct link to view in JIRA

## Field Mapping

### Standard Fields

- `summary`: Issue title
- `description`: Full description
- `status`: Current status (e.g., To Do, In Progress, Done)
- `assignee`: Person assigned to the issue
- `reporter`: Person who created the issue
- `priority`: Priority level
- `labels`: Tags/labels
- `fixVersions`: Target release versions
- `issuetype`: Type of issue (Story, Bug, Task, etc.)
- `parent`: Parent issue or epic
- `issuelinks`: Related issues

### Custom Fields (Pix-Specific)

The following custom fields are available (field IDs may need configuration):

- **Equipix**: Team assignment
- **Appli Pix**: Application/component
- **Development**: Branch and PR information

**Note**: Custom field IDs need to be configured in `src/lib/issue-formatter.ts` after identifying the actual field IDs in your JIRA instance.

## Development

### Project Structure

```
servers/pix-jira/
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration loader
│   ├── lib/
│   │   ├── jira-client.ts    # JIRA API client
│   │   ├── jira-client.test.ts
│   │   └── issue-formatter.ts # Issue formatting utilities
│   ├── tools/
│   │   └── get-issue.ts      # get_issue tool implementation
│   └── types/
│       └── jira.ts           # TypeScript type definitions
├── .env.example              # Example environment variables
├── package.json
├── tsconfig.json
└── README.md
```

### Running Tests

```bash
# Run tests
npm test --workspace=servers/pix-jira

# Run tests with coverage
npm run test:coverage --workspace=servers/pix-jira
```

### Type Checking

```bash
npm run typecheck --workspace=servers/pix-jira
```

### Linting

```bash
npm run lint --workspace=servers/pix-jira
npm run lint:fix --workspace=servers/pix-jira
```

## Docker Support

This server can run as a Docker container for easy deployment and isolation.

### Building and Running with Docker Compose

```bash
# From servers/pix-jira directory
cd servers/pix-jira

# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### Building with Docker CLI

```bash
# From monorepo root
docker build -f servers/pix-jira/Dockerfile -t pix-mcp/jira:latest .

# Run
docker run -d \
  --name pix-jira-mcp \
  --env-file servers/pix-jira/.env \
  -i -t \
  pix-mcp/jira:latest
```

### Connecting Claude to Docker Container

**Important:** The container runs `sleep infinity` to stay alive. Claude Code starts the MCP server on-demand using `docker exec`.

Update your `.mcp.json`:

```json
{
  "mcpServers": {
    "pix-jira": {
      "command": "docker",
      "args": ["exec", "-i", "pix-jira-mcp", "node", "dist/index.js"]
    }
  }
}
```

**How it works:**

1. Container stays alive with `sleep infinity`
2. When Claude Code needs MCP tools, it runs: `docker exec -i pix-jira-mcp node dist/index.js`
3. Server starts, connects to JIRA, and serves the request
4. When Claude disconnects, server shuts down gracefully
5. Container remains running for next connection

**Verify container is running:**

```bash
docker ps | grep pix-jira-mcp
# Should show: pix-jira-mcp ... Up ...
```

## Testing

For comprehensive testing guides including manual testing, integration testing with Claude Code, and Docker testing:

**📖 [Testing Guide](./docs/testing-guide.md)** - Complete testing guide for this MCP server

## Identifying Custom Field IDs

To find the actual custom field IDs in your JIRA instance:

1. **Via JIRA UI**:
   - Go to a JIRA issue
   - Click the "..." menu → "View Issue in JSON"
   - Look for `customfield_*` entries

2. **Via API**:

   ```bash
   curl -u your.email@xxx.com:your_api_token \
     https://YOURWORKSPACE.atlassian.net/rest/api/3/issue/PROJ-1234
   ```

3. **Update the formatter**:
   - Edit `src/lib/issue-formatter.ts`
   - Map field IDs to friendly names in `extractCustomFields()`

Example:

```typescript
// In issue-formatter.ts
if (fields.customfield_10050) {
  customFields['Equipe Pix'] = fields.customfield_10050.name;
}
if (fields.customfield_10051) {
  customFields['Appli Pix'] = fields.customfield_10051.name;
}
```

## Troubleshooting

### Authentication Errors

**Error**: `Authentication failed. Please check your JIRA email and API token.`

**Solutions**:

- Verify `JIRA_EMAIL` is correct
- Verify `JIRA_API_TOKEN` is valid and not expired
- Generate a new API token if needed
- Check that your account has access to the Pix JIRA instance

### Issue Not Found

**Error**: `The requested JIRA issue was not found.`

**Solutions**:

- Verify the issue key is correct (e.g., `PROJ-1234`)
- Check that you have permission to view the issue
- Ensure the issue exists in your JIRA project

### Connection Errors

**Error**: `Failed to connect to JIRA. Please check your network connection and JIRA URL.`

**Solutions**:

- Verify `JIRA_BASE_URL` is correct (e.g., `https://YOURWORKSPACE.atlassian.net`)
- Check your network connection
- Verify you can access JIRA in a browser
- Check if there are any firewall restrictions

### Rate Limiting

**Error**: `Rate limit exceeded. Please try again later.`

**Solutions**:

- Wait a few minutes before making more requests
- Reduce the frequency of requests
- Consider caching results if possible

## Prompts

This server includes MCP prompts that provide structured analysis workflows. See [Prompts Guide](./docs/prompts-guide.md) for details on:

- What prompts are and how they work
- How to build your own prompts
- Best practices and testing

## Future Enhancements

Potential features for future versions:

- 🔍 **Search Issues**: JQL-based search
- ✏️ **Create Issues**: Create new JIRA issues
- 🔄 **Update Issues**: Modify existing issues
- 💬 **Add Comments**: Post comments to issues
- 📎 **Attachments**: Download/upload attachments
- 🔔 **Transitions**: Move issues through workflow states
- 📊 **Bulk Operations**: Work with multiple issues
- 🎯 **Saved Filters**: Use pre-defined JQL filters
- 📝 **More Prompts**: Additional analysis and workflow prompts

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

AGPL-3.0

## Support

For issues or questions:

- Check this README and [docs/](./docs/) folder
- Check JIRA API docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- Consult with the Pix development team
