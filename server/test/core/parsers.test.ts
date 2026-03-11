import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseState } from '../../src/core/parsers/state.js';
import { parseLog } from '../../src/core/parsers/log.js';
import { parseEngram } from '../../src/core/parsers/engram.js';
import { parseDecisions } from '../../src/core/parsers/decisions.js';
import { parseAgents } from '../../src/core/parsers/agents.js';
import { parseIndex } from '../../src/core/parsers/index-file.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

// ── STATE.md ──────────────────────────────────────────────────────────────

describe('parseState', () => {
  const state = parseState(fixture('STATE.md'));

  it('parses YAML frontmatter', () => {
    expect(state.frontmatter.current_turn).toBe(47);
    expect(state.frontmatter.last_sync_turn).toBe(47);
    expect(state.frontmatter.sync_threshold).toBe(5);
  });

  it('extracts metadata fields', () => {
    expect(state.lastUpdated).toBe('2026-02-12 19:45:00 UTC');
    expect(state.updatedBy).toContain('Claude');
  });

  it('parses session summaries', () => {
    expect(state.whatJustHappened.length).toBeGreaterThanOrEqual(2);
    const session10 = state.whatJustHappened.find(s => s.session === 10);
    expect(session10).toBeDefined();
    expect(session10!.date).toBe('2026-02-12');
    expect(session10!.mode).toBe('implementation');
    expect(session10!.items.length).toBeGreaterThan(0);
  });

  it('parses active threads', () => {
    expect(state.activeThreads.length).toBe(4);
    expect(state.activeThreads[0]).toContain('Dashboard UI');
  });

  it('parses current priorities', () => {
    expect(state.currentPriorities.length).toBe(3);
    expect(state.currentPriorities[0]).toContain('email notification CSS');
  });

  it('parses blockers', () => {
    expect(state.blockers.length).toBe(2);
    expect(state.blockers[0]).toContain('Twilio');
  });

  it('parses session counter', () => {
    expect(state.totalSessions).toBe(10);
    expect(state.lastSession).toContain('Session 10');
    expect(state.nextReconciliation).toContain('Session 15');
  });

  it('handles missing frontmatter gracefully', () => {
    const noFrontmatter = parseState('# Just a heading\n\nSome content.');
    expect(noFrontmatter.frontmatter.current_turn).toBe(0);
    expect(noFrontmatter.frontmatter.sync_threshold).toBe(5);
  });

  it('handles empty content gracefully', () => {
    const empty = parseState('');
    expect(empty.frontmatter.current_turn).toBe(0);
    expect(empty.whatJustHappened).toEqual([]);
    expect(empty.activeThreads).toEqual([]);
  });
});

// ── ENGRAM-LOG.md ────────────────────────────────────────────────────────

describe('parseLog', () => {
  const log = parseLog(fixture('ENGRAM-LOG.md'));

  it('parses all session headers', () => {
    expect(log.sessions.length).toBeGreaterThanOrEqual(5);
  });

  it('extracts session metadata', () => {
    const s1 = log.sessions.find(s => s.number === 1);
    expect(s1).toBeDefined();
    expect(s1!.date).toBe('2026-01-15');
    expect(s1!.mode).toBe('brainstorm');
  });

  it('parses markdown-format exchanges', () => {
    const s1 = log.sessions.find(s => s.number === 1);
    expect(s1!.exchanges.length).toBeGreaterThan(0);
    // First exchange should be Alex
    const firstExchange = s1!.exchanges[0];
    expect(firstExchange.speaker).toBe('Alex');
    expect(firstExchange.timestamp).toContain('UTC');
    expect(firstExchange.content).toContain('energy dashboard');
  });

  it('identifies both speakers', () => {
    const s1 = log.sessions.find(s => s.number === 1);
    const speakers = new Set(s1!.exchanges.map(e => e.speaker));
    expect(speakers.has('Alex')).toBe(true);
    expect([...speakers].some(s => s.includes('Claude'))).toBe(true);
  });

  it('handles admin sessions', () => {
    const s5 = log.sessions.find(s => s.number === 5);
    expect(s5).toBeDefined();
    expect(s5!.mode).toBe('admin');
  });

  it('handles combined modes', () => {
    const s9 = log.sessions.find(s => s.number === 9);
    expect(s9).toBeDefined();
    expect(s9!.mode).toContain('brainstorm');
  });

  it('handles empty content', () => {
    const empty = parseLog('');
    expect(empty.sessions).toEqual([]);
  });
});

// ── ENGRAM.md ────────────────────────────────────────────────────────────

describe('parseEngram', () => {
  const engram = parseEngram(fixture('ENGRAM.md'));

  it('extracts metadata', () => {
    expect(engram.lastUpdated).toBe('2026-02-12 19:45:00 UTC');
    expect(engram.sessionsProcessed).toBe(10);
    expect(engram.lastReconciled).toContain('Session 10');
  });

  it('parses workstreams', () => {
    expect(engram.workstreams.length).toBe(5);
    const dashboard = engram.workstreams.find(w => w.name === 'Dashboard UI');
    expect(dashboard).toBeDefined();
    expect(dashboard!.description).toContain('React');
  });

  it('parses open problems with priorities', () => {
    expect(engram.openProblems.length).toBeGreaterThan(0);
    const p0 = engram.openProblems.filter(p => p.priority === 'P0');
    expect(p0.length).toBeGreaterThan(0);
    expect(p0[0].description).toContain('Email');
  });

  it('parses task groups', () => {
    expect(engram.tasks.length).toBeGreaterThanOrEqual(3);
    const immediate = engram.tasks.find(g => g.group.includes('Immediate'));
    expect(immediate).toBeDefined();
    expect(immediate!.tasks.length).toBeGreaterThan(0);
    // All tasks in fixture are unchecked
    expect(immediate!.tasks.every(t => !t.done)).toBe(true);
  });

  it('parses decision references', () => {
    expect(engram.decisionRefs.length).toBeGreaterThan(0);
    expect(engram.decisionRefs.some(d => d.includes('Decision 8'))).toBe(true);
  });

  it('parses open questions', () => {
    expect(engram.openQuestions.length).toBe(4);
    expect(engram.openQuestions[0]).toContain('Twilio');
  });

  it('handles empty content', () => {
    const empty = parseEngram('');
    expect(empty.workstreams).toEqual([]);
    expect(empty.sessionsProcessed).toBe(0);
  });
});

// ── DECISIONS.md ─────────────────────────────────────────────────────────

describe('parseDecisions', () => {
  const decisions = parseDecisions(fixture('DECISIONS.md'));

  it('extracts last updated', () => {
    expect(decisions.lastUpdated).toBe('2026-02-12 19:45:00 UTC');
  });

  it('parses all 9 decisions', () => {
    expect(decisions.decisions.length).toBe(9);
  });

  it('extracts decision fields correctly', () => {
    const d2 = decisions.decisions.find(d => d.number === 2);
    expect(d2).toBeDefined();
    expect(d2!.title).toBe('Tech Stack');
    expect(d2!.date).toBe('2026-01-15');
    expect(d2!.session).toBe(1);
    expect(d2!.decision).toContain('React');
    expect(d2!.status).toContain('Implemented');
  });

  it('handles optional tags field', () => {
    const d1 = decisions.decisions.find(d => d.number === 1);
    expect(d1!.tags).toContain('infrastructure');
    expect(d1!.tags).toContain('tooling');

    // Decision 2 has no tags
    const d2 = decisions.decisions.find(d => d.number === 2);
    expect(d2!.tags).toEqual([]);
  });

  it('handles optional revisit field', () => {
    const d4 = decisions.decisions.find(d => d.number === 4);
    expect(d4!.revisit).toContain('Session 20');
  });

  it('parses pending decisions', () => {
    expect(decisions.pendingDecisions.length).toBe(2);
    expect(decisions.pendingDecisions[0]).toContain('Twilio SMS');
  });

  it('handles empty content', () => {
    const empty = parseDecisions('');
    expect(empty.decisions).toEqual([]);
    expect(empty.pendingDecisions).toEqual([]);
  });
});

// ── AGENTS.md ────────────────────────────────────────────────────────────

describe('parseAgents', () => {
  const agents = parseAgents(fixture('AGENTS.md'));

  it('extracts project name', () => {
    expect(agents.projectName).toBe('Smart Home Energy Dashboard');
  });

  it('extracts last updated', () => {
    expect(agents.lastUpdated).toBe('2026-02-12 19:45:00 UTC');
  });

  it('parses primary agent', () => {
    expect(agents.primaryAgent).not.toBeNull();
    expect(agents.primaryAgent!.name).toContain('Claude');
    expect(agents.primaryAgent!.role).toContain('analyst');
    expect(agents.primaryAgent!.constraints.length).toBeGreaterThan(0);
    expect(agents.primaryAgent!.capabilities.length).toBeGreaterThan(0);
  });

  it('parses agent registry table', () => {
    expect(agents.agentRegistry.length).toBe(2);
    const claude = agents.agentRegistry.find(a => a.agent.includes('Claude'));
    expect(claude).toBeDefined();
    expect(claude!.provider).toBe('Anthropic');
    expect(claude!.firstUsed).toBe('2026-01-15');
  });

  it('handles empty content', () => {
    const empty = parseAgents('');
    expect(empty.projectName).toBe('');
    expect(empty.primaryAgent).toBeNull();
    expect(empty.agentRegistry).toEqual([]);
  });
});

// ── ENGRAM-INDEX.md ──────────────────────────────────────────────────────

describe('parseIndex', () => {
  const index = parseIndex(fixture('ENGRAM-INDEX.md'));

  it('extracts metadata', () => {
    expect(index.lastUpdated).toBe('2026-02-12');
    expect(index.sessionsIndexed).toContain('1–10');
  });

  it('parses categories', () => {
    expect(index.categories.length).toBeGreaterThanOrEqual(4);
    const archCat = index.categories.find(c => c.name.includes('Architecture'));
    expect(archCat).toBeDefined();
  });

  it('parses index entries', () => {
    const archCat = index.categories.find(c => c.name.includes('Architecture'));
    expect(archCat!.entries.length).toBeGreaterThan(0);

    const techStack = archCat!.entries.find(e => e.tag === 'tech_stack');
    expect(techStack).toBeDefined();
    expect(techStack!.session).toBe(1);
    expect(techStack!.turn).toBe(2);
    expect(techStack!.description).toContain('React');
  });

  it('counts total entries across categories', () => {
    const total = index.categories.reduce((sum, cat) => sum + cat.entries.length, 0);
    expect(total).toBeGreaterThanOrEqual(15);
  });

  it('handles empty content', () => {
    const empty = parseIndex('');
    expect(empty.categories).toEqual([]);
  });
});
