import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface InitOptions {
  template: string;
  name: string;
  author: string;
  dir?: string;
}

function getTemplatesDir(): string {
  // Templates are bundled alongside the source
  return join(import.meta.dirname, '..', '..', 'templates');
}

function applyPlaceholders(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

export function listTemplates(): string[] {
  const dir = getTemplatesDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
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

  const vars: Record<string, string> = {
    PROJECT_NAME_PLACEHOLDER: opts.name,
    AUTHOR_NAME_PLACEHOLDER: opts.author,
    DATE_PLACEHOLDER: new Date().toISOString().slice(0, 10),
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

  // Create .agents/workflows directory
  const workflowsDir = join(targetDir, '.agents', 'workflows');
  mkdirSync(workflowsDir, { recursive: true });

  // Create .gitignore if not present
  if (!existsSync(join(targetDir, '.gitignore'))) {
    writeFileSync(join(targetDir, '.gitignore'), '.engram-lock\n', 'utf-8');
    created.push('.gitignore');
  }

  return `Engram project "${opts.name}" initialized in ${targetDir}\nTemplate: ${opts.template}\nFiles created: ${created.join(', ')}`;
}
