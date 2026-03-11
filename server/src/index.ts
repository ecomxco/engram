import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'engram-protocol',
    version: '0.1.0',
  });

  registerTools(server);
  registerResources(server);

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't interfere with stdio JSON-RPC
  console.error('engram-protocol MCP server started on stdio');
}
