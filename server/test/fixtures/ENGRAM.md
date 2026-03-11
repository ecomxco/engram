# ENGRAM.md — Processed Summary

## Purpose
Actionable distillation of all brainstorming sessions. Updated at checkpoints and end-of-session. For the raw verbatim log, see ENGRAM-LOG.md.

**Last Updated:** 2026-02-12 19:45:00 UTC
**Sessions Processed:** 10
**Last Reconciled Against Log:** Session 10 (full rebuild)

---

## Workstreams

- **Dashboard UI** — React components for visualizing energy usage (daily/weekly/monthly/appliance views)
- **Data Pipeline** — Smart meter ingestion, storage, and transformation
- **Notification System** — Alerts for anomalies, budget overshoots, and optimization tips
- **Cost Optimization** — Time-of-use rate modeling and recommendation engine
- **Infrastructure** — Supabase schema, Vercel deployment, CI/CD

---

## Open Problems — Prioritized

**P0 (blocking near-term work):**
- Email notification CSS renders poorly in Gmail — inline styles needed (blocks Friday demo)

**P1 (blocking a workstream):**
- Recommendation engine needs a scoring model: how to weigh cost savings vs. comfort impact vs. effort to implement? No framework yet.
- Historical data backfill: utility API only exposes 90 days. Year-over-year comparisons impossible without filing a manual data request.

**P2 (important but not blocking):**
- Dashboard load time is ~2.3s on mobile. Acceptable for now but needs optimization before sharing with others. Suspected cause: unoptimized Recharts rendering with 15-min granularity data.
- Appliance disaggregation accuracy with smart plugs is ~85%. Some phantom loads (standby power) get misattributed.

---

## Tasks / Next Steps

**Immediate (before Friday demo):**
- [ ] Fix email notification CSS — switch to inline styles for Gmail compatibility
- [ ] Add "this month vs. last month" comparison view to dashboard

**Next sprint:**
- [ ] Design recommendation engine scoring model (brainstorm session needed)
- [ ] Implement recommendation engine v1 — start with low-hanging fruit (e.g., "your HVAC ran 3 hours longer than similar homes this week")
- [ ] Add export-to-PDF for monthly reports (Alex wants to share with landlord)

**Backlog:**
- [ ] SMS notification channel (blocked on Twilio pricing decision)
- [ ] Historical data backfill (blocked on utility data request)
- [ ] Dashboard performance optimization for mobile
- [ ] Dark mode for dashboard (Alex preference, low priority)
- [ ] Public sharing mode — read-only dashboard link for household members

---

## Decisions Made

9 decisions logged in DECISIONS.md. Key recent ones:

- **Decision 8** (Session 9): Use smart plugs for appliance-level data instead of ML disaggregation. Rationale: accuracy and simplicity for v1.
- **Decision 9** (Session 10): Threshold-based alerts with 2σ spike detection and 110% budget overshoot. Rationale: simple, explainable, low false-positive rate.

See DECISIONS.md for full history with alternatives considered.

---

## Open Questions

1. **Twilio SMS pricing:** Is $0.0075/message worth it for a personal project that might send 5-10 alerts/week? Or just stick with email + push?
2. **Recommendation engine scope:** Should v1 recommend behavioral changes only (e.g., "shift laundry to off-peak") or also hardware upgrades (e.g., "a smart thermostat would save $X/month")?
3. **Data sharing:** If Alex shares the dashboard with household members, should they see cost data or just usage data? Privacy implications.
4. **Utility rate changes:** Current TOU rates are hardcoded from the utility website. Should we build a scraper, or just manual update quarterly?
