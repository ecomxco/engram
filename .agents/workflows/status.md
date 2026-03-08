---
description: Give a concise status summary of the current project state by reading STATE.md and ENGRAM.md
---
# Status

Run this when the user says "status", "where are we", "what's the current state", or "give me an update".

## Steps

1. **Read `STATE.md`** — extract:
   - What just happened (last 1-2 sessions)
   - Active threads
   - Current priorities
   - Blockers
   - Session counter

2. **Read `ENGRAM.md`** — extract:
   - Open Problems (P0/P1/P2 count and top items)
   - Open tasks count
   - Open questions count

3. **Output a 4-8 line summary** in this format:

   ```text
   📍 Session [N] — [last session date]
   🧵 Active: [thread 1], [thread 2], [...]
   🎯 Priority: [top priority]
   🚧 Blockers: [blocker or "None"]
   ⚠️  Open: [X problems] ([Y P0]), [Z tasks], [W questions]
   ```

> **Do not** read `ENGRAM-LOG.md` for this command. The purpose of this workflow is
> fast, low-context retrieval. STATE.md and ENGRAM.md are the processed layer — use them.
