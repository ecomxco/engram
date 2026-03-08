# AGENTS.md — Agent Configuration

## Project: Smart Home Energy Dashboard
**Last Updated:** 2026-02-12 19:45:00 UTC

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
| Claude (claude-opus-4-6) | Anthropic | 2026-01-15 | Primary agent, sessions 1-10 |
| ChatGPT (gpt-5.2) | OpenAI | 2026-02-05 | One-off review of dashboard component architecture (session 8) |

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
4. Agent announces what it understands the current state to be, so Alex can correct any drift.
