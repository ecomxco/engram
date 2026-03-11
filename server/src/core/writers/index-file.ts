import type { IndexEntry, IndexFile } from '../types.js';

/**
 * Format a single index entry line.
 */
export function formatIndexEntry(entry: IndexEntry): string {
  const tag = `[${entry.tag}]:`.padEnd(22);
  return `${tag}${entry.timestamp} — Session ${entry.session}, turn ${entry.turn} — ${entry.description}`;
}

/**
 * Serialize a full IndexFile to ENGRAM-INDEX.md markdown format.
 */
export function writeIndex(file: IndexFile): string {
  const lines: string[] = [];

  lines.push('# ENGRAM-INDEX.md — Session Retrieval Index');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('A semantic tag map linking key topics to exact locations in ENGRAM-LOG.md. Enables targeted retrieval without loading the full log.');
  lines.push('');
  const meta: string[] = [];
  if (file.lastUpdated) meta.push(`**Last Updated:** ${file.lastUpdated}`);
  if (file.sessionsIndexed) meta.push(`**Sessions Indexed:** ${file.sessionsIndexed}`);
  if (meta.length > 0) lines.push(meta.join(' | '));
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Index');

  for (const category of file.categories) {
    lines.push('');
    lines.push(`### ${category.name}`);
    lines.push('');
    lines.push('```text');
    for (const entry of category.entries) {
      lines.push(formatIndexEntry(entry));
    }
    lines.push('```');
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Maintenance Notes');
  lines.push('');
  lines.push('- Add a new entry whenever a significant decision, design choice, or open problem is introduced');
  lines.push('- Use consistent tag names — reuse existing tags when topics recur');
  lines.push('- Keep entries to one line — the log has the full content; this is just the address');
  lines.push('- Updated at every checkpoint and reconcile cycle');

  return lines.join('\n') + '\n';
}
