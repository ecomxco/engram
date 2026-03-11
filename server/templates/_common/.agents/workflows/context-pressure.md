---
description: Run a context handoff ceremony when the context window is getting tight — preserves full state so a new session can resume immediately with perfect context
---
# Context Pressure — Handoff Ceremony

**Triggers (run this workflow when you see any of these):**

- User says: "context is getting tight", "we're getting long", "start fresh", "new session soon", "running out of space"
- Agent self-trigger: the agent estimates the context window is >75% consumed
- Agent self-trigger: responses are being noticeably truncated or the agent is struggling to hold earlier context
- Preventative: any session longer than ~30 turns that hasn't had a checkpoint in the last 10 turns

> **Do not wait until the context window is full.** A handoff written at 95% capacity will be incomplete. Run this at 75–80%.

---

## Steps

1. **Run a full checkpoint** — log all unlogged turns, update all files:

   > Follow the `/checkpoint` workflow completely (steps 1–6 including visualizer and git commit).

2. **Run the handoff** — write `HANDOFF.md`:

   > Follow the `/handoff` workflow completely.

3. **Announce the ceremony** using this exact message:

   ```text
   ⚠️  Context Pressure Detected

   I've run a full checkpoint and written HANDOFF.md with your exact resume point.
   Safe to close this session whenever you're ready.

   When you open a new session:
   1. I'll read HANDOFF.md first — context restores in seconds.
   2. I'll announce exactly where we stopped and what the next step is.
   3. HANDOFF.md will be archived and work resumes.

   You can close this window now.
   ```

4. **Stop working.** The next substantive work happens in the new session.

---

## Prevention

The best way to avoid context pressure is a steady checkpoint rhythm. If `/checkpoint` runs every 5–10 turns (governed by `sync_threshold` in `STATE.md`), writing `HANDOFF.md` takes seconds — the log is already current.

Reduce the `sync_threshold` to `3` for long research sessions to increase checkpoint frequency.

---

## New Session Recovery

When opening the next session after a context handoff:

1. `HANDOFF.md` exists → read it first (before STATE.md) — see `/new-session`
2. Announce resume point so user can confirm or correct
3. Archive: `mv HANDOFF.md HANDOFF-[YYYY-MM-DD].md`
4. Work resumes from the announced next step
