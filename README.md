# Pix MCP Servers

A monorepo containing Model Context Protocol (MCP) servers to help Pix developers interact with various Pix systems and instances.

## Global Objective

This repository provides a collection of MCP servers that extend Claude's capabilities by connecting to Pix infrastructure, APIs, and services. These servers enable developers to:

- **Automate workflows**: Interact with Pix systems directly through Claude
- **Query data**: Access information from Pix instances without leaving the development environment
- **Streamline operations**: Perform common tasks and operations on Pix systems
- **Enhance productivity**: Reduce context switching by integrating Pix services into Claude Code

Each MCP server is built using the [Anthropic TypeScript Agent SDK](https://docs.claude.com/en/api/agent-sdk/typescript) and follows Pix coding standards for consistency and maintainability.

## Architecture

This monorepo follows a modular architecture where:

- **Each MCP server** is an independent package with its own tools and capabilities
- **Shared utilities** are centralized in common packages to avoid duplication
- **Configuration** is standardized across all servers for easy maintenance
- **Documentation** is comprehensive and follows consistent patterns

## Repository Structure

```
pix-mcps/
├── servers/              # Individual MCP servers
│   └── [server-name]/   # Each server in its own directory
├── packages/            # Shared packages
│   └── shared/         # Common utilities and types
├── docs/               # Documentation
│   ├── anthropic-sdk-reference.md
│   └── pix-coding-standards.md
├── .nvmrc             # Node.js version specification
├── package.json       # Root package.json for monorepo
└── README.md         # This file
```

## Prerequisites

- **Node.js**: Managed via `.nvmrc` file (use `nvm use` to set the correct version)
- **npm**: Comes with Node.js
- **Git**: For version control
- **Anthropic API Key**: Required for Claude integration

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd pix-mcps

# Use the correct Node.js version
nvm use

# Install dependencies
npm install
```

### 2. Configuration

Each MCP server requires its own configuration. Copy the example environment file and configure it:

```bash
cp servers/[server-name]/.env.example servers/[server-name]/.env
```

Edit the `.env` file with your credentials and configuration.

### 3. Running an MCP Server

```bash
# Development mode with hot reload
npm run dev --workspace=servers/[server-name]

# Production build
npm run build --workspace=servers/[server-name]
```

## Available MCP Servers

### Pix JIRA (`pix-jira`)

MCP server for interacting with the Pix JIRA instance.

**Features:**
- Get detailed information about JIRA issues
- View issue status, assignee, priority, and metadata
- Access parent issues, epics, and related issues
- View labels, fix versions, and comments
- Support for Pix custom fields (equipix, appli pix)

**Available Tools:**
- `get_issue`: Retrieve comprehensive JIRA issue details

**Documentation:** [servers/pix-jira/README.md](./servers/pix-jira/README.md)

## Development

### Creating a New MCP Server

Each MCP server should follow this structure:

```
servers/my-server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── tools/            # Individual tool implementations
│   │   └── my-tool.ts
│   └── config.ts         # Server configuration
├── tests/                # Test files
├── .env.example          # Example environment variables
├── package.json          # Server dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md            # Server documentation
```

### Code Quality

This monorepo uses several tools to ensure code quality:

- **ESLint**: For code linting
- **Prettier**: For code formatting
- **TypeScript**: For type safety
- **Vitest**: For testing

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run tests
npm run test

# Type check
npm run typecheck
```

### Environment Variables

All sensitive configuration should be stored in `.env` files:

```env
# Pix API Configuration
PIX_API_URL=https://api.pix.fr
PIX_API_KEY=your_api_key_here

# Server Configuration
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

**Important**: Never commit `.env` files! Always use `.env.example` for documentation.

## Using MCP Servers with Claude

### Configuration File

Create or update `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "pix-api": {
      "command": "npx",
      "args": ["-w", "servers/pix-api", "tsx", "src/index.ts"],
      "env": {
        "PIX_API_URL": "https://api.pix.fr",
        "PIX_API_KEY": "${PIX_API_KEY}"
      }
    }
  }
}
```

### Using in Code

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Get user information for user ID 123",
  options: {
    mcpServers: {
      "pix-api": {
        command: "npx",
        args: ["-w", "servers/pix-api", "tsx", "src/index.ts"]
      }
    },
    allowedTools: ["mcp__pix-api__get_user"]
  }
})) {
  console.log(message);
}
```

## Docker Support

Each MCP server can be containerized for easy deployment:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "dist/index.js"]
```

Run with Docker:

```bash
docker build -t pix-mcp-server .
docker run -d --env-file .env pix-mcp-server
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific server
npm test --workspace=servers/[server-name]

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Use Vitest for testing:

```typescript
import { describe, it, expect } from 'vitest';
import { myTool } from './my-tool';

describe('MyTool', () => {
  it('should return expected result', async () => {
    const result = await myTool.execute({ id: '123' });
    expect(result).toBeDefined();
  });
});
```

### Manual Testing and Integration Testing

For comprehensive testing guides, including manual testing with real credentials and integration testing:

**📖 [Testing Guide](./docs/testing-guide.md)** - Complete guide for testing MCP servers

Topics covered:
- Quick test with test scripts
- Testing with Claude Code integration
- Manual API testing
- Verifying custom fields
- Common issues and troubleshooting
- Testing checklist

**For developers extending or building MCP servers:**

**📚 [Developer Learnings](./docs/developer-learnings.md)** - Lessons learned and best practices

Topics covered:
- Architecture decisions and rationale
- Anthropic SDK patterns and gotchas
- JIRA API quirks and workarounds
- Custom field discovery process
- Code patterns and anti-patterns
- Performance considerations
- Future improvements

## Documentation

### Available Documentation

- [Anthropic SDK Reference](./docs/anthropic-sdk-reference.md): Complete guide to the Anthropic TypeScript SDK and MCP
- [Pix Coding Standards](./docs/pix-coding-standards.md): Coding conventions and best practices

### Adding Documentation

- Document all tools and their parameters
- Provide usage examples
- List required environment variables
- Document error conditions and handling

## Contributing

### Workflow

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes following the coding standards
3. Write tests for your changes
4. Run linting and tests: `npm run lint && npm test`
5. Commit with conventional commits: `git commit -m "feat: add new tool"`
6. Push and create a pull request

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

## Troubleshooting

### Common Issues

**Node.js version mismatch**
```bash
nvm use
```

**Missing environment variables**
- Check `.env.example` for required variables
- Ensure `.env` file exists and is properly configured

**Type errors**
```bash
npm run typecheck
```

**MCP server not starting**
- Check logs for errors
- Verify environment variables are set
- Ensure dependencies are installed

## Resources

- [Anthropic TypeScript SDK Documentation](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Model Context Protocol](https://docs.claude.com/fr/docs/claude-code/mcp)
- [Custom Tools Guide](https://docs.claude.com/en/api/agent-sdk/custom-tools)
- [Pix GitHub Repository](https://github.com/1024pix/pix)

## License

[Choose appropriate license - consider AGPL-3.0 like Pix or MIT for broader usage]

## Support

For questions or issues:
- Check the documentation in `/docs`
- Review existing MCP server implementations
- Consult the Anthropic SDK documentation
- Reach out to the Pix development team
