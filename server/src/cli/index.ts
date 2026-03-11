import { Command } from 'commander';
import { requireProject } from '../core/project.js';
import {
  checkpoint,
  generateHandoff,
  getStatus,
  readDecisions,
  reconcile,
  rotateLog,
  search,
} from '../core/operations.js';
import { initProject, listTemplates } from '../core/templates.js';
import { patchAntigravity, patchClaudeDesktop } from '../core/mcp-config.js';
import { startServer } from '../index.js';
import { error, heading, success, table, warn } from './output.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('engram')
    .description('Engram Protocol — AI memory infrastructure')
    .version('0.1.0');

  // ── serve ───────────────────────────────────────────────────────────
  program
    .command('serve')
    .description('Start the MCP server (stdio transport)')
    .action(async () => {
      await startServer();
    });

  // ── setup options (shared between init and setup) ──────────────────
  interface SetupOpts {
    template: string;
    name: string;
    author: string;
    dir?: string;
    claudeDesktop?: boolean;
    antigravity?: boolean;
    all?: boolean;
  }

  function addSetupOptions(cmd: Command): Command {
    return cmd
      .option('-t, --template <type>', 'Template type', 'default')
      .option('-n, --name <name>', 'Project name', 'My Project')
      .option('-a, --author <author>', 'Author name', 'Author')
      .option('-d, --dir <dir>', 'Target directory')
      .option('--claude-desktop', 'Also configure Claude Desktop app')
      .option('--antigravity', 'Also configure Antigravity IDE')
      .option('--all', 'Configure all supported AI clients');
  }

  // ── init (alias for setup) ─────────────────────────────────────────
  addSetupOptions(
    program
      .command('init')
      .description('Scaffold a new engram project (alias for setup)'),
  ).action(runSetup);

  // ── setup ─────────────────────────────────────────────────────────
  function runSetup(opts: SetupOpts) {
    try {
      const msg = initProject({
        template: opts.template,
        name: opts.name,
        author: opts.author,
        dir: opts.dir,
      });
      success(msg);

      const targetDir = opts.dir ?? process.cwd();
      const configureDesktop = opts.claudeDesktop || opts.all;
      const configureAntigravity = opts.antigravity || opts.all;

      if (configureDesktop) {
        const result = patchClaudeDesktop(targetDir);
        if (result.patched) {
          success(result.message);
        } else {
          warn(result.message);
        }
      }

      if (configureAntigravity) {
        const result = patchAntigravity(targetDir);
        if (result.patched) {
          success(result.message);
        } else {
          warn(result.message);
        }
      }

      console.log('');
      heading('Next Steps');
      console.log('Claude Code / Cursor — open this folder. Engram activates automatically via .mcp.json.');
      if (!configureDesktop) {
        console.log('Claude Desktop     — re-run with --claude-desktop or --all to configure.');
      }
      if (!configureAntigravity) {
        console.log('Antigravity        — re-run with --antigravity or --all to configure.');
      }
    } catch (err) {
      error((err as Error).message);
      const templates = listTemplates();
      if (templates.length > 0) {
        console.log(`Available templates: ${templates.join(', ')}`);
      }
      process.exit(1);
    }
  }

  addSetupOptions(
    program
      .command('setup')
      .description('Set up a new engram project (scaffold + configure MCP)'),
  ).action(runSetup);

  // ── status ──────────────────────────────────────────────────────────
  program
    .command('status')
    .description('Print a concise project status summary')
    .action(() => {
      try {
        const project = requireProject();
        heading('Engram Status');
        console.log(getStatus(project));
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  // ── checkpoint ──────────────────────────────────────────────────────
  program
    .command('checkpoint')
    .description('Full sync: log, summary, state, and index')
    .action(() => {
      try {
        const project = requireProject();
        const msg = checkpoint(project);
        success(msg);
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  // ── search ──────────────────────────────────────────────────────────
  program
    .command('search <query>')
    .description('Search across engram files')
    .option('-s, --scope <scope>', 'Limit scope: index, decisions, engram, log')
    .action((query, opts) => {
      try {
        const project = requireProject();
        const results = search(project, query, opts.scope);
        if (results.length === 0) {
          console.log('No results found.');
          return;
        }
        heading(`Search: "${query}" — ${results.length} result(s)`);
        for (const r of results) {
          console.log(`[${r.source}] ${r.content}`);
        }
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  // ── decisions ───────────────────────────────────────────────────────
  program
    .command('decisions')
    .description('List decisions')
    .option('-f, --filter <keyword>', 'Filter by tag or keyword')
    .option('-l, --limit <n>', 'Max number to show', parseInt)
    .action((opts) => {
      try {
        const project = requireProject();
        let decisions = readDecisions(project).decisions;
        if (opts.filter) {
          const f = opts.filter.toLowerCase();
          decisions = decisions.filter(d =>
            d.tags.some(t => t.toLowerCase().includes(f)) ||
            d.title.toLowerCase().includes(f),
          );
        }
        if (opts.limit) {
          decisions = decisions.slice(-opts.limit);
        }
        if (decisions.length === 0) {
          console.log('No decisions found.');
          return;
        }
        heading(`Decisions (${decisions.length})`);
        table(
          ['#', 'Title', 'Date', 'Status'],
          decisions.map(d => [String(d.number), d.title, d.date, d.status]),
        );
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  // ── reconcile ───────────────────────────────────────────────────────
  program
    .command('reconcile')
    .description('Rebuild ENGRAM.md from the full log')
    .action(() => {
      try {
        const project = requireProject();
        const msg = reconcile(project);
        success(msg);
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  // ── handoff ─────────────────────────────────────────────────────────
  program
    .command('handoff')
    .description('Generate HANDOFF.md for fast session restart')
    .action(() => {
      try {
        const project = requireProject();
        const content = generateHandoff(project);
        success(`HANDOFF.md generated (${content.split('\n').length} lines).`);
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  // ── rotate ──────────────────────────────────────────────────────────
  program
    .command('rotate')
    .description('Archive and rotate the log')
    .option('--force', 'Force rotation regardless of size')
    .action((opts) => {
      try {
        const project = requireProject();
        const msg = rotateLog(project, opts.force);
        success(msg);
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });

  return program;
}
