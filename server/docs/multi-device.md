# Multi-Device Usage

Engram projects are plain files in a directory. This makes multi-device workflows straightforward — with one important constraint.

## Single-Writer Assumption

Engram follows a **single-writer model**: only one agent or session should write to the project files at a time. Multiple simultaneous writers can corrupt the log or produce conflicting state updates.

### Advisory Lock

The MCP server uses an advisory file lock (`.engram-lock`) to enforce this:

```
.engram-lock
pid: 12345
hostname: macbook-pro
started: 2026-03-11T10:30:00Z
```

- When the MCP server starts, it creates `.engram-lock` with the current PID and hostname.
- Before writing, operations check that the lock belongs to the current process.
- If a stale lock is detected (process no longer running on the same host), it is automatically reclaimed.
- The lock is released when the server shuts down.

**This is advisory, not mandatory.** The CLI and direct file edits do not acquire the lock. It exists to prevent accidental concurrent MCP server instances.

## Syncing Across Devices

### Git (Recommended)

The simplest approach: commit and push your engram project files via git.

```bash
# On device A — end of session
engram checkpoint
git add -A && git commit -m "session 5 complete"
git push

# On device B — start of session
git pull
engram status
```

**What to commit:** All `.md` files, `.agents/` directory, `.gitignore`. The `.engram-lock` file is already in `.gitignore`.

**Merge conflicts:** Rare if you follow the single-writer model. If they occur:
- `ENGRAM-LOG.md` — append-only, so conflicts are usually at the end. Keep both sides.
- `STATE.md` — take the newer version (check timestamps in "Last Updated").
- `ENGRAM.md` — run `engram reconcile` after resolving to rebuild from the log.
- `DECISIONS.md` — keep both decisions, renumber if needed.

### Cloud Sync (Dropbox, iCloud, OneDrive)

Works well for single-user workflows. The files are small text files that sync efficiently.

**Caution:** Cloud sync services can create conflict copies (`STATE (1).md`) if two devices edit simultaneously. Always close your AI session on one device before opening on another.

### Manual Copy

Copy the project directory between devices. Simple, no dependencies.

## Workflow Patterns

### Laptop + Desktop

1. Work on laptop during the day
2. Push to git at end of session
3. Pull on desktop at night
4. The agent reads `STATE.md` and picks up exactly where you left off

### Multiple AI Platforms

1. Use Claude on one device, ChatGPT on another
2. Each reads the same `STATE.md` and `ENGRAM.md`
3. Each logs to the same `ENGRAM-LOG.md` with its agent name
4. The log shows which agent said what — full attribution

### Team Collaboration

For teams, use git branches:
1. Each team member works on their own branch
2. Merge branches periodically
3. Run `engram reconcile` after merge to rebuild the summary
4. Decision conflicts are resolved by the team lead

## Troubleshooting

**"Lock held by another process"** — Check if another MCP server instance is running. If the process is gone, delete `.engram-lock` manually.

**"State drift detected"** — Run `engram reconcile` to rebuild `ENGRAM.md` from the log. The log is the source of truth.

**"Files out of sync after cloud sync"** — Run `engram checkpoint` to force a full sync of all files from the current state.
