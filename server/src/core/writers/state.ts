import type { StateFile } from '../types.js';

/**
 * Serialize a StateFile back to STATE.md markdown format.
 */
export function writeState(state: StateFile): string {
  const lines: string[] = [];

  // YAML frontmatter
  lines.push('---');
  lines.push(`current_turn: ${state.frontmatter.current_turn}`);
  lines.push(`last_sync_turn: ${state.frontmatter.last_sync_turn}`);
  lines.push(`sync_threshold: ${state.frontmatter.sync_threshold}`);
  lines.push('---');
  lines.push('');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Read this file FIRST at the start of every new session. It contains the current active state — not history.');
  lines.push('');
  if (state.lastUpdated) lines.push(`**Last Updated:** ${state.lastUpdated}`);
  if (state.updatedBy) lines.push(`**Updated By:** ${state.updatedBy}`);
  lines.push('');
  lines.push('---');

  // What Just Happened
  lines.push('');
  lines.push('## What Just Happened (Last 1-2 Sessions Only)');
  lines.push('');
  for (const session of state.whatJustHappened) {
    lines.push(`**Session ${session.session} (${session.date}) — Mode: ${session.mode}**`);
    lines.push('');
    for (const item of session.items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }
  lines.push('---');

  // Active Threads
  lines.push('');
  lines.push('## Active Threads');
  lines.push('');
  for (let i = 0; i < state.activeThreads.length; i++) {
    lines.push(`${i + 1}. ${state.activeThreads[i]}`);
  }
  lines.push('');
  lines.push('---');

  // Current Priorities
  lines.push('');
  lines.push('## Current Priorities');
  lines.push('');
  for (let i = 0; i < state.currentPriorities.length; i++) {
    lines.push(`${i + 1}. ${state.currentPriorities[i]}`);
  }
  lines.push('');
  lines.push('---');

  // Blockers
  lines.push('');
  lines.push('## Blockers');
  lines.push('');
  for (const blocker of state.blockers) {
    lines.push(`- ${blocker}`);
  }
  lines.push('');
  lines.push('---');

  // Key Context
  lines.push('');
  lines.push('## Key Context for Any Agent');
  lines.push('');
  for (const ctx of state.keyContext) {
    lines.push(`- ${ctx}`);
  }
  lines.push('');
  lines.push('---');

  // Session Counter
  lines.push('');
  lines.push('## Session Counter');
  lines.push('');
  lines.push(`**Total sessions:** ${state.totalSessions}`);
  if (state.lastSession) lines.push(`**Last session:** ${state.lastSession}`);
  if (state.nextReconciliation) lines.push(`**Next reconciliation due:** ${state.nextReconciliation}`);

  return lines.join('\n') + '\n';
}
