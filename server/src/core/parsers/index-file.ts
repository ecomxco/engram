import type { IndexCategory, IndexEntry, IndexFile } from '../types.js';

/**
 * Parse ENGRAM-INDEX.md into a structured IndexFile.
 * Lenient: malformed entries are skipped.
 */
export function parseIndex(raw: string): IndexFile {
  const lastUpdated = extractField(raw, /\*\*Last Updated:\*\*\s*(.+?)(?:\s*\||$)/);
  const sessionsIndexed = extractField(raw, /\*\*Sessions Indexed:\*\*\s*(.+)/);
  const categories = parseCategories(raw);

  return { lastUpdated, sessionsIndexed, categories };
}

function extractField(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Parse categories and their index entries.
 * Categories are ### headings under ## Index.
 * Entries are in the format: [tag]: TIMESTAMP — Session N, turn T — description
 * They may appear inside ```text code blocks or as plain text.
 */
function parseCategories(content: string): IndexCategory[] {
  const categories: IndexCategory[] = [];

  // Find the ## Index section
  const indexMatch = content.match(/^##\s+Index\s*$/m);
  if (!indexMatch || indexMatch.index === undefined) return [];

  const indexContent = content.slice(indexMatch.index + indexMatch[0].length);

  // Stop at ## Maintenance Notes or end
  const endMatch = indexContent.match(/^##\s+Maintenance/m);
  const indexSection = endMatch?.index ? indexContent.slice(0, endMatch.index) : indexContent;

  // Split by ### category headings
  const categoryPattern = /^###\s+(.+)$/gm;
  const categoryHeaders: { name: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = categoryPattern.exec(indexSection)) !== null) {
    categoryHeaders.push({
      name: match[1].trim(),
      index: match.index + match[0].length,
    });
  }

  for (let i = 0; i < categoryHeaders.length; i++) {
    const header = categoryHeaders[i];
    const end = i + 1 < categoryHeaders.length ? categoryHeaders[i + 1].index - 30 : indexSection.length;
    const block = indexSection.slice(header.index, end);

    const entries = parseEntries(block);
    if (entries.length > 0) {
      categories.push({ name: header.name, entries });
    }
  }

  return categories;
}

/**
 * Parse index entries from a category block.
 * Format: [tag]:  TIMESTAMP — Session N, turn T — description
 * Entries may be inside code fences or plain text.
 */
function parseEntries(block: string): IndexEntry[] {
  const entries: IndexEntry[] = [];
  const entryPattern = /\[(\w+)\]:\s+(\S+)\s*—\s*Session\s+(\d+),\s*turn\s+(\d+)\s*—\s*(.+)/g;
  let match: RegExpExecArray | null;

  while ((match = entryPattern.exec(block)) !== null) {
    entries.push({
      tag: match[1],
      timestamp: match[2],
      session: parseInt(match[3], 10),
      turn: parseInt(match[4], 10),
      description: match[5].trim(),
    });
  }

  return entries;
}
