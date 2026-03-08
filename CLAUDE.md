# CLAUDE.md — Project Instructions

## Project: [PROJECT NAME]

**Primary Author:** [YOUR NAME] ([email@example.com])
**Primary Agent:** [Claude / ChatGPT / Gemini / Cursor / Antigravity]
**Created:** [YYYY-MM-DD]
**Infrastructure Version:** 4.0

---

## On Every Session Start

**Context budget:** Total tokens read at session start must not exceed **4,000 tokens**. Read at most 2 files.

1. **Read STATE.md first.** It contains the current project state, active threads, and context needed for continuity across devices and sessions.
2. **Read ENGRAM.md** for the processed summary of all brainstorming sessions.
3. **Do NOT read ENGRAM-LOG.md at session start.** It is the raw archive. Use ENGRAM-INDEX.md to look up specific past entries only when needed.
4. **Check ENGRAM-INDEX.md** only when you need to retrieve a specific past decision or thread — use the tag to find the exact log timestamp, then read only that block.
5. **Announce your understanding** of the current state so Alex can correct any drift before work begins.

**Bad:** Reading ENGRAM-LOG.md at session start "to catch up".
**Good:** Reading STATE.md (400–800 tokens) + ENGRAM.md (600–1,200 tokens), then announcing the session status from those two files alone.

---

## Brainstorming Protocol

When Alex initiates a brainstorming session:

1. **Log the prompt verbatim** — Copy the exact prompt into `ENGRAM-LOG.md`, timestamped, as a new entry under the current session. Tag with the session mode (brainstorm / implementation / review).
2. **Generate the response** — Think, research, compute, create files as needed.
3. **Log the response verbatim** — Copy the full response (including file links) into `ENGRAM-LOG.md`, timestamped, immediately after the prompt entry. Tag with the agent/model name that generated it.

**Important:** Steps 4-5 below are NOT required after every single exchange. They happen at checkpoints (see Checkpoint Protocol below).

1. **Update ENGRAM.md** — Process the log to update the actionable summary: tasks, decisions, objections, priorities, open questions. Group items by workstream.
2. **Update STATE.md** — Reflect any changes to project state, active threads, or context.

### Verbatim Logging Rules

- **Never paraphrase prompts or responses when logging.** Copy-paste exactly, including all markdown, code blocks, file links, and formatting.
- **Failure mode:** If exact verbatim copy is technically impossible (e.g., response was too long to reproduce), write `[PARAPHRASE]` at the start of the response field and summarize as faithfully as possible. Never silently paraphrase without flagging it.
- Every log entry must include: timestamp, session mode, and agent/model name.

**Bad:** `response: | Claude suggested using Supabase.`
**Good:** `response: | [PARAPHRASE] Full architecture comparison given — Supabase recommended over Firebase due to free tier, Postgres compatibility, and real-time subscriptions. See session 1 for full text.`

---

## Quick Commands

| Command | What It Does |
| --- | --- |
| **"checkpoint"** | Sync all docs: log, summary, and state |
| **"status"** / **"where are we"** | Read STATE.md, give a concise 4-8 line summary of current state |
| **"reconcile now"** | Immediately rebuild ENGRAM.md from the full log |

Aliases: "update docs", "process session", "sync state" all trigger a checkpoint.

---

## Checkpoint Protocol

Alex can trigger a checkpoint at any time using the commands above.

When a checkpoint is triggered:

1. Append any unlogged exchanges to ENGRAM-LOG.md
2. Update ENGRAM.md with new items grouped by workstream
3. Update STATE.md — especially "What Just Happened" and "Active Threads"
4. Confirm: "Log, summary, and state files updated."

### End-of-Session Checklist

At the end of every session (when Alex says goodbye, ends the conversation, or explicitly closes out), you MUST:

1. Append any unlogged prompt/response pairs to ENGRAM-LOG.md
2. Update ENGRAM.md with new actionable items, decisions, and questions
3. Update STATE.md — "What Just Happened" (last 2 sessions max), "Active Threads", and session counter
4. Confirm to Alex: **"Session [N] complete. Log, summary, and state updated."**

If you are unable to complete any step, say so explicitly.

---

## Periodic Reconciliation

**Every 5 sessions**, regenerate ENGRAM.md from scratch using ENGRAM-LOG.md as the source of truth. This prevents drift between the log and the summary. Announce when reconciliation is due.

Alex can also force an immediate reconciliation at any time by saying **"reconcile now"**.

---

## STATE.md Discipline

STATE.md must stay focused and compact. It is NOT a history file.

**STATE.md should contain:**

- What happened in the last 1-2 sessions (not further back)
- Currently active threads/workstreams
- Current priorities and blockers
- Key context any agent needs right now

**STATE.md should NOT contain:**

- Full session history (that belongs in the log)
- Complete file inventories (keep to actively-relevant files only)
- Resolved decisions (those belong in DECISIONS.md)

**Size ceiling:** If STATE.md exceeds ~100 lines, prune it. Move historical content to the log or DECISIONS.md.

---

## Session Modes

Tag every log entry with one of these modes:

| Mode | Use When |
| --- | --- |
| `brainstorm` | Generating ideas, exploring options, open-ended thinking |
| `implementation` | Writing code, creating files, building artifacts |
| `review` | Evaluating work, cross-model review, critique sessions |
| `admin` | Updating docs, reconciliation, infrastructure maintenance |

---

## File Structure

```text
your-project/
├── CLAUDE.md                  ← You are here. Project instructions for all agents.
├── AGENTS.md                  ← Agent-specific configurations and delegation rules.
├── README.md                  ← Project overview for human readers.
├── STATE.md                   ← Current project state. READ FIRST every session.
├── ENGRAM-LOG.md              ← Verbatim prompt/response log. Append-only.
├── ENGRAM-INDEX.md            ← Tag map for targeted log retrieval.
├── ENGRAM.md                  ← Processed actionable summary of all sessions.
├── DECISIONS.md               ← Decision log with rationale and timestamps.
├── HANDOFF.md                 ← Dense resume doc for fast session restart (when present).
├── update-visualizer.sh       ← Regenerates VISUALIZER.html from live project data.
├── VISUALIZER.html            ← Interactive project dashboard. Open in any browser.
├── .agents/workflows/         ← 10 workflow definitions the AI follows as slash commands.
└── .gitignore                 ← Git ignore rules.
```

---

## Core Principles

- **Preserve everything.** Nothing from a brainstorming session should be lost. The log is append-only.
- **Separate raw from processed.** ENGRAM-LOG.md is the source of truth. ENGRAM.md is the working summary.
- **State is portable.** STATE.md must contain everything needed to resume work on any device — but nothing more. Keep it lean.
- **Be honest.** Flag problems, circularities, and weaknesses as clearly as strengths. Alex values intellectual honesty over cheerleading.
- **Label claim levels.** Always distinguish: established fact, working hypothesis, conjecture, open question.
- **Attribute everything.** Every log entry is tagged with the agent/model that produced it and the session mode.

---

## Model-Specific Notes

### Claude (claude.ai, Claude Code)

Reads this file natively as project instructions. No special handling needed.

### ChatGPT

Paste the following at the start of each session:

```text
Context files for this session:
1. STATE.md — read first, contains current state
2. ENGRAM.md — actionable summary
I'll paste both below. Follow the protocol in CLAUDE.md.
[paste STATE.md]
[paste ENGRAM.md]
```

Log entries should still follow the YAML format. Use "ChatGPT (gpt-N)" as the agent name.

### Gemini

Upload STATE.md and ENGRAM.md as files at session start. Alternatively, paste both into the context window with the same framing as ChatGPT above. Use "Gemini (model-version)" as the agent name.

### Cursor / Antigravity

Open the project folder. Both tools read this file automatically as project context. Workflows in `.agents/workflows/` are available as slash commands.
