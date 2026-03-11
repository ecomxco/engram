---
description: Quickly log a single decision to DECISIONS.md and ENGRAM.md without running a full checkpoint
---
# Log Decision

Run this when the user says "log this decision", "record that we decided to...", or "add to decisions".

This is a lightweight alternative to a full checkpoint — use it mid-session when a significant decision is made and you don't want to lose it before the next checkpoint.

## Steps

1. **Confirm the decision details** — extract or ask for:
   - Title (short, descriptive)
   - What was decided (the chosen option)
   - What was ruled out (alternatives)
   - Why (rationale, even if brief)

2. **Determine the next Decision ID** — count existing `## Decision N` entries in `DECISIONS.md` and increment.

3. **Append to `DECISIONS.md`**:

   ```markdown
   ## Decision [N] — [Title]
   **Date:** YYYY-MM-DD
   **Session:** [current session number]
   **Context:** [1 sentence on why this came up]
   **Decision:** [What was chosen]
   **Alternatives Considered:** (a) [alt1]. (b) [alt2].
   **Rationale:** [Why this was chosen over the alternatives]
   **Status:** Implemented
   ```

4. **Add a "Decisions Made" reference to `ENGRAM.md`** under the relevant workstream or the Decisions section.

5. **Confirm**: "Decision [N] logged: [Title]"

> **Do not** run a full checkpoint — that's overkill for a single decision mid-session. The full checkpoint at the end of the session will capture everything.
