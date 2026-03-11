import type { AgentRegistryEntry, AgentsFile } from '../types.js';

/**
 * Format a single agent registry row for appending.
 */
export function formatAgentRow(entry: AgentRegistryEntry): string {
  return `| ${entry.agent} | ${entry.provider} | ${entry.firstUsed} | ${entry.notes} |`;
}

/**
 * Serialize a full AgentsFile to AGENTS.md markdown format.
 */
export function writeAgents(file: AgentsFile): string {
  const lines: string[] = [];

  lines.push('# AGENTS.md — Agent Configuration');
  lines.push('');
  if (file.projectName) {
    lines.push(`## Project: ${file.projectName}`);
  }
  if (file.lastUpdated) lines.push(`**Last Updated:** ${file.lastUpdated}`);
  lines.push('');
  lines.push('---');

  if (file.primaryAgent) {
    lines.push('');
    lines.push(`## Primary Agent: ${file.primaryAgent.name}`);
    lines.push('');
    lines.push(`**Role:** ${file.primaryAgent.role}`);
    lines.push('');
    if (file.primaryAgent.constraints.length > 0) {
      lines.push('**Constraints:**');
      for (const c of file.primaryAgent.constraints) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }
    if (file.primaryAgent.capabilities.length > 0) {
      lines.push('**Capabilities to verify periodically:**');
      for (const c of file.primaryAgent.capabilities) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }
    lines.push('---');
  }

  lines.push('');
  lines.push('## Agent Registry');
  lines.push('');
  lines.push('| Agent | Provider | First Used | Notes |');
  lines.push('|-------|----------|------------|-------|');
  for (const entry of file.agentRegistry) {
    lines.push(formatAgentRow(entry));
  }

  return lines.join('\n') + '\n';
}
