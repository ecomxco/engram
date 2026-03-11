import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectProject } from '../../src/core/project.js';
import {
  checkpoint,
  generateHandoff,
  getStatus,
  logDecision,
  logExchange,
  readState,
  reconcile,
  search,
} from '../../src/core/operations.js';
import { writeState } from '../../src/core/writers/state.js';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

function createTempProject(): string {
  const dir = join(tmpdir(), `engram-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  cpSync(FIXTURES, dir, { recursive: true });
  return dir;
}

describe('operations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempProject();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('detectProject finds a valid project', () => {
    const project = detectProject(tempDir);
    expect(project).not.toBeNull();
    expect(project!.root).toBe(tempDir);
  });

  it('detectProject returns null for empty dir', () => {
    const emptyDir = join(tmpdir(), `engram-empty-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    const project = detectProject(emptyDir);
    expect(project).toBeNull();
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('getStatus returns a multi-line summary', () => {
    const project = detectProject(tempDir)!;
    const status = getStatus(project);

    expect(status).toContain('Session 10');
    expect(status).toContain('Turn 47');
    expect(status.split('\n').length).toBeGreaterThanOrEqual(4);
  });

  it('logExchange appends to log and increments turn', () => {
    const project = detectProject(tempDir)!;
    const stateBefore = readState(project);
    const turnBefore = stateBefore.frontmatter.current_turn;

    const result = logExchange(project, {
      prompt: 'Test prompt',
      response: 'Test response',
      agent: 'TestAgent',
      confidence: 0.85,
    });

    expect(result.turn).toBe(turnBefore + 1);

    // Verify log was appended
    const logContent = readFileSync(project.files.log, 'utf-8');
    expect(logContent).toContain('Test prompt');
    expect(logContent).toContain('Test response');
    expect(logContent).toContain('TestAgent');

    // Verify state was updated
    const stateAfter = readState(project);
    expect(stateAfter.frontmatter.current_turn).toBe(turnBefore + 1);
  });

  it('logExchange triggers sync when threshold reached', () => {
    const project = detectProject(tempDir)!;

    // Set threshold close
    const state = readState(project);
    state.frontmatter.last_sync_turn = state.frontmatter.current_turn - 4;

    // Write modified state back
    writeFileSync(project.files.state, writeState(state));

    const result = logExchange(project, {
      prompt: 'Trigger sync',
      response: 'OK',
      agent: 'TestAgent',
    });

    expect(result.syncTriggered).toBe(true);
  });

  it('checkpoint updates state and summary', () => {
    const project = detectProject(tempDir)!;
    const msg = checkpoint(project);

    expect(msg).toContain('Checkpoint complete');
    expect(msg).toContain('turn 47');

    // Verify sync tracking updated
    const state = readState(project);
    expect(state.frontmatter.last_sync_turn).toBe(state.frontmatter.current_turn);
  });

  it('logDecision adds a new decision', () => {
    const project = detectProject(tempDir)!;

    const decision = logDecision(project, {
      title: 'Test Decision',
      decision: 'Use approach A',
      alternativesConsidered: 'Approach B, Approach C',
      rationale: 'Approach A is simpler',
      context: 'Testing decision logging',
      tags: ['test'],
    });

    expect(decision.number).toBe(10);
    expect(decision.title).toBe('Test Decision');

    // Verify it was written to file
    const content = readFileSync(project.files.decisions, 'utf-8');
    expect(content).toContain('Decision 10');
    expect(content).toContain('Test Decision');
    expect(content).toContain('Use approach A');
  });

  it('reconcile updates engram and state', () => {
    const project = detectProject(tempDir)!;
    const msg = reconcile(project);

    expect(msg).toContain('Reconciliation complete');
    expect(msg).toContain('sessions');
  });

  it('generateHandoff creates HANDOFF.md', () => {
    const project = detectProject(tempDir)!;
    const content = generateHandoff(project);

    expect(content).toContain('HANDOFF.md');
    expect(content).toContain('Current State');
    expect(existsSync(project.files.handoff)).toBe(true);
  });

  it('search finds results across files', () => {
    const project = detectProject(tempDir)!;

    const results = search(project, 'Recharts');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.source.includes('DECISIONS'))).toBe(true);
  });

  it('search with scope limits to specific file', () => {
    const project = detectProject(tempDir)!;

    const allResults = search(project, 'Supabase');
    const scopedResults = search(project, 'Supabase', 'decisions');

    expect(scopedResults.length).toBeLessThan(allResults.length);
    expect(scopedResults.every(r => r.source.includes('DECISIONS'))).toBe(true);
  });
});
