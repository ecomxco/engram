import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requireProject } from '../core/project.js';
import {
  readAgents,
  readDecisions,
  readEngram,
  readState,
} from '../core/operations.js';

function jsonContents(uri: string, data: unknown) {
  return {
    contents: [{
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    }],
  };
}

export function registerResources(server: McpServer): void {
  server.registerResource(
    'state',
    'engram://state',
    { description: 'Current project state (STATE.md) as JSON', mimeType: 'application/json' },
    async (uri) => {
      const project = requireProject();
      return jsonContents(uri.toString(), readState(project));
    },
  );

  server.registerResource(
    'summary',
    'engram://summary',
    { description: 'Processed summary (ENGRAM.md) as JSON', mimeType: 'application/json' },
    async (uri) => {
      const project = requireProject();
      return jsonContents(uri.toString(), readEngram(project));
    },
  );

  server.registerResource(
    'decisions',
    'engram://decisions',
    { description: 'Decision log (DECISIONS.md) as JSON', mimeType: 'application/json' },
    async (uri) => {
      const project = requireProject();
      return jsonContents(uri.toString(), readDecisions(project));
    },
  );

  server.registerResource(
    'agents',
    'engram://agents',
    { description: 'Agent configuration (AGENTS.md) as JSON', mimeType: 'application/json' },
    async (uri) => {
      const project = requireProject();
      return jsonContents(uri.toString(), readAgents(project));
    },
  );
}
