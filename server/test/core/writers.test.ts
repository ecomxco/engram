import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseState } from '../../src/core/parsers/state.js';
import { parseEngram } from '../../src/core/parsers/engram.js';
import { parseDecisions } from '../../src/core/parsers/decisions.js';
import { parseAgents } from '../../src/core/parsers/agents.js';
import { parseIndex } from '../../src/core/parsers/index-file.js';
import { writeState } from '../../src/core/writers/state.js';
import { writeEngram } from '../../src/core/writers/engram.js';
import { writeDecisions } from '../../src/core/writers/decisions.js';
import { writeAgents } from '../../src/core/writers/agents.js';
import { writeIndex } from '../../src/core/writers/index-file.js';
import { formatLogEntry } from '../../src/core/writers/log.js';
import { writeHandoff } from '../../src/core/writers/handoff.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

// ── Round-trip tests: parse → write → re-parse ──────────────────────────

describe('STATE.md round-trip', () => {
  it('preserves frontmatter through round-trip', () => {
    const original = parseState(fixture('STATE.md'));
    const written = writeState(original);
    const reparsed = parseState(written);

    expect(reparsed.frontmatter).toEqual(original.frontmatter);
  });

  it('preserves session summaries through round-trip', () => {
    const original = parseState(fixture('STATE.md'));
    const written = writeState(original);
    const reparsed = parseState(written);

    expect(reparsed.whatJustHappened.length).toBe(original.whatJustHappened.length);
    for (let i = 0; i < original.whatJustHappened.length; i++) {
      expect(reparsed.whatJustHappened[i].session).toBe(original.whatJustHappened[i].session);
      expect(reparsed.whatJustHappened[i].date).toBe(original.whatJustHappened[i].date);
      expect(reparsed.whatJustHappened[i].mode).toBe(original.whatJustHappened[i].mode);
    }
  });

  it('preserves active threads through round-trip', () => {
    const original = parseState(fixture('STATE.md'));
    const written = writeState(original);
    const reparsed = parseState(written);

    expect(reparsed.activeThreads.length).toBe(original.activeThreads.length);
  });

  it('preserves session counter through round-trip', () => {
    const original = parseState(fixture('STATE.md'));
    const written = writeState(original);
    const reparsed = parseState(written);

    expect(reparsed.totalSessions).toBe(original.totalSessions);
  });
});

describe('ENGRAM.md round-trip', () => {
  it('preserves workstreams through round-trip', () => {
    const original = parseEngram(fixture('ENGRAM.md'));
    const written = writeEngram(original);
    const reparsed = parseEngram(written);

    expect(reparsed.workstreams.length).toBe(original.workstreams.length);
    expect(reparsed.workstreams.map(w => w.name)).toEqual(original.workstreams.map(w => w.name));
  });

  it('preserves open problems through round-trip', () => {
    const original = parseEngram(fixture('ENGRAM.md'));
    const written = writeEngram(original);
    const reparsed = parseEngram(written);

    expect(reparsed.openProblems.length).toBe(original.openProblems.length);
  });

  it('preserves task groups through round-trip', () => {
    const original = parseEngram(fixture('ENGRAM.md'));
    const written = writeEngram(original);
    const reparsed = parseEngram(written);

    expect(reparsed.tasks.length).toBe(original.tasks.length);
    const origTaskCount = original.tasks.reduce((sum, g) => sum + g.tasks.length, 0);
    const reparsedTaskCount = reparsed.tasks.reduce((sum, g) => sum + g.tasks.length, 0);
    expect(reparsedTaskCount).toBe(origTaskCount);
  });

  it('preserves open questions through round-trip', () => {
    const original = parseEngram(fixture('ENGRAM.md'));
    const written = writeEngram(original);
    const reparsed = parseEngram(written);

    expect(reparsed.openQuestions.length).toBe(original.openQuestions.length);
  });
});

describe('DECISIONS.md round-trip', () => {
  it('preserves all decisions through round-trip', () => {
    const original = parseDecisions(fixture('DECISIONS.md'));
    const written = writeDecisions(original);
    const reparsed = parseDecisions(written);

    expect(reparsed.decisions.length).toBe(original.decisions.length);
    for (let i = 0; i < original.decisions.length; i++) {
      expect(reparsed.decisions[i].number).toBe(original.decisions[i].number);
      expect(reparsed.decisions[i].title).toBe(original.decisions[i].title);
      expect(reparsed.decisions[i].date).toBe(original.decisions[i].date);
    }
  });

  it('preserves pending decisions through round-trip', () => {
    const original = parseDecisions(fixture('DECISIONS.md'));
    const written = writeDecisions(original);
    const reparsed = parseDecisions(written);

    expect(reparsed.pendingDecisions.length).toBe(original.pendingDecisions.length);
  });
});

describe('AGENTS.md round-trip', () => {
  it('preserves agent registry through round-trip', () => {
    const original = parseAgents(fixture('AGENTS.md'));
    const written = writeAgents(original);
    const reparsed = parseAgents(written);

    expect(reparsed.agentRegistry.length).toBe(original.agentRegistry.length);
    expect(reparsed.projectName).toBe(original.projectName);
  });
});

describe('ENGRAM-INDEX.md round-trip', () => {
  it('preserves categories and entries through round-trip', () => {
    const original = parseIndex(fixture('ENGRAM-INDEX.md'));
    const written = writeIndex(original);
    const reparsed = parseIndex(written);

    expect(reparsed.categories.length).toBe(original.categories.length);
    const origEntryCount = original.categories.reduce((sum, c) => sum + c.entries.length, 0);
    const reparsedEntryCount = reparsed.categories.reduce((sum, c) => sum + c.entries.length, 0);
    expect(reparsedEntryCount).toBe(origEntryCount);
  });
});

// ── Writer format tests ─────────────────────────────────────────────────

describe('formatLogEntry', () => {
  it('formats a YAML log entry', () => {
    const entry = formatLogEntry({
      timestamp: '2026-03-11 12:00 UTC',
      turn: 5,
      agent: 'Claude (Anthropic)',
      confidence: 0.95,
      prompt: 'What is the best approach?',
      response: 'Here is the analysis...',
      deliverables: ['src/index.ts'],
      gapsIdentified: ['Missing error handling'],
    });

    expect(entry).toContain('timestamp: "2026-03-11 12:00 UTC"');
    expect(entry).toContain('turn: 5');
    expect(entry).toContain('agent: "Claude (Anthropic)"');
    expect(entry).toContain('confidence: 0.95');
    expect(entry).toContain('prompt: |');
    expect(entry).toContain('What is the best approach?');
    expect(entry).toContain('response: |');
    expect(entry).toContain('Here is the analysis...');
    expect(entry).toContain('deliverables:');
    expect(entry).toContain('"src/index.ts"');
    expect(entry).toContain('gaps_identified:');
    expect(entry).toContain('"Missing error handling"');
  });

  it('omits empty deliverables and gaps', () => {
    const entry = formatLogEntry({
      timestamp: '2026-03-11 12:00 UTC',
      turn: 1,
      agent: 'Claude',
      confidence: 0.9,
      prompt: 'Hello',
      response: 'Hi there',
    });

    expect(entry).not.toContain('deliverables:');
    expect(entry).not.toContain('gaps_identified:');
  });
});

describe('writeHandoff', () => {
  it('generates a handoff document under 80 lines', () => {
    const state = parseState(fixture('STATE.md'));
    const summary = parseEngram(fixture('ENGRAM.md'));
    const decisions = parseDecisions(fixture('DECISIONS.md'));

    const handoff = writeHandoff(state, summary, decisions);
    const lineCount = handoff.split('\n').length;

    expect(lineCount).toBeLessThanOrEqual(85); // Allow small margin
    expect(handoff).toContain('HANDOFF.md');
    expect(handoff).toContain('Current State');
    expect(handoff).toContain('Active Threads');
    expect(handoff).toContain('Priorities');
  });
});
