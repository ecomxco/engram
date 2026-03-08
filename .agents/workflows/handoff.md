---
description: Generate a structured handoff document for switching devices, agents, or returning after a break
---
# Handoff

Run this when the user says "handoff", "I'm switching to [device/agent]", "create a handoff", or at the natural end of a long session.

A handoff is a dense, load-bearing document — it's what the next session reads instead of STATE.md + ENGRAM.md when context must be restored extremely fast.

**Size ceiling: 80 lines.** If you're writing more than 80 lines, you're summarizing rather than handing off. Prioritize the most recent live thread and the single most important blocker. Everything else is in ENGRAM.md and STATE.md.

## Steps

1. **Read `STATE.md`** — get current priorities, blockers, and last action.

2. **Read `ENGRAM.md`** — get open problems, tasks, and open questions.

3. **Read the last 2-3 session entries in `ENGRAM-LOG.md`** — identify the exact thread we're in mid-flight.

4. **Write `HANDOFF.md`** (overwrite if it exists):

   ```markdown
   # HANDOFF — [YYYY-MM-DD HH:MM UTC]

   ## Resume Point
   [1-2 sentences: exactly where we stopped and what the next action is]

   ## Live Threads
   - **[Thread name]**: [what's in progress, what needs to happen next]
   - ...

   ## Critical Context
   [Any non-obvious state that the next agent/session needs to know — things
    not obvious from STATE.md alone: uncommitted changes, pending external actions,
    mid-flight decisions not yet logged, etc.]

   ## Immediate Next Step
   > [Single action the next session should take first]

   ## Do Not Touch
   - [Files or systems that are mid-change and should not be touched until [condition]]
   ```

5. **Confirm**: "Handoff written to `HANDOFF.md`. Safe to close session."

## On the Other Side

When opening a new session after a handoff:

1. Read `HANDOFF.md` first (before STATE.md or anything else)
2. Announce the resume point to the user so they can confirm or correct it
3. Archive `HANDOFF.md` after the first message of the new session:

   ```bash
   mv HANDOFF.md HANDOFF-[YYYY-MM-DD].md
   ```
