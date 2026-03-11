---
description: Send a specific piece of work to a second AI agent for cross-platform review, then log the review verbatim
---
# Agent Review

Run this when the user says "get a second opinion", "cross-check this with [agent]", or "run agent review".

This is the structured protocol for multi-agent quality control — the most powerful pattern in the Engram system.

## Steps

1. **Identify what's being reviewed** — ask the user if unclear:
   - A specific file or diff
   - A decision or plan
   - A section of code
   - An entire session output

2. **Log the outgoing review request in `ENGRAM-LOG.md`** before sending:

   ```yaml
   - timestamp: "YYYY-MM-DD HH:MM UTC"
     turn: [N]
     agent: "[Your name]"
     confidence: 0.85
     prompt: |
       [Describe what was sent for review and to which agent]
     response: |
       [Review request prepared — awaiting response from [Agent]]
     deliverables: []
     gaps_identified:
       - "Awaiting external review — do not close this thread"
   ```

3. **User sends to the target agent** (ChatGPT, Gemini, Grok, Cursor, etc.) with the prompt that was logged.

4. **Log the full review response verbatim** when the user returns with it:

   ```yaml
   - timestamp: "YYYY-MM-DD HH:MM UTC"
     turn: [N+1]
     agent: "[ReviewerName] (via user)"
     confidence: null
     prompt: |
       [The prompt that was sent to the reviewer]
     response: |
       [Exact verbatim response from the reviewer — do not summarize]
     deliverables: []
     gaps_identified: []
   ```

5. **Process the review** — for each issue raised:
   - **P0/P1 severity**: add to `ENGRAM.md` Open Problems immediately
   - **Decision**: add to `DECISIONS.md` (status: Pending if not yet resolved)
   - **Task**: add to `ENGRAM.md` Tasks
   - **Accepted change**: implement it and note in the same session log

6. **Update `AGENTS.md` registry** — add a row for the reviewer if not already listed:

   | Agent           | Provider | First Used | Notes                      |
   |-----------------|----------|------------|----------------------------|
   | ChatGPT (gpt-5) | OpenAI   | YYYY-MM-DD | One-off review of [topic]  |

7. **Run checkpoint** — call `/checkpoint` to sync all files.
