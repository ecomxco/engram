---
description: Atomically commit all engram-tracked files to git after each logged turn or checkpoint — creates a versioned snapshot the LLM can query efficiently via git log
---
# Git Commit Turn

Called automatically by `/autonomic-engram-logger` (after threshold sync) and `/checkpoint` (after the visualizer update). Also callable directly: "commit this", "git commit", "snapshot state".

---

## Opt-In Guard

This workflow silently does nothing if git is not initialized. No configuration required — just run it and it self-detects:

```bash
git rev-parse --git-dir > /dev/null 2>&1 || exit 0
```

---

## Commit Message Format

```text
engram[S{session} T{turn}]: {mode} — {one-line summary}
```

**Examples:**

- `engram[S12 T47]: implementation — Added Redis caching layer`
- `engram[S3 T14]: brainstorm — Explored authentication alternatives`
- `engram[S7 T0]: admin — Checkpoint: log, summary, and state synced`

**Rules:**

- `S{N}` = current session number from `STATE.md` ("Total sessions" field)
- `T{N}` = `current_turn` from `STATE.md` YAML frontmatter; use `0` for checkpoint commits with no specific turn
- `{mode}` = one of: `brainstorm`, `implementation`, `review`, `admin`
- `{summary}` = one sentence, present tense, ≤72 chars

---

## Steps

1. **Guard check:**

   ```bash
   git rev-parse --git-dir > /dev/null 2>&1 || { echo "Not a git repo — skipping engram commit."; exit 0; }
   ```

2. **Read session and turn from STATE.md:**
   - Session = the number after "Total sessions:" in STATE.md
   - Turn = `current_turn` in the YAML frontmatter at the top of STATE.md

3. **Stage only engram-tracked files** (never stage user project code):

   ```bash
   git add STATE.md ENGRAM.md ENGRAM-LOG.md DECISIONS.md ENGRAM-INDEX.md 2>/dev/null
   # Also stage HANDOFF.md if it exists
   [ -f HANDOFF.md ] && git add HANDOFF.md
   ```

4. **Commit with the structured message:**

   ```bash
   git diff --cached --quiet && echo "Nothing to commit — skipping." && exit 0
   git commit -m "engram[S${SESSION} T${TURN}]: ${MODE} — ${SUMMARY}"
   ```

5. **Confirm:** Output `"Git snapshot: engram[S${SESSION} T${TURN}] committed."` as a single line.

---

## LLM Retrieval via Git Log

The structured format makes `git log` a free secondary index. No additional files needed:

```bash
# All commits for session 12
git log --oneline --grep='engram\[S12'

# Every checkpoint/admin commit
git log --oneline --grep='engram.*admin'

# Show what changed in a specific commit
git show <hash> --stat

# Diff two checkpoints
git diff <hash1> <hash2> -- ENGRAM.md
```

The commit hash can optionally be recorded in `ENGRAM-INDEX.md` alongside the timestamp for surgical context loading:

```text
[decision_7]: 2026-01-22T14:32:00Z — Session 3, turn 7 — commit: a3f9c12 — Chose Redis over Memcached
```
