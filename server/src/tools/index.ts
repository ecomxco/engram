import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { requireProject } from '../core/project.js';
import {
  checkpoint,
  generateHandoff,
  getStatus,
  logDecision,
  logExchange,
  readDecisions,
  readState,
  reconcile,
  rotateLog,
  search,
} from '../core/operations.js';
import type { EngramProject } from '../core/types.js';
import { initProject } from '../core/templates.js';

interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function text(msg: string): ToolResult {
  return { content: [{ type: 'text', text: msg }] };
}

function json(data: unknown): ToolResult {
  return text(JSON.stringify(data, null, 2));
}

function withProject(fn: (project: EngramProject) => ToolResult): ToolResult {
  try {
    const project = requireProject();
    return fn(project);
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
  }
}

export function registerTools(server: McpServer): void {
  // ── engram_status ─────────────────────────────────────────────────────
  server.registerTool(
    'engram_status',
    { description: 'Get a concise 4-8 line summary of the current project state.' },
    async () => withProject((project) => text(getStatus(project))),
  );

  // ── engram_read_state ─────────────────────────────────────────────────
  server.registerTool(
    'engram_read_state',
    { description: 'Parse STATE.md and ENGRAM.md into structured JSON for programmatic access.' },
    async () => withProject((project) => {
      const state = readState(project);
      return json(state);
    }),
  );

  // ── engram_log_exchange ───────────────────────────────────────────────
  server.registerTool(
    'engram_log_exchange',
    {
      description: 'Log a prompt/response exchange to ENGRAM-LOG.md. Increments the turn counter and auto-syncs when threshold is reached.',
      inputSchema: {
        prompt: z.string().describe('The user prompt'),
        response: z.string().describe('The agent response'),
        agent: z.string().describe('Agent/model name (e.g. "Claude (Anthropic)")'),
        mode: z.string().optional().describe('Session mode: brainstorm, implementation, review, admin'),
        confidence: z.number().optional().describe('Confidence score 0-1'),
        deliverables: z.array(z.string()).optional().describe('Files or artifacts produced'),
        gaps: z.array(z.string()).optional().describe('Identified gaps or missing pieces'),
      },
    },
    async (args) => withProject((project) => {
      const result = logExchange(project, {
        prompt: args.prompt,
        response: args.response,
        agent: args.agent,
        mode: args.mode,
        confidence: args.confidence,
        deliverables: args.deliverables,
        gapsIdentified: args.gaps,
      });
      return text(`Logged turn ${result.turn}.${result.syncTriggered ? ' Auto-sync triggered.' : ''}`);
    }),
  );

  // ── engram_checkpoint ─────────────────────────────────────────────────
  server.registerTool(
    'engram_checkpoint',
    { description: 'Full sync: update log, summary, state, and index. Resets sync counter.' },
    async () => withProject((project) => text(checkpoint(project))),
  );

  // ── engram_search ─────────────────────────────────────────────────────
  server.registerTool(
    'engram_search',
    {
      description: 'Search across engram files (index, decisions, summary, log) for matching content.',
      inputSchema: {
        query: z.string().describe('Search term'),
        scope: z.string().optional().describe('Limit to: index, decisions, engram, log'),
      },
    },
    async (args) => withProject((project) => {
      const results = search(project, args.query, args.scope);
      if (results.length === 0) return text('No results found.');
      return json(results);
    }),
  );

  // ── engram_log_decision ───────────────────────────────────────────────
  server.registerTool(
    'engram_log_decision',
    {
      description: 'Record a significant decision with rationale, alternatives, and context to DECISIONS.md.',
      inputSchema: {
        title: z.string().describe('Decision title'),
        decision: z.string().describe('What was decided'),
        alternatives: z.string().describe('Alternatives considered'),
        rationale: z.string().describe('Why this option was chosen'),
        context: z.string().optional().describe('Additional context'),
        status: z.string().optional().describe('Status (default: "Decided")'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
      },
    },
    async (args) => withProject((project) => {
      const decision = logDecision(project, {
        title: args.title,
        decision: args.decision,
        alternativesConsidered: args.alternatives,
        rationale: args.rationale,
        context: args.context,
        status: args.status,
        tags: args.tags,
      });
      return text(`Decision ${decision.number} — ${decision.title} — logged.`);
    }),
  );

  // ── engram_get_decisions ──────────────────────────────────────────────
  server.registerTool(
    'engram_get_decisions',
    {
      description: 'Retrieve decisions as structured JSON. Optionally filter by tag or limit count.',
      inputSchema: {
        filter: z.string().optional().describe('Filter decisions by tag or keyword'),
        limit: z.number().optional().describe('Max number of decisions to return'),
      },
    },
    async (args) => withProject((project) => {
      let decisions = readDecisions(project).decisions;
      if (args.filter) {
        const f = args.filter.toLowerCase();
        decisions = decisions.filter(d =>
          d.tags.some(t => t.toLowerCase().includes(f)) ||
          d.title.toLowerCase().includes(f) ||
          d.decision.toLowerCase().includes(f),
        );
      }
      if (args.limit) {
        decisions = decisions.slice(-args.limit);
      }
      return json(decisions);
    }),
  );

  // ── engram_reconcile ──────────────────────────────────────────────────
  server.registerTool(
    'engram_reconcile',
    { description: 'Full rebuild of ENGRAM.md from the log. Resets sync tracking.' },
    async () => withProject((project) => text(reconcile(project))),
  );

  // ── engram_handoff ────────────────────────────────────────────────────
  server.registerTool(
    'engram_handoff',
    { description: 'Generate HANDOFF.md — an 80-line max dense resume for fast session restart.' },
    async () => withProject((project) => {
      const content = generateHandoff(project);
      return text(`HANDOFF.md generated (${content.split('\n').length} lines).`);
    }),
  );

  // ── engram_rotate_log ─────────────────────────────────────────────────
  server.registerTool(
    'engram_rotate_log',
    {
      description: 'Archive the current log and start fresh. Reconciles first. Auto-triggers at size/session thresholds unless force=true.',
      inputSchema: {
        force: z.boolean().optional().describe('Force rotation regardless of size'),
      },
    },
    async (args) => withProject((project) => text(rotateLog(project, args.force))),
  );

  // ── engram_init ───────────────────────────────────────────────────────
  server.registerTool(
    'engram_init',
    {
      description: 'Scaffold a new engram project from a template.',
      inputSchema: {
        template: z.string().optional().describe('Template: default, research, software, writing, startup'),
        name: z.string().optional().describe('Project name'),
        author: z.string().optional().describe('Author name'),
        dir: z.string().optional().describe('Target directory (default: cwd)'),
      },
    },
    async (args) => {
      try {
        const result = initProject({
          template: args.template ?? 'default',
          name: args.name ?? 'My Project',
          author: args.author ?? 'Author',
          dir: args.dir,
        });
        return text(result);
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${(err as Error).message}` }], isError: true };
      }
    },
  );
}
