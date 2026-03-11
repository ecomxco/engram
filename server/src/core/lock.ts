import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

const LOCK_FILE = '.engram-lock';

interface LockInfo {
  pid: number;
  host: string;
  timestamp: string;
}

/**
 * Acquire an advisory lock for the engram project.
 * Returns true if lock acquired, false if already held by another process.
 */
export function acquireLock(projectRoot: string): boolean {
  const lockPath = join(projectRoot, LOCK_FILE);

  if (existsSync(lockPath)) {
    const existing = readLock(lockPath);
    if (existing && isProcessAlive(existing.pid, existing.host)) {
      return false;
    }
    // Stale lock — remove it
    unlinkSync(lockPath);
  }

  const info: LockInfo = {
    pid: process.pid,
    host: hostname(),
    timestamp: new Date().toISOString(),
  };

  writeFileSync(lockPath, JSON.stringify(info, null, 2), 'utf-8');
  return true;
}

/**
 * Release the advisory lock.
 */
export function releaseLock(projectRoot: string): void {
  const lockPath = join(projectRoot, LOCK_FILE);

  if (!existsSync(lockPath)) return;

  const info = readLock(lockPath);
  // Only release our own lock
  if (info && info.pid === process.pid && info.host === hostname()) {
    unlinkSync(lockPath);
  }
}

/**
 * Check who holds the lock (if anyone).
 */
export function getLockHolder(projectRoot: string): LockInfo | null {
  const lockPath = join(projectRoot, LOCK_FILE);
  if (!existsSync(lockPath)) return null;
  return readLock(lockPath);
}

function readLock(lockPath: string): LockInfo | null {
  try {
    const raw = readFileSync(lockPath, 'utf-8');
    return JSON.parse(raw) as LockInfo;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number, host: string): boolean {
  // Can only check processes on the same host
  if (host !== hostname()) return true; // Assume alive on remote hosts
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
