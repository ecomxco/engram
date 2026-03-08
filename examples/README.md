# Examples

## `after-10-sessions/`

A realistic example of what a Engram project looks like after 10 sessions of active use. The example project is a personal "Smart Home Energy Dashboard" — a solo developer working with Claude to design and build an energy monitoring tool.

**What to look at:**

- **STATE.md** — Notice how lean it is. Only the last 1-2 sessions, active threads, and current priorities. Not a history file.
- **ENGRAM.md** — The actionable summary organized by workstream. Open problems are prioritized. Tasks have clear status.
- **DECISIONS.md** — 9 decisions with full rationale and alternatives considered. This is what prevents re-litigating settled questions.
- **ENGRAM-LOG.md** — The verbatim log. Sessions 3-4 and 7-8 are truncated in this example for brevity, but in a real project every exchange would be here in full.
- **AGENTS.md** — Shows two agents in the registry (Claude as primary, ChatGPT for a one-off review).

**Things to notice:**

1. The reconciliation at session 5 and session 10 — where ENGRAM.md gets rebuilt from the log to correct drift.
2. How decisions reference session numbers, making them traceable back to the log.
3. The "checkpoint" command in action — Alex says it, Claude syncs all the docs.
4. Honest assessments: Claude flags tradeoffs clearly (e.g., ML disaggregation accuracy, Recharts performance concerns) rather than cheerleading every choice.
