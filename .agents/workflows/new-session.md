---
description: Open a new session by reading the right files in the right order to restore context with minimal token cost
---
# New Session

Run this automatically at the start of every new session — before the user's first substantive request.

This is the **context boot sequence**. The order matters. Reading everything costs tokens; reading the right things in the right order costs almost nothing.

## Boot Sequence

### Step 1 — Check for Handoff (2 seconds)

```bash
ls HANDOFF.md 2>/dev/null
```

If `HANDOFF.md` exists: **read it first and only**. It was written to replace the boot sequence. Skip to Step 4.

### Step 2 — Read STATE.md (always)

Extract:

- Current session number
- Last action / "What Just Happened"
- Active threads
- Current priorities
- Blockers
- `current_turn` from YAML frontmatter

### Step 3 — Read ENGRAM.md (always)

Extract:

- Open Problems summary (P0s must be surfaced immediately)
- Active workstreams
- Next tasks

> **Do NOT read ENGRAM-LOG.md** at session start. That is the raw archive.
> Read it only if the user asks about a specific prior session in detail.

### Step 4 — Announce State

Open with a single short summary in this format:

```text
📍 Session [N] — picking up from: [last action]
🚧 Blockers: [blocker or None]
⚠️  P0: [top problem or None]
🎯 Next: [top priority task]

Ready. What would you like to work on?
```

### Step 5 — Archive Handoff (if applicable)

If `HANDOFF.md` existed:

```bash
mv HANDOFF.md HANDOFF-[YYYY-MM-DD].md
```

## Context Engineering Principle

The boot sequence reads at most 2 files (~1-3K tokens). The full log is never loaded unless explicitly needed. This keeps the agent fast and context-efficient across hundreds of sessions.
