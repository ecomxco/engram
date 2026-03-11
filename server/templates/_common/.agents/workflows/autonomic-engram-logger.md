---
description: Ensure the AI evaluates its logic, extracts deliverables, and logs the current conversation turn as a structured object to ENGRAM-LOG.md before replying.
---
# Autonomic ML-Structured Logging & Sync

**Trigger:** Run this as the last step before replying — after formulating your response, before outputting it.

---

## 1. Evaluate

Before logging, assess:

- The user's last prompt (exact text)
- Your substantive response
- Any deliverables produced (files created, modified, or deleted)
- Blindspots or gaps in your reasoning (risks assumed, context missing)
- Your confidence in the response (0.0–1.0)

---

## 2. Append to ENGRAM-LOG.md

```yaml
- timestamp: "YYYY-MM-DD HH:MM UTC"
  turn: [current_turn from STATE.md frontmatter]
  agent: "[Your agent name and model version]"
  confidence: 0.95
  prompt: |
    [Exact user prompt verbatim — never paraphrase]
  response: |
    [Exact substantive response verbatim — if paraphrased, prefix with [PARAPHRASE]]
  deliverables:
    - "/path/to/file.md"
  gaps_identified:
    - "[Missing context, assumed risks, or open questions raised]"
```

**Verbatim fidelity rule:** Never paraphrase when logging. If exact copy is technically impossible, write `[PARAPHRASE]` at the start of the response field and summarize as faithfully as possible. Silent paraphrasing is never acceptable.

---

## 3. Check Threshold & Sync

Open `STATE.md` and read the YAML frontmatter:

```yaml
current_turn: N
last_sync_turn: M
sync_threshold: 5
```

1. Increment `current_turn` by 1
2. Evaluate: `current_turn - last_sync_turn`
3. If the result is `>= sync_threshold`, run a **background sync**:
   - Read recent YAML blocks from `ENGRAM-LOG.md` (since `last_sync_turn`)
   - Update `ENGRAM.md` — add new tasks, problems, open questions
   - Append new tags to `ENGRAM-INDEX.md` using the format: `[tag]: TIMESTAMP — Session N, turn T — description`
   - Append any new decisions to `DECISIONS.md`
   - Update `last_sync_turn` to match `current_turn`
   - Output a brief sync notice: `<engram_sync>ENGRAM.md and index updated — [N] new items</engram_sync>`
4. Save the updated `STATE.md` frontmatter

**Context budget for sync:** Read only the log entries since `last_sync_turn`. Do not load the full log.

---

## 4. Commit to Git (if available)

After syncing, atomically snapshot the current state:

> Follow the `/git-commit-turn` workflow. It silently skips if the project is not a git repository.

---

## 5. Respond

Speak your response to the user.
