---
description: Rotate ENGRAM-LOG.md when it grows too large — archive it and start a fresh log without losing history
---
# Rotate Log

Run this when the user says "rotate log", "archive log", or when `ENGRAM-LOG.md` exceeds ~500 lines (about 10-15 dense sessions).

## When to Trigger

- User explicitly requests it
- `ENGRAM-LOG.md` is approaching the context window limit for your model
- Recommended: every 15-20 sessions

## Steps

1. **Determine the next archive number** by checking what already exists:

   ```bash
   ls ENGRAM-LOG-*.md 2>/dev/null | sort | tail -1
   ```

   If `ENGRAM-LOG-001.md` exists, next is `ENGRAM-LOG-002.md`, etc. Start at `ENGRAM-LOG-001.md` if none exist.

2. **Reconcile first** (run the `/reconcile` workflow) — ensure `ENGRAM.md` is fully up to date before the raw log is archived.

3. **Rename the current log:**

   ```bash
   mv ENGRAM-LOG.md ENGRAM-LOG-001.md   # or next number
   ```

4. **Create a fresh `ENGRAM-LOG.md`** with a header note:

   ```markdown
   # ENGRAM-LOG.md — Session Log

   > **Log rotation performed after Session [N].**
   > Previous sessions are archived in `ENGRAM-LOG-001.md` (and earlier).
   > The processed summary of all prior sessions lives in `ENGRAM.md`.

   ---
   ```

5. **Update `STATE.md`**:
   - Note the rotation: `Log rotated after session [N] → ENGRAM-LOG-001.md`
   - Update `last_sync_turn` and `current_turn`

6. **Update `.gitignore`** if the archived logs should be excluded from version control (optional — discuss with user).

7. **Confirm**: "Log rotated. Sessions 1–[N] archived to `ENGRAM-LOG-001.md`. Fresh log started."
