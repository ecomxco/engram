import type { AgentConfig, AgentRegistryEntry, AgentsFile } from '../types.js';

/**
 * Parse AGENTS.md into a structured AgentsFile.
 * Lenient: missing sections return defaults.
 */
export function parseAgents(raw: string): AgentsFile {
  const projectName = extractProjectName(raw);
  const lastUpdated = extractField(raw, /\*\*Last Updated:\*\*\s*(.+)/);
  const primaryAgent = parsePrimaryAgent(raw);
  const agentRegistry = parseAgentRegistry(raw);

  return { projectName, lastUpdated, primaryAgent, agentRegistry };
}

function extractField(content: string, pattern: RegExp): string | null {
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Extract project name from header.
 * Format: ## Project: Name
 */
function extractProjectName(content: string): string {
  const match = content.match(/##\s+Project:\s*(.+)/);
  return match ? match[1].trim() : '';
}

/**
 * Parse the primary agent section.
 * Looks for ## Primary Agent: Name and then **Role:**, **Constraints:**, **Capabilities:**
 */
function parsePrimaryAgent(content: string): AgentConfig | null {
  const nameMatch = content.match(/##\s+Primary Agent:\s*(.+)/);
  if (!nameMatch) return null;

  const name = nameMatch[1].trim();

  // Extract the section content
  const sectionStart = (nameMatch.index ?? 0) + nameMatch[0].length;
  const rest = content.slice(sectionStart);
  const nextSection = rest.match(/^##\s/m);
  const sectionContent = nextSection?.index ? rest.slice(0, nextSection.index) : rest;

  const roleMatch = sectionContent.match(/\*\*Role:\*\*\s*(.+)/);
  const role = roleMatch ? roleMatch[1].trim() : '';

  const constraints = extractListSection(sectionContent, 'Constraints');
  const capabilities = extractListSection(sectionContent, 'Capabilities to verify periodically');

  return { name, role, constraints, capabilities };
}

/**
 * Extract a list section that starts with **Label:** followed by bullet items.
 */
function extractListSection(content: string, label: string): string[] {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\*\\*${escapedLabel}:\\*\\*`, 'i');
  const match = content.match(pattern);
  if (!match || match.index === undefined) return [];

  const start = match.index + match[0].length;
  const lines = content.slice(start).split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s/.test(trimmed)) {
      items.push(trimmed.replace(/^[-*]\s*/, '').trim());
    } else if (trimmed.startsWith('**') || trimmed.startsWith('##') || trimmed.startsWith('---')) {
      break;
    }
  }

  return items;
}

/**
 * Parse the agent registry table.
 * Format: | Agent | Provider | First Used | Notes |
 */
function parseAgentRegistry(content: string): AgentRegistryEntry[] {
  const entries: AgentRegistryEntry[] = [];

  // Find the table in the Agent Registry section
  const sectionMatch = content.match(/##\s+Agent Registry/i);
  if (!sectionMatch || sectionMatch.index === undefined) return [];

  const sectionContent = content.slice(sectionMatch.index);

  // Find table rows (skip header and separator)
  const lines = sectionContent.split('\n');
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        continue; // Skip header row
      }
      if (!headerPassed) {
        // Skip separator row (|---|---|---|---|)
        if (trimmed.includes('---')) {
          headerPassed = true;
          continue;
        }
      }

      // Parse data row
      const cells = trimmed
        .split('|')
        .slice(1, -1) // Remove first and last empty strings
        .map(cell => cell.trim());

      if (cells.length >= 4) {
        entries.push({
          agent: cells[0],
          provider: cells[1],
          firstUsed: cells[2],
          notes: cells[3],
        });
      }
    } else if (inTable && headerPassed) {
      break; // End of table
    }
  }

  return entries;
}
