---
description: Create and maintain ENGRAM-INDEX.md — the semantic tag map that enables targeted log retrieval without loading the full log
---
# Maintain Index

The index is what makes Engram's retrieval efficient. Without it, an AI recalling something from session 3 must load the entire log. With it, it reads two lines and greps a single 300-token block.

Run this workflow:

- At every **checkpoint** (add entries for new decisions/problems/threads opened this session)
- At every **reconcile** (audit the full index for accuracy)
- On demand: "update the index", "index this"

---

## Tag Format

```text
[tag_name]: YYYY-MM-DDTHH:MM:SSZ — Session N, turn T — [one-line description]
```

**Rules:**

- `tag_name` → lowercase, underscored, semantic (`[auth_model]` not `[auth]`)
- Timestamp → exact UTC from the ENGRAM-LOG.md entry header
- Description → one line, enough to decide whether to read the full block
- Multiple entries for the same tag = topic recurred; keep all, newest first

---

## When to Create a New Tag

Add a tag entry when a session produces:

| Event | Tag example |
| --- | --- |
| A significant decision | `[decision_N]`, plus a topic tag |
| A new open problem (P0/P1/P2) | `[mobile_performance]`, `[auth_edge_case]` |
| A new workstream or feature | `[recommendation_engine]` |
| A design choice with alternatives | `[database_choice]`, `[charting_library]` |
| A recurring debate or question | `[tou_rate_modeling]` |

**Do not** add a tag for every exchange — only for entries you'd actually need to retrieve later.

---

## How to Create a Tag Entry

1. Find the relevant exchange in ENGRAM-LOG.md
2. Note its timestamp from the `**[HH:MM UTC]**` attribution line
3. Construct the full ISO timestamp: `YYYY-MM-DDT{HH:MM:SS}Z`
4. Add the entry to the index under the appropriate section heading

---

## How to Use the Index for Retrieval

When the user asks something referencing a past decision or thread:

1. Scan ENGRAM-INDEX.md for a matching tag (reads in seconds)
2. Copy the timestamp to find the entry in ENGRAM-LOG.md
3. Read only that block (300-500 tokens)
4. Answer the question with that context

**Never load the full ENGRAM-LOG.md just to answer a question about a past decision.**

---

## Audit Checklist (run at reconcile)

- [ ] Every decision in DECISIONS.md has a `[decision_N]` entry in the index
- [ ] Every open problem in ENGRAM.md has at least one index entry
- [ ] Every active workstream has at least one index entry
- [ ] No entries point to timestamps that don't exist in the log
- [ ] Tags are consistent — no `[auth]` and `[auth_model]` as separate tags for the same concept

---

## Index Structure

Organize entries by section:

1. `## Architecture & Infrastructure`
2. `## Data & Hardware`
3. `## [Domain-specific workstream sections]`
4. `## Decisions (Quick Reference)` — every decision, always

The Decisions section is mandatory. It provides a complete decision timeline at a glance without opening DECISIONS.md.
