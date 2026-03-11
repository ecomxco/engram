import type { Decision, DecisionsFile } from '../types.js';

/**
 * Parse DECISIONS.md into a structured DecisionsFile.
 * Lenient: malformed entries are skipped.
 */
export function parseDecisions(raw: string): DecisionsFile {
  const lastUpdated = extractField(raw, /\*\*Last Updated:\*\*\s*(.+)/);
  const decisions = parseDecisionEntries(raw);
  const pendingDecisions = parsePendingDecisions(raw);

  return { lastUpdated, decisions, pendingDecisions };
}

function extractField(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Parse individual decision entries.
 * Format:
 *   ## Decision N — Title
 *   **Date:** ...
 *   **Session:** ...
 *   **Tags:** ... (optional)
 *   **Context:** ...
 *   **Decision:** ...
 *   **Alternatives Considered:** ...
 *   **Rationale:** ...
 *   **Status:** ...
 *   **Revisit:** ... (optional)
 */
function parseDecisionEntries(content: string): Decision[] {
  const decisions: Decision[] = [];

  // Split by decision headers
  const headerPattern = /^##\s+Decision\s+(\d+)\s*—\s*(.+)$/gm;
  const headers: { number: number; title: string; startOfHeader: number; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = headerPattern.exec(content)) !== null) {
    headers.push({
      number: parseInt(match[1], 10),
      title: match[2].trim(),
      startOfHeader: match.index,
      index: match.index + match[0].length,
    });
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const end = i + 1 < headers.length ? headers[i + 1].startOfHeader : content.length;
    const block = content.slice(header.index, end);

    // Stop at "## Pending Decisions" section
    const pendingIdx = block.indexOf('## Pending');
    const decisionBlock = pendingIdx >= 0 ? block.slice(0, pendingIdx) : block;

    const date = extractBoldField(decisionBlock, 'Date') ?? '';
    const sessionStr = extractBoldField(decisionBlock, 'Session');
    const session = sessionStr ? parseInt(sessionStr, 10) : 0;
    const tagsStr = extractBoldField(decisionBlock, 'Tags');
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : [];
    const context = extractBoldField(decisionBlock, 'Context') ?? '';
    const decision = extractBoldField(decisionBlock, 'Decision') ?? '';
    const alternativesConsidered = extractBoldField(decisionBlock, 'Alternatives Considered') ?? '';
    const rationale = extractBoldField(decisionBlock, 'Rationale') ?? '';
    const status = extractBoldField(decisionBlock, 'Status') ?? '';
    const revisit = extractBoldField(decisionBlock, 'Revisit') ?? undefined;

    decisions.push({
      number: header.number,
      title: header.title,
      date,
      session,
      tags,
      context,
      decision,
      alternativesConsidered,
      rationale,
      status,
      revisit,
    });
  }

  return decisions;
}

/**
 * Extract a bold-prefixed field value.
 * Format: **Field:** value text that may span until the next **Field:** or ---
 */
function extractBoldField(block: string, fieldName: string): string | null {
  const escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\*\\*${escapedName}:\\*\\*\\s*(.+?)(?=\\n\\*\\*[A-Z]|\\n---|$)`, 's');
  const match = block.match(pattern);
  if (!match) return null;
  return match[1].trim();
}

/**
 * Parse pending decisions from the bottom section.
 */
function parsePendingDecisions(content: string): string[] {
  const pendingIdx = content.indexOf('## Pending Decisions');
  if (pendingIdx < 0) return [];

  const section = content.slice(pendingIdx);
  return section
    .split('\n')
    .filter(line => /^[-*]\s/.test(line.trim()))
    .map(line => line.replace(/^[-*]\s*/, '').trim());
}
