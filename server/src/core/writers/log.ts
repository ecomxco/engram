import type { LogExchange } from '../types.js';

/**
 * Format a single YAML log entry for appending to ENGRAM-LOG.md.
 * Uses the autonomic-engram-logger YAML format.
 */
export function formatLogEntry(exchange: {
  timestamp: string;
  turn: number;
  agent: string;
  confidence: number;
  prompt: string;
  response: string;
  deliverables?: string[];
  gapsIdentified?: string[];
}): string {
  const lines: string[] = [];

  lines.push(`- timestamp: "${exchange.timestamp}"`);
  lines.push(`  turn: ${exchange.turn}`);
  lines.push(`  agent: "${exchange.agent}"`);
  lines.push(`  confidence: ${exchange.confidence}`);
  lines.push('  prompt: |');
  for (const line of exchange.prompt.split('\n')) {
    lines.push(`    ${line}`);
  }
  lines.push('  response: |');
  for (const line of exchange.response.split('\n')) {
    lines.push(`    ${line}`);
  }
  if (exchange.deliverables && exchange.deliverables.length > 0) {
    lines.push('  deliverables:');
    for (const d of exchange.deliverables) {
      lines.push(`    - "${d}"`);
    }
  }
  if (exchange.gapsIdentified && exchange.gapsIdentified.length > 0) {
    lines.push('  gaps_identified:');
    for (const g of exchange.gapsIdentified) {
      lines.push(`    - "${g}"`);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Format a new session header for ENGRAM-LOG.md.
 */
export function formatSessionHeader(sessionNumber: number, date: string, mode: string): string {
  return `\n---\n\n### Session ${sessionNumber} — ${date} — Mode: ${mode}\n\n`;
}

/**
 * Build ENGRAM-LOG.md preamble for a fresh log file.
 */
export function buildLogPreamble(): string {
  const lines = [
    '# ENGRAM-LOG.md — Verbatim Session Log',
    '',
    '## Purpose',
    'Append-only log of all brainstorming sessions. Each entry contains the exact prompt and exact response, timestamped and attributed. Nothing is edited, summarized, or compressed. This is the source of truth.',
    '',
    '## Log Rotation',
    'Rotate when this file exceeds ~50KB or 15 sessions, whichever comes first. Rename to ENGRAM-LOG-NNN.md and start fresh. The processed summary (ENGRAM.md) carries forward.',
    '',
    '---',
    '',
  ];
  return lines.join('\n');
}
