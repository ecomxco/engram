import matter from 'gray-matter';
import type { SessionSummary, StateFile, StateFrontmatter } from '../types.js';

const DEFAULT_FRONTMATTER: StateFrontmatter = {
  current_turn: 0,
  last_sync_turn: 0,
  sync_threshold: 5,
};

/**
 * Parse STATE.md into a structured StateFile.
 * Lenient: missing fields get defaults.
 */
export function parseState(raw: string): StateFile {
  const { data, content } = matter(raw);

  const frontmatter: StateFrontmatter = {
    current_turn: typeof data.current_turn === 'number' ? data.current_turn : DEFAULT_FRONTMATTER.current_turn,
    last_sync_turn: typeof data.last_sync_turn === 'number' ? data.last_sync_turn : DEFAULT_FRONTMATTER.last_sync_turn,
    sync_threshold: typeof data.sync_threshold === 'number' ? data.sync_threshold : DEFAULT_FRONTMATTER.sync_threshold,
  };

  const lastUpdated = extractField(content, /\*\*Last Updated:\*\*\s*(.+)/);
  const updatedBy = extractField(content, /\*\*Updated By:\*\*\s*(.+)/);

  const whatJustHappened = parseSessionSummaries(content);
  const activeThreads = parseNumberedList(content, 'Active Threads');
  const currentPriorities = parseNumberedList(content, 'Current Priorities');
  const blockers = parseBulletList(content, 'Blockers');
  const keyContext = parseBulletList(content, 'Key Context');

  const totalSessions = parseIntField(content, /\*\*Total sessions:\*\*\s*(\d+)/);
  const lastSession = extractField(content, /\*\*Last session:\*\*\s*(.+)/);
  const nextReconciliation = extractField(content, /\*\*Next reconciliation due:\*\*\s*(.+)/);

  return {
    frontmatter,
    lastUpdated,
    updatedBy,
    whatJustHappened,
    activeThreads,
    currentPriorities,
    blockers,
    keyContext,
    totalSessions,
    lastSession,
    nextReconciliation,
  };
}

function extractField(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function parseIntField(content: string, pattern: RegExp): number {
  const match = content.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse session summaries from "What Just Happened" section.
 * Format: **Session N (YYYY-MM-DD) — Mode: mode** followed by bullet items.
 */
function parseSessionSummaries(content: string): SessionSummary[] {
  const section = extractSection(content, 'What Just Happened');
  if (!section) return [];

  // Collect all session headers first, then process
  const sessionPattern = /\*\*Session\s+(\d+)\s*\((\d{4}-\d{2}-\d{2})\)\s*—\s*Mode:\s*(.+?)\*\*/g;
  const headers: { session: number; date: string; mode: string; endOfMatch: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = sessionPattern.exec(section)) !== null) {
    headers.push({
      session: parseInt(match[1], 10),
      date: match[2],
      mode: match[3].trim(),
      endOfMatch: match.index + match[0].length,
    });
  }

  return headers.map((h, i) => {
    const start = h.endOfMatch;
    const end = i + 1 < headers.length ? headers[i + 1].endOfMatch - headers[i + 1].mode.length - 50 : section.length;
    const itemsText = section.slice(start, end);
    const items = itemsText
      .split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.startsWith('**'));

    return { session: h.session, date: h.date, mode: h.mode, items };
  });
}

/**
 * Parse a numbered list from a section.
 * Format: 1. **Name** — description
 */
function parseNumberedList(content: string, sectionName: string): string[] {
  const section = extractSection(content, sectionName);
  if (!section) return [];

  return section
    .split('\n')
    .filter(line => /^\d+\.\s/.test(line.trim()))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * Parse a bullet list from a section.
 * Format: - **Label:** description
 */
function parseBulletList(content: string, sectionName: string): string[] {
  const section = extractSection(content, sectionName);
  if (!section) return [];

  return section
    .split('\n')
    .filter(line => /^[-*]\s/.test(line.trim()))
    .map(line => line.replace(/^[-*]\s*/, '').trim());
}

/**
 * Extract content of a section by heading name.
 * Returns text between ## heading and the next ## heading or ---.
 */
function extractSection(content: string, heading: string): string | null {
  // Match the heading (allowing partial match for sections like "What Just Happened (Last 1-2 Sessions Only)")
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^##\\s+${escapedHeading}[^\\n]*\\n`, 'mi');
  const match = content.match(pattern);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[0].length;
  // Find the next section boundary (## heading or ---)
  const rest = content.slice(start);
  const endMatch = rest.match(/^(?:##\s|---)/m);
  const end = endMatch?.index ?? rest.length;

  return rest.slice(0, end).trim();
}
