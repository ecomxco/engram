import type { DecisionsFile, EngramSummary, StateFile } from '../types.js';

/**
 * Generate HANDOFF.md — a dense resume doc for fast session restart.
 * Target: ~80 lines max.
 */
export function writeHandoff(state: StateFile, summary: EngramSummary, decisions: DecisionsFile): string {
  const lines: string[] = [];

  lines.push('# HANDOFF.md — Session Restart Resume');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Sessions Covered:** ${summary.sessionsProcessed}`);
  lines.push('');

  // Current state
  lines.push('## Current State');
  lines.push('');
  for (const session of state.whatJustHappened.slice(0, 2)) {
    lines.push(`- **Session ${session.session}** (${session.date}, ${session.mode}): ${session.items.slice(0, 2).join('; ')}`);
  }
  lines.push('');

  // Active threads
  lines.push('## Active Threads');
  lines.push('');
  for (const thread of state.activeThreads.slice(0, 6)) {
    lines.push(`- ${thread}`);
  }
  lines.push('');

  // Priorities
  lines.push('## Priorities');
  lines.push('');
  for (const p of state.currentPriorities.slice(0, 5)) {
    lines.push(`1. ${p}`);
  }
  lines.push('');

  // Blockers
  if (state.blockers.length > 0) {
    lines.push('## Blockers');
    lines.push('');
    for (const b of state.blockers.slice(0, 4)) {
      lines.push(`- ${b}`);
    }
    lines.push('');
  }

  // Key decisions (last 5)
  const recentDecisions = decisions.decisions.slice(-5);
  if (recentDecisions.length > 0) {
    lines.push('## Key Decisions (Recent)');
    lines.push('');
    for (const d of recentDecisions) {
      lines.push(`- **D${d.number}** (S${d.session}): ${d.title} — ${d.decision.slice(0, 100)}${d.decision.length > 100 ? '...' : ''}`);
    }
    lines.push('');
  }

  // Open questions
  if (summary.openQuestions.length > 0) {
    lines.push('## Open Questions');
    lines.push('');
    for (const q of summary.openQuestions.slice(0, 5)) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  // Pending tasks
  const allTasks = summary.tasks.flatMap(g => g.tasks.filter(t => !t.done).map(t => `[${g.group}] ${t.description}`));
  if (allTasks.length > 0) {
    lines.push('## Pending Tasks');
    lines.push('');
    for (const t of allTasks.slice(0, 10)) {
      lines.push(`- ${t}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*For full context, read STATE.md + ENGRAM.md. For specific decisions, see DECISIONS.md.*');

  return lines.join('\n') + '\n';
}
