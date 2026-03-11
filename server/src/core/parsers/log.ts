import type { LogExchange, LogFile, LogSession } from '../types.js';

/**
 * Parse ENGRAM-LOG.md into structured LogFile.
 * Handles both markdown format (older) and YAML format (newer, from MCP server).
 * Lenient: malformed entries are skipped.
 */
export function parseLog(raw: string): LogFile {
  const sessions: LogSession[] = [];

  // Split by session headers: ### Session N — YYYY-MM-DD — Mode: mode
  const sessionPattern = /^###\s+Session\s+(\d+)\s*—\s*(\d{4}-\d{2}-\d{2})\s*—\s*Mode:\s*(.+)$/gm;
  const sessionHeaders: { number: number; date: string; mode: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = sessionPattern.exec(raw)) !== null) {
    sessionHeaders.push({
      number: parseInt(match[1], 10),
      date: match[2],
      mode: match[3].trim(),
      index: match.index + match[0].length,
    });
  }

  for (let i = 0; i < sessionHeaders.length; i++) {
    const header = sessionHeaders[i];
    const nextStart = i + 1 < sessionHeaders.length ? sessionHeaders[i + 1].index - 100 : raw.length;
    // Get content between this header and the next
    const content = raw.slice(header.index, nextStart).trim();

    const exchanges = parseExchanges(content);

    sessions.push({
      number: header.number,
      date: header.date,
      mode: header.mode,
      exchanges,
    });
  }

  return { sessions };
}

/**
 * Parse exchanges from session content.
 * Tries markdown format first, then YAML format.
 */
function parseExchanges(content: string): LogExchange[] {
  // Try markdown format: **[HH:MM UTC] Name:**
  const mdExchanges = parseMarkdownExchanges(content);
  if (mdExchanges.length > 0) return mdExchanges;

  // Try YAML format: - timestamp: "..."
  const yamlExchanges = parseYamlExchanges(content);
  if (yamlExchanges.length > 0) return yamlExchanges;

  return [];
}

/**
 * Parse markdown-format exchanges.
 * Format:
 *   **[HH:MM UTC] Name:**
 *   > blockquoted content
 */
function parseMarkdownExchanges(content: string): LogExchange[] {
  const exchanges: LogExchange[] = [];
  const speakerPattern = /\*\*\[(\d{2}:\d{2}\s*UTC)\]\s*(.+?):\*\*/g;
  const speakers: { timestamp: string; speaker: string; index: number; length: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = speakerPattern.exec(content)) !== null) {
    speakers.push({
      timestamp: match[1].trim(),
      speaker: match[2].trim(),
      index: match.index,
      length: match[0].length,
    });
  }

  for (let i = 0; i < speakers.length; i++) {
    const sp = speakers[i];
    const start = sp.index + sp.length;
    const end = i + 1 < speakers.length ? speakers[i + 1].index : content.length;
    const body = content.slice(start, end).trim();

    // Extract blockquoted content (lines starting with >)
    const lines = body.split('\n');
    const contentLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('>')) {
        contentLines.push(trimmed.slice(1).trim());
      } else if (trimmed === '' && contentLines.length > 0) {
        contentLines.push('');
      } else if (trimmed.startsWith('---')) {
        break;
      } else if (trimmed.startsWith('[...')) {
        // Skip truncation markers
        continue;
      } else if (contentLines.length > 0 && trimmed !== '') {
        // Non-blockquoted continuation line
        contentLines.push(trimmed);
      }
    }

    const text = contentLines.join('\n').trim();
    const isParaphrase = text.startsWith('[PARAPHRASE]');

    exchanges.push({
      timestamp: sp.timestamp,
      speaker: sp.speaker,
      content: text,
      isParaphrase,
    });
  }

  return exchanges;
}

/**
 * Parse YAML-format exchanges (from autonomic-engram-logger).
 * Format:
 *   - timestamp: "YYYY-MM-DD HH:MM UTC"
 *     turn: N
 *     agent: "name"
 *     confidence: 0.95
 *     prompt: |
 *       text
 *     response: |
 *       text
 *     deliverables:
 *       - "path"
 *     gaps_identified:
 *       - "text"
 */
function parseYamlExchanges(content: string): LogExchange[] {
  const exchanges: LogExchange[] = [];

  // Find YAML entries starting with "- timestamp:"
  const entryPattern = /^- timestamp:\s*"?(.+?)"?\s*$/gm;
  const entries: { timestamp: string; index: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = entryPattern.exec(content)) !== null) {
    entries.push({
      timestamp: match[1].trim(),
      index: match.index,
    });
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const start = entry.index;
    const end = i + 1 < entries.length ? entries[i + 1].index : content.length;
    const block = content.slice(start, end);

    const turn = extractYamlInt(block, 'turn');
    const agent = extractYamlString(block, 'agent');
    const confidence = extractYamlFloat(block, 'confidence');
    const prompt = extractYamlMultiline(block, 'prompt');
    const response = extractYamlMultiline(block, 'response');
    const deliverables = extractYamlList(block, 'deliverables');
    const gapsIdentified = extractYamlList(block, 'gaps_identified');
    const isParaphrase = response?.startsWith('[PARAPHRASE]') ?? false;

    // Create two exchanges: one for prompt, one for response
    if (prompt) {
      exchanges.push({
        timestamp: entry.timestamp,
        speaker: 'User',
        content: prompt,
        turn,
        isParaphrase: false,
      });
    }

    if (response) {
      exchanges.push({
        timestamp: entry.timestamp,
        speaker: agent ?? 'Agent',
        content: response,
        turn,
        agent: agent ?? undefined,
        confidence: confidence ?? undefined,
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        gapsIdentified: gapsIdentified.length > 0 ? gapsIdentified : undefined,
        isParaphrase,
      });
    }
  }

  return exchanges;
}

function extractYamlString(block: string, key: string): string | null {
  const pattern = new RegExp(`^\\s+${key}:\\s*"?(.+?)"?\\s*$`, 'm');
  const match = block.match(pattern);
  return match ? match[1].trim() : null;
}

function extractYamlInt(block: string, key: string): number | undefined {
  const val = extractYamlString(block, key);
  if (val === null) return undefined;
  const n = parseInt(val, 10);
  return isNaN(n) ? undefined : n;
}

function extractYamlFloat(block: string, key: string): number | undefined {
  const val = extractYamlString(block, key);
  if (val === null) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

/**
 * Extract a YAML multiline value (using | or > block scalar).
 */
function extractYamlMultiline(block: string, key: string): string | null {
  const pattern = new RegExp(`^\\s+${key}:\\s*\\|\\s*$`, 'm');
  const match = pattern.exec(block);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[0].length;
  const lines = block.slice(start).split('\n');
  const contentLines: string[] = [];

  // Read indented lines (at least 4 spaces of indentation)
  for (const line of lines) {
    if (line.trim() === '' && contentLines.length > 0) {
      contentLines.push('');
      continue;
    }
    if (/^\s{4,}/.test(line)) {
      contentLines.push(line.replace(/^\s{4}/, ''));
    } else if (contentLines.length > 0) {
      break;
    }
  }

  const result = contentLines.join('\n').trim();
  return result || null;
}

function extractYamlList(block: string, key: string): string[] {
  const pattern = new RegExp(`^\\s+${key}:\\s*$`, 'm');
  const match = pattern.exec(block);
  if (!match || match.index === undefined) return [];

  const start = match.index + match[0].length;
  const lines = block.slice(start).split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      items.push(trimmed.slice(2).replace(/^"(.*)"$/, '$1').trim());
    } else if (trimmed === '') {
      continue;
    } else {
      break;
    }
  }

  return items;
}
