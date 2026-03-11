/**
 * Simple output formatting for the CLI.
 * No external dependencies — just ANSI codes.
 */

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

export function bold(s: string): string { return `${BOLD}${s}${RESET}`; }
export function dim(s: string): string { return `${DIM}${s}${RESET}`; }
export function green(s: string): string { return `${GREEN}${s}${RESET}`; }
export function yellow(s: string): string { return `${YELLOW}${s}${RESET}`; }
export function red(s: string): string { return `${RED}${s}${RESET}`; }
export function cyan(s: string): string { return `${CYAN}${s}${RESET}`; }

export function heading(s: string): void {
  console.log(`\n${BOLD}${CYAN}${s}${RESET}\n`);
}

export function success(s: string): void {
  console.log(`${GREEN}✓${RESET} ${s}`);
}

export function warn(s: string): void {
  console.log(`${YELLOW}⚠${RESET} ${s}`);
}

export function error(s: string): void {
  console.error(`${RED}✗${RESET} ${s}`);
}

export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)),
  );

  const sep = widths.map(w => '─'.repeat(w + 2)).join('┼');
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell ?? '').padEnd(widths[i])} `).join('│');

  console.log(formatRow(headers));
  console.log(sep);
  for (const row of rows) {
    console.log(formatRow(row));
  }
}
