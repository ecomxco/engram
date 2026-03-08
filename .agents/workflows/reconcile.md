---
description: Rebuild ENGRAM.md from scratch using ENGRAM-LOG.md as the source of truth — fixes drift between the log and the summary
---
# Reconcile Now

Run this when the user says "reconcile now", or automatically when the session counter hits the reconciliation threshold (every 5 sessions by default).

This is a **full rebuild** — not an incremental update. It corrects any drift between the raw log and the processed summary.

## Steps

1. **Read the full `ENGRAM-LOG.md`** from top to bottom.
   - Note: this is the one case where reading the full log is intentional and necessary.
   - If the log has been rotated (ENGRAM-LOG-001.md, etc.), read the current log only. The summary from previous rotations is already captured in `ENGRAM.md`.

2. **Extract all data from the log**:
   - Every session: mode, date, key decisions, deliverables, open threads
   - Every decision mentioned (cross-reference DECISIONS.md)
   - All open problems (P0/P1/P2) — include any mentioned but never resolved
   - All tasks: mark completed ones if resolved in a later session
   - All open questions — mark answered ones if addressed in a later session

3. **Rebuild `ENGRAM.md` from scratch** using the extracted data. Follow the existing section structure:
   - `## Workstreams` — list active workstreams
   - `## Open Problems — Prioritized` — P0, P1, P2 grouped
   - `## Tasks / Next Steps` — uncompleted tasks with `- [ ]`
   - `## Decisions Made` — count + 2-3 most recent, link to DECISIONS.md
   - `## Open Questions` — numbered list

4. **Update `STATE.md`**:
   - Note that reconciliation just ran
   - Update `Next reconciliation due: Session [N + 5]`
   - Update `last_sync_turn` and `current_turn`

5. **Run the visualizer update** (if `update-visualizer.sh` is present):

   ```bash
   ./update-visualizer.sh
   ```

6. **Report the diff** — announce what changed from the previous ENGRAM.md:
   - Items moved to completed
   - New items found that were missed
   - Duplicate items removed
   - Number of sessions processed
