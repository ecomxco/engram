import type { EngramSummary, PrioritizedProblem, Task, TaskGroup, Workstream } from '../types.js';

/**
 * Parse ENGRAM.md into a structured EngramSummary.
 * Lenient: missing sections return empty arrays/defaults.
 */
export function parseEngram(raw: string): EngramSummary {
  const lastUpdated = extractField(raw, /\*\*Last Updated:\*\*\s*(.+)/);
  const sessionsProcessed = extractInt(raw, /\*\*Sessions Processed:\*\*\s*(\d+)/);
  const lastReconciled = extractField(raw, /\*\*Last Reconciled Against Log:\*\*\s*(.+)/);

  const workstreams = parseWorkstreams(raw);
  const openProblems = parseOpenProblems(raw);
  const tasks = parseTasks(raw);
  const decisionRefs = parseDecisionRefs(raw);
  const openQuestions = parseOpenQuestions(raw);

  return {
    lastUpdated,
    sessionsProcessed,
    lastReconciled,
    workstreams,
    openProblems,
    tasks,
    decisionRefs,
    openQuestions,
  };
}

function extractField(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function extractInt(content: string, pattern: RegExp): number {
  const match = content.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

function extractSection(content: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^##\\s+${escapedHeading}[^\\n]*\\n`, 'mi');
  const match = content.match(pattern);
  if (!match || match.index === undefined) return null;

  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const endMatch = rest.match(/^(?:##\s|---)/m);
  const end = endMatch?.index ?? rest.length;

  return rest.slice(0, end).trim();
}

/**
 * Parse workstreams list.
 * Format: - **Name** — description
 */
function parseWorkstreams(content: string): Workstream[] {
  const section = extractSection(content, 'Workstreams');
  if (!section) return [];

  const workstreams: Workstream[] = [];
  const pattern = /^[-*]\s+\*\*(.+?)\*\*\s*—\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(section)) !== null) {
    workstreams.push({
      name: match[1].trim(),
      description: match[2].trim(),
    });
  }

  return workstreams;
}

/**
 * Parse open problems grouped by priority.
 * Format: **P0 (label):** followed by bullet items
 */
function parseOpenProblems(content: string): PrioritizedProblem[] {
  const section = extractSection(content, 'Open Problems');
  if (!section) return [];

  const problems: PrioritizedProblem[] = [];
  let currentPriority = 'P0';

  for (const line of section.split('\n')) {
    const trimmed = line.trim();

    // Priority header: **P0 (blocking near-term work):**
    const priorityMatch = trimmed.match(/^\*\*(P\d+)\s*\(.*?\):\*\*/);
    if (priorityMatch) {
      currentPriority = priorityMatch[1];
      continue;
    }

    // Bullet item
    if (/^[-*]\s/.test(trimmed)) {
      problems.push({
        priority: currentPriority,
        description: trimmed.replace(/^[-*]\s*/, '').trim(),
      });
    }
  }

  return problems;
}

/**
 * Parse tasks grouped by category.
 * Format: **Category:** followed by - [ ] or - [x] items
 */
function parseTasks(content: string): TaskGroup[] {
  const section = extractSection(content, 'Tasks');
  if (!section) return [];

  const groups: TaskGroup[] = [];
  let currentGroup: TaskGroup | null = null;

  for (const line of section.split('\n')) {
    const trimmed = line.trim();

    // Group header: **Immediate (before Friday demo):**
    const groupMatch = trimmed.match(/^\*\*(.+?):\*\*/);
    if (groupMatch) {
      currentGroup = { group: groupMatch[1].trim(), tasks: [] };
      groups.push(currentGroup);
      continue;
    }

    // Task item: - [ ] or - [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
    if (taskMatch && currentGroup) {
      currentGroup.tasks.push({
        done: taskMatch[1].toLowerCase() === 'x',
        description: taskMatch[2].trim(),
      });
    }
  }

  return groups;
}

/**
 * Parse decision references from the "Decisions Made" section.
 */
function parseDecisionRefs(content: string): string[] {
  const section = extractSection(content, 'Decisions Made');
  if (!section) return [];

  return section
    .split('\n')
    .filter(line => /^[-*]\s/.test(line.trim()))
    .map(line => line.replace(/^[-*]\s*/, '').trim());
}

/**
 * Parse open questions as a numbered list.
 */
function parseOpenQuestions(content: string): string[] {
  const section = extractSection(content, 'Open Questions');
  if (!section) return [];

  return section
    .split('\n')
    .filter(line => /^\d+\.\s/.test(line.trim()))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}
