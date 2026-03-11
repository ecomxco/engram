import type { Decision, DecisionsFile } from '../types.js';

/**
 * Format a single decision entry for appending to DECISIONS.md.
 */
export function formatDecisionEntry(decision: Decision): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`## Decision ${decision.number} — ${decision.title}`);
  lines.push('');
  lines.push(`**Date:** ${decision.date}`);
  lines.push(`**Session:** ${decision.session}`);
  if (decision.tags.length > 0) {
    lines.push(`**Tags:** ${decision.tags.join(', ')}`);
  }
  lines.push(`**Context:** ${decision.context}`);
  lines.push(`**Decision:** ${decision.decision}`);
  lines.push(`**Alternatives Considered:** ${decision.alternativesConsidered}`);
  lines.push(`**Rationale:** ${decision.rationale}`);
  lines.push(`**Status:** ${decision.status}`);
  if (decision.revisit) {
    lines.push(`**Revisit:** ${decision.revisit}`);
  }
  lines.push('');
  lines.push('---');

  return lines.join('\n') + '\n';
}

/**
 * Serialize a full DecisionsFile to DECISIONS.md markdown format.
 */
export function writeDecisions(file: DecisionsFile): string {
  const lines: string[] = [];

  lines.push('# DECISIONS.md — Decision Log');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Track every significant decision with rationale, alternatives considered, and timestamp. Prevents re-litigating settled questions across sessions and devices.');
  lines.push('');
  if (file.lastUpdated) lines.push(`**Last Updated:** ${file.lastUpdated}`);
  lines.push('');
  lines.push('---');

  for (const decision of file.decisions) {
    lines.push(formatDecisionEntry(decision));
  }

  if (file.pendingDecisions.length > 0) {
    lines.push('');
    lines.push('## Pending Decisions');
    lines.push('');
    for (const pending of file.pendingDecisions) {
      lines.push(`- ${pending}`);
    }
  }

  return lines.join('\n') + '\n';
}
