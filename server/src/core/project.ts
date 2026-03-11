import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EngramFiles, EngramProject } from './types.js';

const REQUIRED_FILES = ['STATE.md', 'ENGRAM-LOG.md', 'ENGRAM.md'] as const;

const ALL_FILES: Record<keyof EngramFiles, string> = {
  state: 'STATE.md',
  log: 'ENGRAM-LOG.md',
  engram: 'ENGRAM.md',
  decisions: 'DECISIONS.md',
  agents: 'AGENTS.md',
  index: 'ENGRAM-INDEX.md',
  claude: 'CLAUDE.md',
  readme: 'README.md',
  handoff: 'HANDOFF.md',
};

/**
 * Detect an engram project at the given directory.
 * A valid project must have at least STATE.md, ENGRAM-LOG.md, and ENGRAM.md.
 */
export function detectProject(dir?: string): EngramProject | null {
  const root = resolve(dir ?? process.env.ENGRAM_PROJECT_DIR ?? process.cwd());

  for (const file of REQUIRED_FILES) {
    if (!existsSync(join(root, file))) {
      return null;
    }
  }

  const files = {} as EngramFiles;
  for (const [key, filename] of Object.entries(ALL_FILES)) {
    files[key as keyof EngramFiles] = join(root, filename);
  }

  return { root, files };
}

/**
 * Detect an engram project or throw with a helpful message.
 */
export function requireProject(dir?: string): EngramProject {
  const project = detectProject(dir);
  if (!project) {
    const searchDir = resolve(dir ?? process.env.ENGRAM_PROJECT_DIR ?? process.cwd());
    throw new Error(
      `No engram project found at ${searchDir}. ` +
      `Expected STATE.md, ENGRAM-LOG.md, and ENGRAM.md. ` +
      `Run 'engram init' to create a new project.`
    );
  }
  return project;
}
