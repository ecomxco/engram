# ENGRAM-INDEX.md — Session Retrieval Index

## Purpose

A semantic tag map linking key topics to exact locations in ENGRAM-LOG.md. Enables targeted retrieval without loading the full log.

**Last Updated:** 2026-02-12 | **Sessions Indexed:** 1–10

**How to use:**

1. Find the relevant tag below
2. Go to ENGRAM-LOG.md and search for the timestamp
3. Read only that YAML block (~300-500 tokens) instead of the full log

---

## Format

```text
[tag]: YYYY-MM-DDTHH:MM:SSZ — Session N, turn T — [one-line description]
```text

Multiple timestamps = the topic recurred across sessions. Read the most recent unless you need the full history.

---

## Index

### Architecture & Infrastructure

```text
[tech_stack]:         2026-01-15T14:35:00Z — Session 1, turn 2 — Chose React+Vite+Supabase+Vercel stack
[tech_stack]:         2026-01-15T14:42:00Z — Session 1, turn 3 — Stack confirmed, Decision 2 logged
[project_structure]:  2026-01-15T14:20:00Z — Session 1, turn 1 — Initial architecture breakdown
[database_choice]:    2026-01-22T11:15:00Z — Session 3, turn 2 — Supabase schema design finalized
[auth_model]:         2026-02-03T10:30:00Z — Session 7, turn 1 — Magic link auth vs. password auth debate
[deployment]:         2026-01-15T14:35:00Z — Session 1, turn 2 — Vercel zero-config deployment decision
```text

### Hardware & Data

```text
[smart_meter]:        2026-01-18T10:15:00Z — Session 2, turn 1 — Emporia Vue 2 vs. Sense comparison
[smart_meter]:        2026-01-18T10:15:00Z — Session 2, turn 2 — Local API access, renter compatibility confirmed
[data_granularity]:   2026-01-22T11:30:00Z — Session 3, turn 3 — 1-min store / 15-min display decision (Decision 4)
[data_pipeline]:      2026-01-22T11:15:00Z — Session 3, turn 1 — Supabase schema, ingest architecture
[historical_data]:    2026-02-10T14:20:00Z — Session 9, turn 2 — 90-day API limit, backfill options (open problem P1)
```text

### Dashboard & UI

```text
[charting_library]:   2026-01-25T09:45:00Z — Session 4, turn 2 — Recharts chosen over D3/Nivo/Tremor (Decision 5)
[appliance_view]:     2026-02-10T14:10:00Z — Session 9, turn 1 — Appliance breakdown view design
[comparison_view]:    2026-02-12T19:00:00Z — Session 10, turn 3 — "This month vs. last month" view — not yet built
[mobile_performance]: 2026-01-25T10:15:00Z — Session 4, turn 4 — 2.3s load time noted, tracked as P2
```text

### Cost & Optimization

```text
[tou_rates]:          2026-01-30T09:20:00Z — Session 6, turn 1 — TOU rate modeling, PG&E tier structure
[tou_rates]:          2026-01-30T09:45:00Z — Session 6, turn 3 — Hardcoded vs. scraped vs. API decision (Decision 6)
[recommendation_eng]: 2026-02-10T14:30:00Z — Session 9, turn 3 — Recommendation engine scope discussion (open P1)
```text

### Notifications & Alerts

```text
[alert_thresholds]:   2026-02-12T19:15:00Z — Session 10, turn 2 — 2σ spike + 110% budget overshoot algorithm
[alert_thresholds]:   2026-02-12T19:20:00Z — Session 10, turn 3 — Decision 9 logged
[email_css]:          2026-02-12T19:30:00Z — Session 10, turn 4 — Gmail inline style requirement (blocking P0)
[sms_channel]:        2026-02-12T19:35:00Z — Session 10, turn 4 — Twilio pricing open question
```text

### Decisions (Quick Reference)

```text
[decision_1]:   2026-01-15 — Session 1  — Project Infrastructure (Engram v3.0)
[decision_2]:   2026-01-15 — Session 1  — Tech Stack (React+Vite+Supabase)
[decision_3]:   2026-01-18 — Session 2  — Smart Meter (Emporia Vue 2)
[decision_4]:   2026-01-22 — Session 3  — Data Granularity (1-min store, 15-min display)
[decision_5]:   2026-01-25 — Session 4  — Charting Library (Recharts)
[decision_6]:   2026-01-30 — Session 6  — TOU Rate Modeling (hardcoded quarterly)
[decision_7]:   2026-02-03 — Session 7  — Auth Model (magic link)
[decision_8]:   2026-02-10 — Session 9  — Appliance Data (smart plugs over ML)
[decision_9]:   2026-02-12 — Session 10 — Alert Thresholds (2σ + 110% budget)
```text

---

## Maintenance Notes

- Add a new entry whenever a significant decision, design choice, or open problem is introduced
- Use consistent tag names — reuse existing tags when topics recur
- Keep entries to one line — the log has the full content; this is just the address
- Updated at every checkpoint and reconcile cycle
