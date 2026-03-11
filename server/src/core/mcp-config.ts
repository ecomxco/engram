import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, platform } from 'node:os';

const MCP_CONFIG = {
  mcpServers: {
    engram: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'engram-protocol', 'serve'],
    },
  },
};

/**
 * Write .mcp.json to a project directory.
 * Claude Code discovers this automatically — no manual config needed.
 */
export function writeMcpConfig(projectDir: string): void {
  const configPath = join(projectDir, '.mcp.json');
  writeFileSync(configPath, JSON.stringify(MCP_CONFIG, null, 2) + '\n', 'utf-8');
}

/**
 * Patch Claude Desktop's config to include the engram MCP server.
 * Only works on macOS where Claude Desktop stores its config.
 */
export function patchClaudeDesktop(projectDir: string): { patched: boolean; message: string } {
  const configDir = platform() === 'darwin'
    ? join(homedir(), 'Library', 'Application Support', 'Claude')
    : platform() === 'win32'
      ? join(homedir(), 'AppData', 'Roaming', 'Claude')
      : null;

  if (!configDir) {
    return { patched: false, message: 'Claude Desktop config not supported on this platform. Use .mcp.json with Claude Code instead.' };
  }

  const configPath = join(configDir, 'claude_desktop_config.json');

  if (!existsSync(configPath)) {
    return { patched: false, message: `Claude Desktop config not found at ${configPath}. Is Claude Desktop installed?` };
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return { patched: false, message: `Failed to parse ${configPath}. Fix the JSON manually and retry.` };
  }

  const servers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (servers.engram) {
    return { patched: false, message: 'Engram is already configured in Claude Desktop. No changes made.' };
  }

  servers.engram = {
    command: 'npx',
    args: ['-y', 'engram-protocol', 'serve'],
    env: {
      ENGRAM_PROJECT_DIR: resolve(projectDir),
    },
  };

  config.mcpServers = servers;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return { patched: true, message: 'Engram added to Claude Desktop config. Restart Claude Desktop to activate.' };
}

/**
 * Patch Antigravity's MCP config to include the engram server.
 * Config lives at ~/.gemini/antigravity/mcp_config.json on all platforms.
 */
export function patchAntigravity(projectDir: string): { patched: boolean; message: string } {
  const configDir = join(homedir(), '.gemini', 'antigravity');
  const configPath = join(configDir, 'mcp_config.json');

  if (!existsSync(configDir)) {
    return { patched: false, message: `Antigravity config directory not found at ${configDir}. Is Antigravity installed?` };
  }

  // If config file doesn't exist or is empty, create it with just the engram entry
  const rawContent = existsSync(configPath) ? readFileSync(configPath, 'utf-8').trim() : '';
  if (!rawContent) {
    const config = {
      mcpServers: {
        engram: {
          command: 'npx',
          args: ['-y', 'engram-protocol', 'serve'],
          env: {
            ENGRAM_PROJECT_DIR: resolve(projectDir),
          },
        },
      },
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
    return { patched: true, message: 'Engram added to Antigravity config. Restart Antigravity to activate.' };
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(rawContent);
  } catch {
    return { patched: false, message: `Failed to parse ${configPath}. Fix the JSON manually and retry.` };
  }

  const servers = (config.mcpServers ?? {}) as Record<string, unknown>;

  if (servers.engram) {
    return { patched: false, message: 'Engram is already configured in Antigravity. No changes made.' };
  }

  servers.engram = {
    command: 'npx',
    args: ['-y', 'engram-protocol', 'serve'],
    env: {
      ENGRAM_PROJECT_DIR: resolve(projectDir),
    },
  };

  config.mcpServers = servers;
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  return { patched: true, message: 'Engram added to Antigravity config. Restart Antigravity to activate.' };
}
