import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { writeMcpConfig } from './mcp-config.js';

export interface InitOptions {
  template: string;
  name: string;
  author: string;
  email?: string;
  desc?: string;
  dir?: string;
}

function getTemplatesDir(): string {
  // From compiled dist/src/core/ we need ../../.. to reach the package root.
  // From source src/core/ we only need ../.. — try compiled path first.
  const fromCompiled = join(import.meta.dirname, '..', '..', '..', 'templates');
  if (existsSync(fromCompiled)) return fromCompiled;
  return join(import.meta.dirname, '..', '..', 'templates');
}

function applyPlaceholders(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

/**
 * Recursively copy files from a source directory to a target directory.
 * Applies placeholder substitution to text files and makes .sh files executable.
 */
function copyTree(
  srcDir: string,
  destDir: string,
  vars: Record<string, string>,
  created: string[],
  relPrefix = '',
): void {
  if (!existsSync(srcDir)) return;

  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = join(srcDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyTree(srcPath, destPath, vars, created, relPath);
    } else {
      let content = readFileSync(srcPath, 'utf-8');
      // Apply placeholders to text files
      if (/\.(md|html|json|sh|txt)$/.test(entry.name)) {
        content = applyPlaceholders(content, vars);
      }
      writeFileSync(destPath, content, 'utf-8');
      // Make shell scripts executable
      if (entry.name.endsWith('.sh')) {
        chmodSync(destPath, 0o755);
      }
      created.push(relPath);
    }
  }
}

export function listTemplates(): string[] {
  const dir = getTemplatesDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '_common')
    .map(d => d.name);
}

export function initProject(opts: InitOptions): string {
  const targetDir = opts.dir ?? process.cwd();
  const templatesDir = getTemplatesDir();
  const templateDir = join(templatesDir, opts.template);

  if (!existsSync(templateDir)) {
    const available = listTemplates();
    throw new Error(`Template "${opts.template}" not found. Available: ${available.join(', ') || 'none'}`);
  }

  // Check if project already exists
  if (existsSync(join(targetDir, 'STATE.md'))) {
    throw new Error(`An engram project already exists in ${targetDir}. Use a different directory.`);
  }

  mkdirSync(targetDir, { recursive: true });

  const now = new Date();
  const dateShort = now.toISOString().slice(0, 10);
  const timestamp = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const vars: Record<string, string> = {
    PROJECT_NAME_PLACEHOLDER: opts.name,
    AUTHOR_NAME_PLACEHOLDER: opts.author,
    AUTHOR_PLACEHOLDER: opts.author,
    AUTHOR_EMAIL_PLACEHOLDER: opts.email ?? '',
    PROJECT_DESC_PLACEHOLDER: opts.desc ?? '',
    DATE_PLACEHOLDER: dateShort,
    DATE_SHORT_PLACEHOLDER: dateShort,
    TIMESTAMP_PLACEHOLDER: timestamp,
    DIR_BASENAME_PLACEHOLDER: basename(targetDir),
    VERSION_PLACEHOLDER: '4.0',
  };

  const files = readdirSync(templateDir).filter(f => f.endsWith('.tmpl'));
  const created: string[] = [];

  for (const file of files) {
    const content = readFileSync(join(templateDir, file), 'utf-8');
    const outName = file.replace('.tmpl', '');
    const processed = applyPlaceholders(content, vars);
    writeFileSync(join(targetDir, outName), processed, 'utf-8');
    created.push(outName);
  }

  // Copy shared assets from _common (VISUALIZER.html, scripts, workflows)
  const commonDir = join(templatesDir, '_common');
  copyTree(commonDir, targetDir, vars, created);

  // Create .mcp.json for Claude Code auto-discovery
  writeMcpConfig(targetDir);
  created.push('.mcp.json');

  // Create .gitignore if not present
  if (!existsSync(join(targetDir, '.gitignore'))) {
    writeFileSync(join(targetDir, '.gitignore'), '.engram-lock\n', 'utf-8');
    created.push('.gitignore');
  }

  return `Engram project "${opts.name}" initialized in ${targetDir}\nTemplate: ${opts.template}\nFiles created: ${created.join(', ')}`;
}
