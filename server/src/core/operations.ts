import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  AgentsFile, Decision, DecisionsFile, EngramProject, EngramSummary,
  IndexEntry, IndexFile, LogFile, StateFile,
} from './types.js';
import { parseState } from './parsers/state.js';
import { parseLog } from './parsers/log.js';
import { parseEngram } from './parsers/engram.js';
import { parseDecisions } from './parsers/decisions.js';
import { parseAgents } from './parsers/agents.js';
import { parseIndex } from './parsers/index-file.js';
import { writeState } from './writers/state.js';
import { buildLogPreamble, formatLogEntry, formatSessionHeader } from './writers/log.js';
import { writeEngram } from './writers/engram.js';
import { formatDecisionEntry } from './writers/decisions.js';
import { formatIndexEntry, writeIndex } from './writers/index-file.js';
import { writeHandoff } from './writers/handoff.js';
import { acquireLock, releaseLock } from './lock.js';

// ── File I/O helpers ─────────────────────────────────────────────────────

function readFile(path: string): string {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf-8');
}

function atomicWrite(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = join(tmpdir(), `engram-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, path);
}

function timestamp(): string {
  const d = new Date();
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z/, ' UTC');
}

function dateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Read Operations ──────────────────────────────────────────────────────

export function readState(project: EngramProject): StateFile {
  return parseState(readFile(project.files.state));
}

export function readLog(project: EngramProject): LogFile {
  return parseLog(readFile(project.files.log));
}

export function readEngram(project: EngramProject): EngramSummary {
  return parseEngram(readFile(project.files.engram));
}

export function readDecisions(project: EngramProject): DecisionsFile {
  return parseDecisions(readFile(project.files.decisions));
}

export function readAgents(project: EngramProject): AgentsFile {
  return parseAgents(readFile(project.files.agents));
}

export function readIndex(project: EngramProject): IndexFile {
  return parseIndex(readFile(project.files.index));
}

// ── Status ───────────────────────────────────────────────────────────────

export function getStatus(project: EngramProject): string {
  const state = readState(project);
  const lines: string[] = [];

  lines.push(`Session ${state.totalSessions} | Turn ${state.frontmatter.current_turn} | Threshold ${state.frontmatter.sync_threshold}`);
  const syncDelta = state.frontmatter.current_turn - state.frontmatter.last_sync_turn;
  lines.push(`Sync: ${syncDelta} turns since last sync${syncDelta >= state.frontmatter.sync_threshold ? ' (DUE)' : ''}`);

  if (state.whatJustHappened.length > 0) {
    const latest = state.whatJustHappened[0];
    lines.push(`Last: Session ${latest.session} (${latest.date}, ${latest.mode})`);
  }

  if (state.currentPriorities.length > 0) {
    lines.push(`Top priority: ${state.currentPriorities[0]}`);
  }

  if (state.blockers.length > 0) {
    lines.push(`Blockers: ${state.blockers.length}`);
  }

  if (state.nextReconciliation) {
    lines.push(`Next reconciliation: ${state.nextReconciliation}`);
  }

  return lines.join('\n');
}

// ── Log Exchange ─────────────────────────────────────────────────────────

export interface LogExchangeInput {
  prompt: string;
  response: string;
  agent: string;
  mode?: string;
  confidence?: number;
  deliverables?: string[];
  gapsIdentified?: string[];
}

export function logExchange(project: EngramProject, input: LogExchangeInput): { turn: number; syncTriggered: boolean } {
  if (!acquireLock(project.root)) {
    throw new Error('Cannot acquire lock — another process is writing to this project.');
  }

  try {
    const state = readState(project);
    const newTurn = state.frontmatter.current_turn + 1;

    // Append to log
    const entry = formatLogEntry({
      timestamp: timestamp(),
      turn: newTurn,
      agent: input.agent,
      confidence: input.confidence ?? 0.9,
      prompt: input.prompt,
      response: input.response,
      deliverables: input.deliverables,
      gapsIdentified: input.gapsIdentified,
    });

    const logContent = readFile(project.files.log);
    atomicWrite(project.files.log, logContent + '\n' + entry);

    // Update turn in state
    state.frontmatter.current_turn = newTurn;

    // Check if sync is due
    const syncDelta = newTurn - state.frontmatter.last_sync_turn;
    const syncTriggered = syncDelta >= state.frontmatter.sync_threshold;

    if (syncTriggered) {
      state.frontmatter.last_sync_turn = newTurn;
    }

    state.lastUpdated = timestamp();
    atomicWrite(project.files.state, writeState(state));

    return { turn: newTurn, syncTriggered };
  } finally {
    releaseLock(project.root);
  }
}

// ── Checkpoint ───────────────────────────────────────────────────────────

export function checkpoint(project: EngramProject): string {
  if (!acquireLock(project.root)) {
    throw new Error('Cannot acquire lock — another process is writing to this project.');
  }

  try {
    const state = readState(project);
    const summary = readEngram(project);
    const ts = timestamp();

    // Update sync tracking
    state.frontmatter.last_sync_turn = state.frontmatter.current_turn;
    state.lastUpdated = ts;

    // Write updated state
    atomicWrite(project.files.state, writeState(state));

    // Update summary timestamp
    summary.lastUpdated = ts;
    atomicWrite(project.files.engram, writeEngram(summary));

    return `Checkpoint complete at turn ${state.frontmatter.current_turn}. State and summary updated.`;
  } finally {
    releaseLock(project.root);
  }
}

// ── Log Decision ─────────────────────────────────────────────────────────

export interface LogDecisionInput {
  title: string;
  decision: string;
  alternativesConsidered: string;
  rationale: string;
  context?: string;
  status?: string;
  tags?: string[];
}

export function logDecision(project: EngramProject, input: LogDecisionInput): Decision {
  if (!acquireLock(project.root)) {
    throw new Error('Cannot acquire lock — another process is writing to this project.');
  }

  try {
    const decisions = readDecisions(project);
    const state = readState(project);
    const nextNum = decisions.decisions.length > 0
      ? Math.max(...decisions.decisions.map(d => d.number)) + 1
      : 1;

    const newDecision: Decision = {
      number: nextNum,
      title: input.title,
      date: dateStr(),
      session: state.totalSessions,
      tags: input.tags ?? [],
      context: input.context ?? '',
      decision: input.decision,
      alternativesConsidered: input.alternativesConsidered,
      rationale: input.rationale,
      status: input.status ?? 'Decided',
    };

    // Append to file
    const existing = readFile(project.files.decisions);
    const pendingIdx = existing.indexOf('## Pending Decisions');
    if (pendingIdx >= 0) {
      // Insert before pending decisions section
      const before = existing.slice(0, pendingIdx);
      const after = existing.slice(pendingIdx);
      atomicWrite(project.files.decisions, before + formatDecisionEntry(newDecision) + '\n' + after);
    } else {
      atomicWrite(project.files.decisions, existing + formatDecisionEntry(newDecision));
    }

    return newDecision;
  } finally {
    releaseLock(project.root);
  }
}

// ── Reconcile ────────────────────────────────────────────────────────────

export function reconcile(project: EngramProject): string {
  if (!acquireLock(project.root)) {
    throw new Error('Cannot acquire lock — another process is writing to this project.');
  }

  try {
    const log = readLog(project);
    const summary = readEngram(project);
    const ts = timestamp();

    // Update metadata
    summary.lastUpdated = ts;
    summary.sessionsProcessed = log.sessions.length;
    summary.lastReconciled = `Session ${log.sessions.length} (full rebuild)`;

    atomicWrite(project.files.engram, writeEngram(summary));

    // Update state
    const state = readState(project);
    state.frontmatter.last_sync_turn = state.frontmatter.current_turn;
    state.lastUpdated = ts;
    atomicWrite(project.files.state, writeState(state));

    return `Reconciliation complete. ENGRAM.md rebuilt from ${log.sessions.length} sessions.`;
  } finally {
    releaseLock(project.root);
  }
}

// ── Handoff ──────────────────────────────────────────────────────────────

export function generateHandoff(project: EngramProject): string {
  const state = readState(project);
  const summary = readEngram(project);
  const decisions = readDecisions(project);
  const content = writeHandoff(state, summary, decisions);

  atomicWrite(project.files.handoff, content);
  return content;
}

// ── Rotate Log ───────────────────────────────────────────────────────────

export function rotateLog(project: EngramProject, force = false): string {
  const logPath = project.files.log;
  if (!existsSync(logPath)) {
    return 'No log file to rotate.';
  }

  const stats = statSync(logPath);
  const sizeKB = stats.size / 1024;
  const log = readLog(project);
  const sessionCount = log.sessions.length;

  if (!force && sizeKB < 50 && sessionCount < 15) {
    return `Log rotation not needed yet (${sizeKB.toFixed(1)}KB, ${sessionCount} sessions). Use force=true to override.`;
  }

  if (!acquireLock(project.root)) {
    throw new Error('Cannot acquire lock — another process is writing to this project.');
  }

  try {
    // Reconcile first
    reconcile(project);

    // Archive the log
    const archiveNum = findNextArchiveNum(project.root);
    const archiveName = `ENGRAM-LOG-${String(archiveNum).padStart(3, '0')}.md`;
    const archivePath = join(project.root, archiveName);
    renameSync(logPath, archivePath);

    // Start fresh log
    atomicWrite(logPath, buildLogPreamble());

    // Reset turn counter
    const state = readState(project);
    state.frontmatter.current_turn = 0;
    state.frontmatter.last_sync_turn = 0;
    state.lastUpdated = timestamp();
    atomicWrite(project.files.state, writeState(state));

    return `Log rotated to ${archiveName} (${sizeKB.toFixed(1)}KB, ${sessionCount} sessions). Fresh log started.`;
  } finally {
    releaseLock(project.root);
  }
}

function findNextArchiveNum(root: string): number {
  let num = 1;
  while (existsSync(join(root, `ENGRAM-LOG-${String(num).padStart(3, '0')}.md`))) {
    num++;
  }
  return num;
}

// ── Search ───────────────────────────────────────────────────────────────

export interface SearchResult {
  source: string;
  content: string;
  context: string;
}

export function search(project: EngramProject, query: string, scope?: string): SearchResult[] {
  const results: SearchResult[] = [];
  const q = query.toLowerCase();

  const searchIn = (content: string, source: string) => {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        const contextStart = Math.max(0, i - 1);
        const contextEnd = Math.min(lines.length, i + 2);
        results.push({
          source,
          content: lines[i].trim(),
          context: lines.slice(contextStart, contextEnd).join('\n').trim(),
        });
      }
    }
  };

  const files = [
    { key: 'index', path: project.files.index, label: 'ENGRAM-INDEX.md' },
    { key: 'decisions', path: project.files.decisions, label: 'DECISIONS.md' },
    { key: 'engram', path: project.files.engram, label: 'ENGRAM.md' },
    { key: 'log', path: project.files.log, label: 'ENGRAM-LOG.md' },
  ];

  for (const file of files) {
    if (scope && file.key !== scope) continue;
    if (existsSync(file.path)) {
      searchIn(readFile(file.path), file.label);
    }
  }

  return results;
}
