# DECISIONS.md — Decision Log

## Purpose

Track every significant decision with rationale, alternatives considered, and timestamp. Prevents re-litigating settled questions across sessions and devices.

**Last Updated:** 2026-02-12 19:45:00 UTC

---

## Decision 1 — Project Infrastructure

**Date:** 2026-01-15
**Session:** 1
**Tags:** infrastructure, tooling
**Context:** Initialize brainstorming project with full documentation architecture.
**Decision:** Eight infrastructure files (CLAUDE.md, AGENTS.md, README.md, STATE.md, ENGRAM-LOG.md, ENGRAM.md, DECISIONS.md, .gitignore) using Engram v3.0.
**Alternatives Considered:** Wiki-based systems, database-backed tools, plain text without structure.
**Rationale:** Preserves brainstorming continuity across devices. Separates raw logs from processed summaries. Enables multi-device operation without context loss. Markdown is portable and AI-readable.
**Status:** Implemented

---

## Decision 2 — Tech Stack

**Date:** 2026-01-15
**Session:** 1
**Context:** Choose the technology stack for the energy dashboard.
**Decision:** React + TypeScript frontend, Supabase (Postgres + Auth + Realtime) backend, Vercel for deployment.
**Alternatives Considered:** (a) Next.js + Prisma + self-hosted Postgres — more control but more ops burden. (b) Vue + Firebase — good DX but vendor lock-in and Firestore pricing unpredictable at scale. (c) Plain HTML + SQLite — simplest, but no real-time updates or easy auth.
**Rationale:** Alex already knows React. Supabase gives Postgres with a generous free tier, built-in auth, and real-time subscriptions (useful for live dashboard updates). Vercel has zero-config React deployment. Total hosting cost: $0 at current scale.
**Status:** Implemented

---

## Decision 3 — Smart Meter Hardware

**Date:** 2026-01-18
**Session:** 2
**Context:** Which smart meter / energy monitor to use for data collection.
**Decision:** Emporia Vue 2 with local API access.
**Alternatives Considered:** (a) Sense monitor — better ML disaggregation but no local API, cloud-only. (b) IoTaWatt — open-source and local, but requires CT clamp installation (Alex rents, can't modify panel). (c) Utility smart meter API — free but only 15-min granularity and 24-hour delay.
**Rationale:** Emporia Vue 2 clamps onto existing breakers without modification (renter-friendly), exposes a local API via the community firmware, and provides 1-second granularity. Fallback: utility API for historical data.
**Status:** Implemented — installed 2026-01-20

---

## Decision 4 — Data Granularity

**Date:** 2026-01-22
**Session:** 3
**Tags:** data, performance
**Context:** What time resolution to store and display.
**Decision:** Store at 1-minute granularity, display at 15-minute granularity by default with drill-down to 1-minute.
**Alternatives Considered:** (a) Store everything at 1-second (Emporia's native rate) — ~2.6M rows/month, expensive. (b) Store at 15-minute only — loses detail for spike detection. (c) Store 1-second for 7 days, downsample to 1-minute after that.
**Rationale:** 1-minute gives enough resolution for anomaly detection and spike alerts without overwhelming storage. At ~43K rows/month, well within Supabase free tier. 15-minute display is what utility bills use, so it's familiar.
**Revisit:** Session 20 — revisit if storage costs rise or if spike detection accuracy is insufficient.
**Status:** Implemented

---

## Decision 5 — Dashboard Charting Library

**Date:** 2026-01-25
**Session:** 4
**Context:** Which charting library for the React dashboard.
**Decision:** Recharts.
**Alternatives Considered:** (a) Chart.js via react-chartjs-2 — widely used but imperative API feels awkward in React. (b) D3 — maximum flexibility but massive overkill for time-series line/bar charts. (c) Nivo — beautiful defaults but heavy bundle size. (d) Tremor — good for dashboards but opinionated styling conflicts with our Tailwind setup.
**Rationale:** Recharts is declarative, React-native, handles responsive layouts well, and the bundle size is reasonable (~45KB gzipped). Good enough for v1. Can swap later if we hit performance limits.
**Status:** Implemented — revisit if mobile performance doesn't improve (see P2 in ENGRAM.md)

---

## Decision 6 — Time-of-Use Rate Modeling

**Date:** 2026-01-30
**Session:** 6
**Context:** How to model electricity costs given time-of-use (TOU) pricing.
**Decision:** Hardcoded rate schedule with manual quarterly updates. Three tiers: off-peak ($0.08/kWh, 9pm-7am), mid-peak ($0.14/kWh, 7am-4pm & 9pm), on-peak ($0.22/kWh, 4pm-9pm weekdays).
**Alternatives Considered:** (a) Scrape utility website automatically — brittle, TOS concerns. (b) Use a rate API (OpenEI) — good data but adds external dependency and API key management. (c) Flat rate approximation — simpler but defeats the purpose of the cost optimization workstream.
**Rationale:** Alex's utility (PG&E) changes rates 1-2 times per year. Manual update takes 5 minutes. Avoids scraping brittleness and API dependencies. Good enough for personal use.
**Status:** Implemented

---

## Decision 7 — Authentication Model

**Date:** 2026-02-03
**Session:** 7
**Context:** Whether the dashboard needs user authentication.
**Decision:** Yes, Supabase Auth with magic link (email-based, no password).
**Alternatives Considered:** (a) No auth — simplest, but anyone with the URL sees Alex's energy data. (b) Basic password — works but password management is a hassle. (c) OAuth (Google) — easy but unnecessarily exposes Google account data.
**Rationale:** Magic link is zero-friction (no password to remember), secure enough for a personal dashboard, and Supabase Auth handles it with 3 lines of code. If Alex later shares with household members, they just need an email.
**Status:** Implemented

---

## Decision 8 — Appliance-Level Data Method

**Date:** 2026-02-10
**Session:** 9
**Context:** How to get per-appliance energy usage data.
**Decision:** Smart plugs (TP-Link Kasa KP125) on major appliances, not ML-based disaggregation.
**Alternatives Considered:** (a) ML disaggregation from whole-home data (like Sense does) — no hardware cost but accuracy is 60-75% for individual appliances, and training requires weeks of data. (b) Circuit-level monitoring (additional Emporia CTs) — accurate but requires electrician for panel access (renter). (c) Smart plugs — $12 each, instant setup, 99%+ accuracy for plugged-in appliances.
**Rationale:** Smart plugs give ground-truth data for the appliances that matter most (HVAC, water heater, EV charger, washer/dryer). ML disaggregation can be a v2 enhancement to catch smaller loads. Pragmatism over elegance for v1.
**Status:** Implemented — 4 smart plugs installed (HVAC, water heater, EV charger, washer/dryer)

---

## Decision 9 — Alert Thresholds

**Date:** 2026-02-12
**Session:** 10
**Context:** What triggers a notification alert.
**Decision:** Two alert types: (1) Spike detection — usage exceeds 2σ from the 7-day rolling average for that time-of-day. (2) Budget overshoot — projected daily cost exceeds 110% of the daily budget target ($4.50/day based on $135/month target).
**Alternatives Considered:** (a) Fixed thresholds (e.g., >5kW) — too crude, doesn't account for normal variation. (b) ML anomaly detection — more sophisticated but harder to explain why an alert fired. (c) Percentage change from yesterday — too noisy (weekday vs. weekend patterns).
**Rationale:** Statistical thresholds (2σ) adapt to Alex's actual usage patterns and are explainable ("your usage is unusually high compared to this time of day over the past week"). Budget overshoot is simple and directly actionable. Both have low false-positive rates in testing.
**Status:** Implemented — push notifications working, email CSS needs fix

---

## Pending Decisions

- **Twilio SMS:** Whether to add SMS as a notification channel at $0.0075/msg. Deferred from Session 10 pending cost analysis.
- **Recommendation engine scope:** Behavioral-only vs. behavioral + hardware recommendations. Needs brainstorm session.
