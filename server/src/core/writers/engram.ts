import type { EngramSummary } from '../types.js';

/**
 * Serialize an EngramSummary to ENGRAM.md markdown format.
 */
export function writeEngram(summary: EngramSummary): string {
  const lines: string[] = [];

  lines.push('# ENGRAM.md — Processed Summary');
  lines.push('');
  lines.push('## Purpose');
  lines.push('Actionable distillation of all brainstorming sessions. Updated at checkpoints and end-of-session. For the raw verbatim log, see ENGRAM-LOG.md.');
  lines.push('');
  if (summary.lastUpdated) lines.push(`**Last Updated:** ${summary.lastUpdated}`);
  lines.push(`**Sessions Processed:** ${summary.sessionsProcessed}`);
  if (summary.lastReconciled) lines.push(`**Last Reconciled Against Log:** ${summary.lastReconciled}`);
  lines.push('');
  lines.push('---');

  // Workstreams
  lines.push('');
  lines.push('## Workstreams');
  lines.push('');
  for (const ws of summary.workstreams) {
    lines.push(`- **${ws.name}** — ${ws.description}`);
  }
  lines.push('');
  lines.push('---');

  // Open Problems
  lines.push('');
  lines.push('## Open Problems — Prioritized');
  lines.push('');

  const problemsByPriority = new Map<string, string[]>();
  for (const p of summary.openProblems) {
    const existing = problemsByPriority.get(p.priority) ?? [];
    existing.push(p.description);
    problemsByPriority.set(p.priority, existing);
  }

  const priorityLabels: Record<string, string> = {
    'P0': 'blocking near-term work',
    'P1': 'blocking a workstream',
    'P2': 'important but not blocking',
  };

  for (const [priority, descriptions] of problemsByPriority) {
    const label = priorityLabels[priority] ?? priority;
    lines.push(`**${priority} (${label}):**`);
    for (const desc of descriptions) {
      lines.push(`- ${desc}`);
    }
    lines.push('');
  }
  lines.push('---');

  // Tasks
  lines.push('');
  lines.push('## Tasks / Next Steps');
  lines.push('');
  for (const group of summary.tasks) {
    lines.push(`**${group.group}:**`);
    for (const task of group.tasks) {
      const checkbox = task.done ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${task.description}`);
    }
    lines.push('');
  }
  lines.push('---');

  // Decisions Made
  lines.push('');
  lines.push('## Decisions Made');
  lines.push('');
  for (const ref of summary.decisionRefs) {
    lines.push(`- ${ref}`);
  }
  if (summary.decisionRefs.length > 0) {
    lines.push('');
    lines.push('See DECISIONS.md for full history with alternatives considered.');
  }
  lines.push('');
  lines.push('---');

  // Open Questions
  lines.push('');
  lines.push('## Open Questions');
  lines.push('');
  for (let i = 0; i < summary.openQuestions.length; i++) {
    lines.push(`${i + 1}. ${summary.openQuestions[i]}`);
  }

  return lines.join('\n') + '\n';
}
