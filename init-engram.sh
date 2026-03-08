#!/bin/bash
# ============================================================================
# Engram Initializer v3.0
# Creates the full documentation infrastructure for a new engram project.
#
# Usage:
#   ./init-engram.sh
#   ./init-engram.sh --name "My Project" --author "Jane" --email "jane@co.com"
#   ./init-engram.sh --dir /path/to/folder
#   ./init-engram.sh --force          # overwrite existing files
#
# Creates: CLAUDE.md, AGENTS.md, README.md, STATE.md,
#          ENGRAM-LOG.md, ENGRAM.md, DECISIONS.md, ENGRAM-INDEX.md,
#          .agents/workflows/autonomic-engram-logger.md, .gitignore
#
# Changes from v3.0 (v4.0 Masterclass):
#   - Introduced ML-Structured YAML logging and confidence routing
#   - Added the State Manifest trigger block for silent background syncing
#   - Added ENGRAM-INDEX.md for High-Density Context Retrieval
#   - Explicit Autonomic Logging scripts for non-UI agents
#   - Complete rebrand: Brainstorm Architecture → Engram
#   - File naming: BRAINSTORM-LOG.md → ENGRAM-LOG.md, BRAINSTORM.md → ENGRAM.md
#   - Tagline: "Give your AI conversations a memory."
#   - All references updated to reflect new branding
#   - Session mode "brainstorm" retained (describes activity, not tool)
#   - Version bump to major 4.0 for Masterclass Context Architecture
#
# Previous changes (retained from v2.1):
#   - Perl \Q...\E escaping for PROJECT_DESC (safe against $1, \, metacharacters)
#   - Quick commands table: "status", "where are we", "reconcile now"
#   - Session counter source-of-truth clarification in STATE.md
# ============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────
# _UNSET sentinel distinguishes "not provided" from "explicitly set to empty"
_UNSET="__UNSET__"
PROJECT_DIR="."
PROJECT_NAME="$_UNSET"
AUTHOR_NAME="$_UNSET"
AUTHOR_EMAIL="$_UNSET"
PROJECT_DESC="$_UNSET"
FORCE=false
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
DATE_SHORT=$(date -u '+%Y-%m-%d')
VERSION="4.0"

# ── Parse arguments ───────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --name) PROJECT_NAME="$2"; shift 2 ;;
    --author) AUTHOR_NAME="$2"; shift 2 ;;
    --email) AUTHOR_EMAIL="$2"; shift 2 ;;
    --desc) PROJECT_DESC="$2"; shift 2 ;;
    --dir) PROJECT_DIR="$2"; shift 2 ;;
    --force) FORCE=true; shift ;;
    -h|--help)
      cat << 'HELPTEXT'
Engram Initializer v3.0

Usage: init-engram.sh [OPTIONS]

Options:
  --name NAME     Project name (will prompt if not provided)
  --author NAME   Author name (will prompt if not provided)
  --email EMAIL   Author email (optional)
  --desc DESC     One-line project description (will prompt if not provided)
  --dir DIR       Target directory (default: current directory)
  --force         Overwrite existing files without prompting
  -h, --help      Show this help message

Creates 8 files:
  CLAUDE.md            Project instructions for Claude
  AGENTS.md            Agent configurations and delegation rules
  README.md            Project overview for human readers
  STATE.md             Multi-device state preservation
  ENGRAM-LOG.md        Verbatim structured YAML session log
  ENGRAM-INDEX.md      Context Retrieval Table of Contents
  ENGRAM.md            Processed actionable summary
  DECISIONS.md         Decision log with rationale
  .agents/workflows/... Autonomic sync scripts
  .gitignore           Git ignore rules for the project

Examples:
  ./init-engram.sh
  ./init-engram.sh --name "Quantum Notes" --author "Alice"
  ./init-engram.sh --dir ~/projects/new-idea --force
HELPTEXT
      exit 0
      ;;
    *) echo "Error: Unknown option: $1"; echo "Use -h for help."; exit 1 ;;
  esac
done

# ── Interactive prompts for fields not provided via arguments ──────────────
if [ "$PROJECT_NAME" = "$_UNSET" ]; then
  read -rp "Project name: " PROJECT_NAME
fi
if [ "$AUTHOR_NAME" = "$_UNSET" ]; then
  read -rp "Author name: " AUTHOR_NAME
fi
if [ "$AUTHOR_EMAIL" = "$_UNSET" ]; then
  read -rp "Author email (optional, press Enter to skip): " AUTHOR_EMAIL
fi
if [ "$PROJECT_DESC" = "$_UNSET" ]; then
  read -rp "One-line project description: " PROJECT_DESC
fi

# ── Validate required fields ─────────────────────────────────────────────
if [ -z "$PROJECT_NAME" ] || [ -z "$AUTHOR_NAME" ]; then
  echo "Error: Project name and author name are required."
  exit 1
fi

# ── Create target directory if needed ─────────────────────────────────────
mkdir -p "$PROJECT_DIR"

# ── Overwrite protection ─────────────────────────────────────────────────
GENERATED_FILES=("CLAUDE.md" "AGENTS.md" "README.md" "STATE.md" "ENGRAM-LOG.md" "ENGRAM.md" "DECISIONS.md" "ENGRAM-INDEX.md" ".gitignore")
EXISTING_COUNT=0
EXISTING_LIST=""

for f in "${GENERATED_FILES[@]}"; do
  if [ -f "$PROJECT_DIR/$f" ]; then
    EXISTING_COUNT=$((EXISTING_COUNT + 1))
    EXISTING_LIST="${EXISTING_LIST}  - $f\n"
  fi
done

if [ "$EXISTING_COUNT" -gt 0 ] && [ "$FORCE" = false ]; then
  echo "Warning: The following files already exist in $PROJECT_DIR:"
  printf "%b" "$EXISTING_LIST"
  echo ""
  read -rp "Overwrite? This will destroy existing content. (y/N): " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Aborted. Use --force to skip this check."
    exit 0
  fi
fi

# ── Helpers ───────────────────────────────────────────────────────────────
EMAIL_LINE=""
if [ -n "$AUTHOR_EMAIL" ]; then
  EMAIL_LINE=" ($AUTHOR_EMAIL)"
fi

# Note: PROJECT_DESC is inserted via sed after file creation to avoid heredoc
# expansion of any $ characters in the description.
PLACEHOLDER_DESC="__PROJECT_DESC_PLACEHOLDER__"

DIR_BASENAME=$(basename "$PROJECT_DIR")
if [ "$DIR_BASENAME" = "." ]; then
  DIR_BASENAME=$(basename "$(pwd)")
fi

echo ""
echo "Creating engram architecture in: $PROJECT_DIR"
echo "  Project: $PROJECT_NAME"
echo "  Author:  $AUTHOR_NAME$EMAIL_LINE"
echo "  Version: v$VERSION"
echo ""

# ── CLAUDE.md ──────────────────────────────────────────────────────────────
cat > "$PROJECT_DIR/CLAUDE.md" << 'ENDOFFILE'
# CLAUDE.md — Project Instructions for Claude

## Project: PROJECT_NAME_PLACEHOLDER
**Primary Author:** AUTHOR_NAME_PLACEHOLDER
**Computational Analysis:** Claude
**Created:** DATE_SHORT_PLACEHOLDER
**Infrastructure Version:** VERSION_PLACEHOLDER

---

## On Every Session Start

## 🚨 MANDATORY FIRST STEP FOR ALL AGENTS 🚨
1. **Read `STATE.md` first before performing any tasks or analyzing any other files.** 
   `STATE.md` contains the active Engram session context, current state, active threads, and blockers across all devices and AI platforms.
2. **Verify your presence in `AGENTS.md`.** 
   If this is your first time interacting with this project, you MUST add yourself to the `Agent Registry` in `AGENTS.md` before taking action.

## 📝 AUTONOMIC LOGGING PROTOCOL 📝
Unlike chat interfaces that auto-log the UI, **Autonomic Action Agents** (like Antigravity) DO NOT naturally log individual messages to files without explicit instruction.
If you are an agent capable of executing bash commands or editing files autonomously during empty turns, you MUST:
1. Treat `ENGRAM-LOG.md` as an attached database table for your session.
2. Directly append the user's prompt and your substantive response to `ENGRAM-LOG.md` internally during your tool run loop, treating it as a required step before handing control back to the user.

## 🔄 SILENT SYNC PROTOCOL (Background Indexing) 🔄
To make Engram work without manual updates, all agents must adhere to the **State Manifest tracking header** located at the top of `STATE.md` (e.g., `current_turn`, `last_sync_turn`, `sync_threshold`).
1. **Increment:** Add +1 to `current_turn` in `STATE.md` on every single reply you generate.
2. **Evaluate:** If `current_turn - last_sync_turn >= sync_threshold`, you are **REQUIRED** to execute a background sync BEFORE answering the user's prompt.
3. **Execution (Chat UI Agents like Claude):** When the threshold is met, you must read `ENGRAM-LOG.md`, update `ENGRAM.md`, `DECISIONS.md`, and `ENGRAM-INDEX.md`. Update `last_sync_turn` in `STATE.md`, and output a brief silent XML block (`<engram_sync>Updated...</engram_sync>`) at the start of your response.
4. **Execution (Autonomic Agents like Antigravity):** Your `autonomic-engram-logger` workflow will handle this threshold logic automatically.

---

## Brainstorming Protocol

When AUTHOR_PLACEHOLDER initiates a brainstorming session:

1. **Log the prompt verbatim** — Copy the exact prompt into `ENGRAM-LOG.md` as a YAML object. Tag with the session mode.
2. **Generate the response** — Think, research, compute, create files as needed.
3. **Evaluate the gap** — Identify any blindspots, unmet constraints, or necessary assumptions. Assign your logic a confidence score (0.0 - 1.0).
4. **Log the response verbatim** — Copy the full response (including explicit file deliverables) into the YAML object in `ENGRAM-LOG.md`.

**Important:** Steps 5-6 below are NOT required after every single exchange. They happen automatically at the Threshold Sync points.

5. **Update ENGRAM.md & ENGRAM-INDEX.md** — Distill the log to update the actionable summary: tasks, decisions, objections, and the Table of Contents pointer.
6. **Update STATE.md** — Reflect any changes to project state, active threads, or the YAML tracker.

### ML-Structured Logging Rules

- **Never paraphrase prompts or responses when logging.** Capture exact context.
- Every log entry must adhere exactly to the YAML schema specified in `ENGRAM-LOG.md`.
- Explicitly list any deliverables or edited files.

---

## Quick Commands

| Command | What It Does |
|---------|-------------|
| **"checkpoint"** | Sync all docs: log, summary, and state |
| **"status"** / **"where are we"** | Read STATE.md, give a concise 4-8 line summary of current state |
| **"reconcile now"** | Immediately rebuild ENGRAM.md from the full log |

Aliases: "update docs", "process session", "sync state" all trigger a checkpoint.

---

## Checkpoint Protocol

AUTHOR_PLACEHOLDER can trigger a checkpoint at any time using the commands above.

When a checkpoint is triggered:

1. Append any unlogged exchanges to ENGRAM-LOG.md
2. Update ENGRAM.md with new items grouped by workstream
3. Update STATE.md — especially "What Just Happened" and "Active Threads"
4. Confirm: "Log, summary, and state files updated."

### End-of-Session Checklist

At the end of every session (when AUTHOR_PLACEHOLDER says goodbye, ends the conversation, or explicitly closes out), you MUST:

1. Append any unlogged prompt/response pairs to ENGRAM-LOG.md
2. Update ENGRAM.md with new actionable items, decisions, and questions
3. Update STATE.md — "What Just Happened" (last 2 sessions max), "Active Threads", and session counter
4. Confirm to AUTHOR_PLACEHOLDER: **"Session [N] complete. Log, summary, and state updated."**

If you are unable to complete any step, say so explicitly.

---

## Periodic Reconciliation

**Every 5 sessions**, regenerate ENGRAM.md from scratch using ENGRAM-LOG.md as the source of truth. This prevents drift between the log and the summary. Announce when reconciliation is due.

AUTHOR_PLACEHOLDER can also force an immediate reconciliation at any time by saying **"reconcile now"**.

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
|------|----------|
| `brainstorm` | Generating ideas, exploring options, open-ended thinking |
| `implementation` | Writing code, creating files, building artifacts |
| `review` | Evaluating work, cross-model review, critique sessions |
| `admin` | Updating docs, reconciliation, infrastructure maintenance |

---

## File Structure

```
DIR_BASENAME_PLACEHOLDER/
├── CLAUDE.md                  ← You are here. Project instructions for Claude.
├── AGENTS.md                  ← Agent-specific configurations and delegation rules.
├── README.md                  ← Project overview for human readers.
├── STATE.md                   ← Current project state (Contains State Manifest Header). READ FIRST.
├── ENGRAM-LOG.md              ← Verbatim prompt/response log. Append-only YAML format.
├── ENGRAM-INDEX.md            ← High-density Table of Contents. Search this before reading LOGs.
├── ENGRAM.md                  ← Processed actionable summary of all sessions.
├── DECISIONS.md               ← Decision log with rationale and timestamps.
├── VISUALIZER.html            ← Interactive project dashboard — open in any browser.
├── update-visualizer.sh       ← Regenerates VISUALIZER.html from live engram data.
├── engram-watch.sh            ← Background watcher: auto-updates dashboard on file changes.
├── .agents/workflows/         ← Autonomic agent scripts (e.g., autonomic-engram-logger.md)
└── .gitignore                 ← Git ignore rules.
```

---

## Core Principles

- **Preserve everything.** Nothing from a brainstorming session should be lost. The log is append-only.
- **Separate raw from processed.** ENGRAM-LOG.md is the source of truth. ENGRAM.md is the working summary.
- **State is portable.** STATE.md must contain everything needed to resume work on any device — but nothing more. Keep it lean.
- **Be honest.** Flag problems, circularities, and weaknesses as clearly as strengths. AUTHOR_PLACEHOLDER values intellectual honesty over cheerleading.
- **Label claim levels.** Always distinguish: established fact, working hypothesis, conjecture, open question.
- **Attribute everything.** Every log entry is tagged with the agent/model that produced it and the session mode.
ENDOFFILE

# ── AGENTS.md ──────────────────────────────────────────────────────────────
cat > "$PROJECT_DIR/AGENTS.md" << 'ENDOFFILE'
# AGENTS.md — Agent Configuration

## Project: PROJECT_NAME_PLACEHOLDER
**Last Updated:** TIMESTAMP_PLACEHOLDER

---

## Primary Agent: Claude (Anthropic)

**Role:** Computational analyst, brainstorm partner, documentation system maintainer.

**Constraints:**
- Knowledge cutoff: see agent's system prompt (changes with model updates; always search for anything beyond the stated cutoff)
- Cannot run persistent background processes between sessions
- Relies on STATE.md for continuity across sessions and devices
- Log verbatim fidelity is best-effort, not guaranteed — flag any failures explicitly

**Capabilities to verify periodically:**
- Web search availability
- File creation and editing
- Code execution
- Image generation/analysis

*When agent capabilities change (new model version, new tools), update this section.*

---

## Agent Registry

Track every agent/model used in this project. Add rows as new agents participate.

| Agent | Provider | First Used | Notes |
|-------|----------|------------|-------|
| Claude | Anthropic | DATE_SHORT_PLACEHOLDER | Primary agent |

---

## Multi-Agent Review Protocol

When sending work for cross-platform review:

1. **Before:** Log the review request in ENGRAM-LOG.md with the version sent and the prompt used. Tag as mode: `review`.
2. **After:** Log the full review response verbatim. Tag with agent name, model version, and timestamp.
3. **Process:** Update ENGRAM.md with extracted issues, categorized by severity (P0/P1/P2).
4. **Resolve:** For each issue, document the response (adopted, rejected with rationale, deferred) in DECISIONS.md.

---

## Session Handoff Protocol

When switching devices or starting a new session with any agent:

1. Agent reads STATE.md to restore context.
2. Agent reads ENGRAM.md for the current actionable summary.
3. Agent reads ENGRAM-LOG.md only if deeper context is needed for a specific thread.
4. Agent announces what it understands the current state to be, so AUTHOR_PLACEHOLDER can correct any drift.
ENDOFFILE

# ── README.md ──────────────────────────────────────────────────────────────
cat > "$PROJECT_DIR/README.md" << 'ENDOFFILE'
# PROJECT_NAME_PLACEHOLDER

PROJECT_DESC_PLACEHOLDER

**Author:** AUTHOR_NAME_PLACEHOLDER
**Computational Analysis:** Claude (Anthropic)
**Created:** DATE_SHORT_PLACEHOLDER
**Infrastructure:** Engram v4.0 (Masterclass Architecture)

---

## Getting Started

If you're opening this project for the first time:

1. Read this file for an overview of what's here and why.
2. Open a new Claude session in this folder.
3. Claude will read STATE.md automatically and announce the current project state.
4. Start brainstorming. Claude handles the documentation infrastructure.

If you're an AI agent, read CLAUDE.md for your operating instructions.

---

## Project Infrastructure

| File | Purpose | Mutability |
|------|---------|------------|
| `CLAUDE.md` | Instructions for Claude — operating protocol | Rarely updated |
| `AGENTS.md` | Agent configurations and registry | Updated when agents change |
| `README.md` | This file — project overview | Rarely updated |
| `STATE.md` | Current project state & Manifest Tracker | Updated every session |
| `ENGRAM-LOG.md` | Verbatim log of all sessions in ML YAML | Append-only |
| `ENGRAM-INDEX.md` | High-density Table of Contents | Updated at thresholds |
| `ENGRAM.md` | Processed actionable summary | Updated at thresholds |
| `DECISIONS.md` | Decision log with rationale and timestamps | Append-only |
| `.agents/workflows/`| Autonomic Action Agent scripts | Rarely updated |
| `.gitignore` | Git ignore rules | Rarely updated |

---

## Assumptions & Limitations

This architecture is designed for:
- Solo or small-team research and ideation
- AI-assisted brainstorming with one primary human author
- Markdown-based, file-based workflows
- Projects up to ~50 sessions before needing structural evolution

It assumes:
- Sessions are discrete (clear start/end)
- One device is active at a time (no simultaneous multi-device editing)
- Markdown is sufficient as the storage medium
- The AI agent can reliably follow the protocol (but includes checkpoints as a safety net)

**When to evolve:** If you find yourself with more than 3 active workstreams, 50+ sessions, or multiple collaborators editing simultaneously, consider adding thread tagging, a structured index, or migrating to a database-backed system.

---

## Sync & Conflict Avoidance

If using git or cloud sync (Dropbox, iCloud, etc.):
- **Always pull/sync before starting a new session.** STATE.md and ENGRAM.md are the most conflict-prone files.
- ENGRAM-LOG.md is append-only, so conflicts there are rare and easy to resolve.
- DECISIONS.md is also append-only.
- If a conflict occurs in STATE.md, prefer the more recent version and regenerate from the log if needed.

---

## Contact

AUTHOR_NAME_PLACEHOLDER
ENDOFFILE

# ── STATE.md ───────────────────────────────────────────────────────────────
cat > "$PROJECT_DIR/STATE.md" << 'ENDOFFILE'
---
last_sync_turn: 1
current_turn: 1
sync_threshold: 5
---
# STATE.md — Project State for Multi-Device Continuity

## Purpose
Read this file FIRST at the start of every new session. It contains the current active state — not history.

**Last Updated:** TIMESTAMP_PLACEHOLDER
**Updated By:** init-engram.sh (v4.0)

---

## What Just Happened (Last 1-2 Sessions Only)

**Initialization (DATE_SHORT_PLACEHOLDER):**
- Project infrastructure created (Masterclass Architecture v4.0)
- No brainstorming sessions yet

---

## Active Threads

*No active threads yet. Start a brainstorming session to populate this section.*

---

## Current Priorities

*No priorities yet.*

---

## Blockers

*None.*

---

## Key Context for Any Agent

- AUTHOR_PLACEHOLDER is the primary author. Claude is computational analyst and brainstorm partner.
- All brainstorm outputs are .md format.
- The ENGRAM-LOG.md is append-only and verbatim. Never edit past entries.
- Always read STATE.md at session start. Update it at session end or checkpoint.
- **Size discipline:** Keep this file under ~100 lines. If it's growing, prune old session summaries and resolved items.

---

## Log Rotation

Rotate ENGRAM-LOG.md when the file exceeds ~50KB or 15 sessions, whichever comes first. To rotate:
1. Rename current log: `ENGRAM-LOG-NNN.md` (e.g., ENGRAM-LOG-001.md)
2. Create a fresh ENGRAM-LOG.md
3. ENGRAM.md carries forward (it's the persistent summary)
4. Note the rotation in this file

---

## Session Counter

*The canonical session number is the Session N heading in ENGRAM-LOG.md. This counter is maintained by the agent at checkpoints and end-of-session to stay in sync.*

**Total sessions:** 0
**Last session:** None
**Next reconciliation due:** Session 5
ENDOFFILE

# ── ENGRAM-LOG.md ──────────────────────────────────────────────────────
cat > "$PROJECT_DIR/ENGRAM-LOG.md" << 'ENDOFFILE'
# ENGRAM-LOG.md — Verbatim Session Log

## Purpose
Append-only log of all sessions formatted heavily for ML/LLM structural efficiency. Every entry captures prompt veracity, semantic gaps, logic confidence, and explicit deliverables.

**Autonomic Action Agents:** You MUST explicitly append to this file formatted exactly as below during your run loop, *before* returning control.

## Entry Format (Structured Action Log)

All logs MUST be written in ML-structured YAML.

```yaml
- timestamp: "YYYY-MM-DD HH:MM UTC"
  turn: [Turn Integer]
  agent: "[Agent Name]"
  brand_persona: "[Mapped Persona or 'None']"
  confidence: [0.0 - 1.0]
  prompt: |
    [Exact prompt text here, verbatim]
  response: |
    [Exact response text here, verbatim]
  deliverables:
    - "[List of files created/modified]"
  gaps_identified:
    - "[List of assumptions, unsaid risks, or blindspots]"
```

## Log Rotation
Rotate when this file exceeds ~50KB or 15 sessions, whichever comes first. Rename to ENGRAM-LOG-NNN.md and start fresh. The processed summary (ENGRAM.md) carries forward.

---

*No sessions yet.*
ENDOFFILE

# ── ENGRAM-INDEX.md ──────────────────────────────────────────────────────
cat > "$PROJECT_DIR/ENGRAM-INDEX.md" << 'ENDOFFILE'
# ENGRAM-INDEX.md — Context Retrieval Index

## Purpose
This file prevents context-window blowout. It acts as a high-density "Table of Contents" mapping specific decisions, deliverables, and topics to exact timestamps and turns in `ENGRAM-LOG.md`. 
**Do not feed `ENGRAM-LOG.md` directly into a prompt.** Instead, an AI should search this index to find exactly which turn it needs to read, and then use `grep_search` to pull only the relevant YAML block.

**Last Updated:** TIMESTAMP_PLACEHOLDER
**Indexed Turns:** 0

---

## 🔍 Semantic Search Tags

| Tag | Turns | Description |
|---|---|---|
| `[architecture]` | 1 | Initial setup |

---

## 📂 Deliverable Index

| File / Deliverable | Created / Modified | Notes |
|---|---|---|
| `ENGRAM-INDEX.md` | Initial | Instantiated structural index |

---

## ⚠️ Blindspots & Gaps Identified

*No gaps indexed yet.*

ENDOFFILE

# ── ENGRAM.md ──────────────────────────────────────────────────────
cat > "$PROJECT_DIR/ENGRAM.md" << 'ENDOFFILE'
# ENGRAM.md — Processed Summary

## Purpose
Actionable distillation of all brainstorming sessions. Updated at checkpoints and end-of-session. For the raw verbatim log, see ENGRAM-LOG.md.

**Last Updated:** TIMESTAMP_PLACEHOLDER
**Sessions Processed:** 0
**Last Reconciled Against Log:** Never (due at session 5)

---

## Workstreams

*As the project develops, group related items under named workstreams here. Example:*
*- **Core Theory** — main hypothesis development*
*- **Tooling** — scripts, automation, infrastructure*
*- **Review** — cross-model critiques and responses*

---

## Open Problems — Prioritized

*No problems identified yet.*

---

## Tasks / Next Steps

*No tasks yet.*

---

## Decisions Made

*No decisions yet. See DECISIONS.md for the full decision log with rationale.*

---

## Open Questions

*No open questions yet.*
ENDOFFILE

# ── DECISIONS.md ───────────────────────────────────────────────────────────
cat > "$PROJECT_DIR/DECISIONS.md" << 'ENDOFFILE'
# DECISIONS.md — Decision Log

## Purpose
Track every significant decision with rationale, alternatives considered, and timestamp. Prevents re-litigating settled questions across sessions and devices.

**Last Updated:** TIMESTAMP_PLACEHOLDER

---

## Decision 1 — Project Infrastructure
**Date:** DATE_SHORT_PLACEHOLDER
**Context:** Initialize engram project with full documentation architecture.
**Decision:** Masterclass Architecture (CLAUDE.md, AGENTS.md, README.md, STATE.md, ENGRAM-LOG.md, ENGRAM-INDEX.md, ENGRAM.md, DECISIONS.md, .gitignore) using Engram v4.0.
**Alternatives Considered:** Wiki-based systems, database-backed tools, monolithic text logs.
**Rationale:** ML-structured YAML logging and State Manifest background indexing prevents context-window blowouts and implements Autonomic Action Agent protocol standards natively.
**Status:** Implemented

---

## Pending Decisions

*No pending decisions.*
ENDOFFILE

# ── .gitignore ─────────────────────────────────────────────────────────────
cat > "$PROJECT_DIR/.gitignore" << 'ENDOFFILE'
# Engram — .gitignore

# OS files
.DS_Store
Thumbs.db

# Editor files
*.swp
*.swo
*~
.vscode/
.idea/

# Large media (uncomment if needed)
# *.mp4
# *.mov
# *.wav

# Temporary files
*.tmp
*.bak

# Optional: Ignore archived logs if they're too large for your repo
# ENGRAM-LOG-*.md
ENDOFFILE

# autonomic-engram-logger.md is now a real file in .agents/workflows/
# and will be copied by the loop below.

# ── Copy the core workflow definitions from the engram repo (if available) ─
ENGRAM_REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$PROJECT_DIR/.agents/workflows"
for wf in checkpoint.md status.md reconcile.md update-visualizer.md handoff.md new-session.md agent-review.md log-decision.md rotate-log.md maintain-index.md autonomic-engram-logger.md context-pressure.md git-commit-turn.md; do
  if [ -f "$ENGRAM_REPO_DIR/.agents/workflows/$wf" ]; then
    cp "$ENGRAM_REPO_DIR/.agents/workflows/$wf" "$PROJECT_DIR/.agents/workflows/$wf"
  fi
done

# ── Now do the replacements ───────────────────────────────────────────────
# Replace placeholders with actual values
PROJECT_NAME_ESCAPED=$(printf '%s\n' "$PROJECT_NAME" | sed 's:[&/\]:\&:g')
AUTHOR_NAME_ESCAPED=$(printf '%s\n' "$AUTHOR_NAME" | sed 's:[&/\]:\&:g')
AUTHOR_EMAIL_ESCAPED=$(printf '%s\n' "$AUTHOR_EMAIL" | sed 's:[&/\]:\&:g')
EMAIL_LINE_ESCAPED=$(printf '%s\n' "$EMAIL_LINE" | sed 's:[&/\]:\&:g')
TIMESTAMP_ESCAPED=$(printf '%s\n' "$TIMESTAMP" | sed 's:[&/\]:\&:g')
DATE_SHORT_ESCAPED=$(printf '%s\n' "$DATE_SHORT" | sed 's:[&/\]:\&:g')
DIR_BASENAME_ESCAPED=$(printf '%s\n' "$DIR_BASENAME" | sed 's:[&/\]:\&:g')

for filepath in "$PROJECT_DIR"/*.md "$PROJECT_DIR"/.gitignore; do
  if [ -f "$filepath" ]; then
    sed -i '' "s/PROJECT_NAME_PLACEHOLDER/$PROJECT_NAME_ESCAPED/g" "$filepath"
    sed -i '' "s/AUTHOR_NAME_PLACEHOLDER/$AUTHOR_NAME_ESCAPED/g" "$filepath"
    sed -i '' "s/AUTHOR_PLACEHOLDER/$AUTHOR_NAME_ESCAPED/g" "$filepath"
    sed -i '' "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP_ESCAPED/g" "$filepath"
    sed -i '' "s/DATE_SHORT_PLACEHOLDER/$DATE_SHORT_ESCAPED/g" "$filepath"
    sed -i '' "s/DIR_BASENAME_PLACEHOLDER/$DIR_BASENAME_ESCAPED/g" "$filepath"
  fi
done

# Handle PROJECT_DESC separately with Perl for safety
export PROJECT_DESC
perl -pi -e 'BEGIN{$d=$ENV{"PROJECT_DESC"} // ""; $p="PROJECT_DESC_PLACEHOLDER"} if (($i = index($_, $p)) >= 0) { substr($_, $i, length($p), $d) }' "$PROJECT_DIR/README.md"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "Created engram architecture in: $PROJECT_DIR"
echo "  Project: $PROJECT_NAME"
echo "  Author:  $AUTHOR_NAME$EMAIL_LINE"
echo "  Version: v$VERSION"
echo ""
echo "✓ 10 files created:"
echo ""
echo "  CLAUDE.md            — Project instructions for Claude"
echo "  AGENTS.md            — Agent configurations and registry"
echo "  README.md            — Project overview with getting started guide"
echo "  STATE.md             — Multi-device state tracking and Manifest Header"
echo "  ENGRAM-LOG.md        — Verbatim session log mapped as ML-structured YAML"
echo "  ENGRAM-INDEX.md      — High-density Table of Contents mapped to Logs"
echo "  ENGRAM.md            — Processed actionable summary with workstreams"
echo "  DECISIONS.md         — Decision log with rationale"
echo "  .agents/...        — Autonomic syncing workflows"
echo "  .gitignore           — Git ignore rules"
echo ""

SCRIPT_SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/update-visualizer.sh"
if [ -f "$SCRIPT_SELF" ]; then
  cp "$SCRIPT_SELF" "$PROJECT_DIR/update-visualizer.sh"
  chmod +x "$PROJECT_DIR/update-visualizer.sh"
  echo "  update-visualizer.sh — Regenerates VISUALIZER.html from live engram data"
fi

# ── Copy VISUALIZER.html into the project ────────────────────────────────
VISUALIZER_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/VISUALIZER.html"
if [ -f "$VISUALIZER_SRC" ]; then
  cp "$VISUALIZER_SRC" "$PROJECT_DIR/VISUALIZER.html"
  echo "  VISUALIZER.html      — Interactive project dashboard (open in any browser)"
fi

# ── Copy engram-watch.sh into the project ────────────────────────────────
WATCHER_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/engram-watch.sh"
if [ -f "$WATCHER_SRC" ]; then
  cp "$WATCHER_SRC" "$PROJECT_DIR/engram-watch.sh"
  chmod +x "$PROJECT_DIR/engram-watch.sh"
  echo "  engram-watch.sh      — Background watcher: auto-updates dashboard on file changes"
fi

echo ""
echo "To start brainstorming, open a new Claude session in this folder."
echo "Claude will read STATE.md first and pick up where you left off."
echo ""
echo "Quick commands:"
echo "  'checkpoint'       — sync all docs (log, summary, state)"
echo "  'status'           — get a concise summary of where things stand"
echo "  'reconcile now'    — rebuild summary from the full log"
echo "  'handoff'          — write HANDOFF.md for device/agent switching"
echo "  'context pressure' — run handoff ceremony when context window is getting tight"
echo ""
echo "Dashboard (auto-updates every 30s when engram-watch.sh is running):"
echo "  ./engram-watch.sh --daemon && open VISUALIZER.html"
echo ""
