---
description: Execute a checkpoint — sync the log, summary, and state files at any point during or after a session
---
# Checkpoint

Run this when the user says "checkpoint", "update docs", "process session", or "sync state".

## Steps

1. **Append any unlogged exchanges to `ENGRAM-LOG.md`**
   - Add a YAML block for every prompt/response pair that has not yet been logged this session.
   - Use the format defined in `ENGRAM-LOG.md` (ML-structured YAML with timestamp, turn, agent, confidence, prompt, response, deliverables, gaps_identified).
   - If this is an Autonomic Action Agent (e.g., Antigravity), read the current `STATE.md` YAML frontmatter to get `current_turn`, then append with the correct turn number.

2. **Update `ENGRAM.md`** with new items discovered this session:
   - New open problems (with P0/P1/P2 severity)
   - New tasks / next steps
   - New decisions made (reference to DECISIONS.md entry)
   - New open questions

3. **Update `DECISIONS.md`** with any new decisions made this session, following the existing format:

   ```markdown
   ## Decision N — [Title]
   **Date:** YYYY-MM-DD
   **Session:** N
   **Context:** ...
   **Decision:** ...
   **Alternatives Considered:** ...
   **Rationale:** ...
   **Status:** [Implemented / Pending]
   ```

4. **Update `STATE.md`**:
   - "What Just Happened" — overwrite with the last 1-2 sessions only
   - "Active Threads" — reflect current state
   - "Current Priorities" — update if changed
   - "Blockers" — add/remove as resolved
   - Increment `current_turn` in the YAML frontmatter
   - Update `last_sync_turn` to match `current_turn`
   - Update "Total sessions" counter if a new session just completed

5. **Run the visualizer update** (if `update-visualizer.sh` is present):

   ```bash
   ./update-visualizer.sh
   ```

6. **Commit to git** (if available):

   > Follow the `/git-commit-turn` workflow. It silently skips if the project is not a git repository.

7. **Confirm** with a single line: `"Log, summary, and state updated. Session [N] checkpoint complete."`
