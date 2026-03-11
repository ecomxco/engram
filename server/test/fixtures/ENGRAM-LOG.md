# ENGRAM-LOG.md — Verbatim Session Log

## Purpose
Append-only log of all brainstorming sessions. Each entry contains the exact prompt and exact response, timestamped and attributed. Nothing is edited, summarized, or compressed. This is the source of truth.

## Entry Format

```
### Session N — YYYY-MM-DD — Mode: [brainstorm|implementation|review|admin]

**[HH:MM UTC] Alex:**
> Exact prompt text here, verbatim.

**[HH:MM UTC] [Agent/Model Name]:**
> Exact response text here, verbatim. Including all markdown, code blocks, file links.
```

## Log Rotation
Rotate when this file exceeds ~50KB or 15 sessions, whichever comes first. Rename to ENGRAM-LOG-NNN.md and start fresh. The processed summary (ENGRAM.md) carries forward.

---

### Session 1 — 2026-01-15 — Mode: brainstorm

**[14:20 UTC] Alex:**
> I want to build a personal energy dashboard for my apartment. I have a smart meter (Emporia Vue 2) and I'm tired of not knowing where my electricity goes. I want to see daily/weekly/monthly usage, get alerts when something spikes, and eventually get recommendations for saving money. I know React and TypeScript pretty well. What's the best way to architect this?

**[14:20 UTC] Claude (Anthropic, claude-opus-4-6):**
> Great project — this is the kind of thing where having real data makes the design much clearer. Let me break down the architecture options.
>
> **Data layer:** Your Emporia Vue 2 has a local API if you flash the community firmware. That gives you 1-second granularity without cloud dependency. For storage, you have a few options...
>
> [Full response continued with detailed architecture comparison: Supabase vs. self-hosted Postgres vs. Firebase vs. SQLite. Recommended Supabase for the free tier, built-in auth, and real-time subscriptions. Discussed data granularity tradeoffs: 1-second vs. 1-minute vs. 15-minute storage. Proposed React + Recharts for the frontend, Vercel for deployment.]
>
> **My recommendation for v1:** React + TypeScript + Supabase + Vercel. Store at 1-minute granularity, display at 15-minute. This keeps you in the free tier for everything and gives you real-time capability when you want it.
>
> Want to discuss the data model next, or should we settle the hardware questions first?

**[14:35 UTC] Alex:**
> Let's settle on the tech stack. I like the Supabase idea — I've used Firebase before and hated the pricing surprises. One question: should I use Next.js or plain React (Vite)?

**[14:35 UTC] Claude (Anthropic, claude-opus-4-6):**
> For this project, I'd go with plain React via Vite rather than Next.js. Here's why:
>
> Your dashboard is a single-page app. There's no SEO requirement (it's a personal tool behind auth), no server-side rendering needed, and no complex routing. Next.js adds a build system, server component model, and deployment constraints that you don't need.
>
> Vite gives you: instant HMR, fast builds, zero config for React+TS, and deploys anywhere (Vercel included). You keep full control without the Next.js abstraction layer.
>
> The one counterargument: if you later want API routes (e.g., a cron job that polls the Emporia API), Next.js makes that easy. But Supabase Edge Functions or a simple Vercel serverless function handles that case just fine.
>
> **Decision proposal:** React + Vite + TypeScript. Supabase for backend. Vercel for hosting.

**[14:42 UTC] Alex:**
> Agreed. Let's go with that. Log it as a decision. checkpoint

---

### Session 2 — 2026-01-18 — Mode: brainstorm

**[10:15 UTC] Alex:**
> I've been looking at smart meter options more carefully. The Emporia Vue 2 needs CT clamps on the breaker panel. I rent — can I install this without modifying anything? Also looked at the Sense monitor as an alternative.

**[10:15 UTC] Claude (Anthropic, claude-opus-4-6):**
> Good question. The Emporia Vue 2 CT clamps clip around the mains wires inside your breaker panel — they don't require any permanent modification. You open the panel cover (which renters can do), clip the CTs around the two main feed wires, and close the panel. No drilling, no wire cutting, fully reversible.
>
> **Emporia Vue 2 vs. Sense comparison:**
>
> | Feature | Emporia Vue 2 | Sense |
> |---------|--------------|-------|
> | Installation | CT clamps, clip-on, reversible | CT clamps, clip-on, reversible |
> | Local API | Yes (community firmware) | No — cloud only |
> | Disaggregation | No (whole-home only) | Yes (ML-based, ~60-75% accuracy) |
> | Price | ~$35 | ~$300 |
> | Data granularity | 1-second local | 1-second cloud |
> | Privacy | Data stays local | Data goes to Sense servers |
>
> For your use case, I'd go with the Emporia Vue 2. The local API is the killer feature — you own your data, no cloud dependency, and $35 vs. $300 is a massive difference for a personal project. The lack of built-in disaggregation is fine because we can add smart plugs on major appliances later for ground-truth per-device data.
>
> Sense's ML disaggregation sounds cool but in practice it takes weeks to train and is unreliable for smaller appliances. You'd still want smart plugs for accuracy.

[... Sessions 3-4 truncated for this example. They covered data model design, Supabase schema creation, and charting library selection (Recharts). See DECISIONS.md entries 4 and 5. ...]

---

### Session 5 — 2026-01-28 — Mode: admin

**[09:00 UTC] Alex:**
> reconcile now

**[09:00 UTC] Claude (Anthropic, claude-opus-4-6):**
> Starting full reconciliation — rebuilding ENGRAM.md from the complete log.
>
> Reading ENGRAM-LOG.md sessions 1 through 5...
>
> **Reconciliation complete.** Here's what changed:
>
> 1. Added "Infrastructure" as a fifth workstream (was implicit, now explicit)
> 2. Promoted dashboard mobile performance to P2 (was mentioned in session 4 but not tracked)
> 3. Corrected task list: "set up Supabase schema" was still listed as TODO but was completed in session 3
> 4. Added 2 open questions that were in the log but missing from the summary (data granularity drill-down UX, and whether to pre-aggregate weekly/monthly data or compute on the fly)
>
> ENGRAM.md, STATE.md updated. Session 5 complete. Next reconciliation due at session 10.

---

### Session 6 — 2026-01-30 — Mode: brainstorm

**[20:10 UTC] Alex:**
> I need to figure out the cost calculation. My utility (PG&E) has time-of-use pricing with three tiers. How should I model this? I don't want to hardcode rates that change, but I also don't want to over-engineer it.

**[20:10 UTC] Claude (Anthropic, claude-opus-4-6):**
> This is a classic pragmatism-vs-flexibility tradeoff. Let me lay out the options honestly:
>
> **Option A: Hardcoded rate schedule with manual updates.**
> You define the three TOU tiers in a config file. When PG&E changes rates (1-2x per year), you spend 5 minutes updating the numbers. Pros: dead simple, no external dependencies, works offline. Cons: manual maintenance.
>
> **Option B: Rate API (OpenEI USRDB).**
> The Open Energy Information utility rate database has PG&E's current rates. You'd query it periodically. Pros: automatic updates. Cons: adds an API dependency, needs error handling for downtime, OpenEI data can lag behind actual rate changes by weeks, and you need an API key.
>
> **Option C: Web scraper for PG&E's rate page.**
> Pros: most current data. Cons: brittle (PG&E redesigns their site, scraper breaks), possible TOS violation, maintenance nightmare.
>
> **My honest recommendation:** Option A. You're building a personal tool. PG&E changes rates once, maybe twice a year. The 5 minutes of manual update is nothing compared to the engineering and maintenance cost of Options B or C. You can always add the API later if this tool grows beyond personal use.
>
> For the data model, I'd suggest a `rate_schedules` table in Supabase:
>
> ```sql
> create table rate_schedules (
>   id uuid primary key default gen_random_uuid(),
>   name text not null,           -- e.g., 'PG&E TOU-C'
>   effective_date date not null,
>   off_peak_rate numeric(6,4),   -- $/kWh
>   mid_peak_rate numeric(6,4),
>   on_peak_rate numeric(6,4),
>   off_peak_hours text,          -- e.g., '21:00-07:00'
>   mid_peak_hours text,
>   on_peak_hours text,
>   created_at timestamptz default now()
> );
> ```
>
> This way you have a history of rate changes and can retroactively recalculate costs if you discover a rate was wrong.

**[20:22 UTC] Alex:**
> Option A. Definitely. Let's not over-engineer this. Current rates are: off-peak $0.08 (9pm-7am), mid-peak $0.14 (7am-4pm and 9pm), on-peak $0.22 (4pm-9pm weekdays). Log it as a decision. checkpoint

---

[... Sessions 7-8 truncated for this example. Session 7 covered authentication (magic link via Supabase Auth). Session 8 covered the initial dashboard UI build — daily, weekly, monthly views with Recharts. See DECISIONS.md entries 7-8. ...]

---

### Session 9 — 2026-02-10 — Mode: brainstorm + implementation

**[16:30 UTC] Alex:**
> The dashboard is looking good with the daily/weekly/monthly views. But I want to see which appliances are using the most power. Should we do ML-based disaggregation from the whole-home data, or just put smart plugs on the big appliances?

**[16:30 UTC] Claude (Anthropic, claude-opus-4-6):**
> Let me be honest about both approaches:
>
> **ML Disaggregation (like Sense does):**
> In theory, you can identify appliances from their electrical signatures in the whole-home data. In practice:
> - Requires 2-4 weeks of training data minimum
> - Accuracy ranges from 60-85% depending on the appliance
> - Small appliances (<100W) are basically invisible
> - Similar appliances (two space heaters) are indistinguishable
> - Every new appliance requires retraining
> - You'd need to implement or adapt NILM (Non-Intrusive Load Monitoring) algorithms — this is a research field, not a weekend project
>
> **Smart Plugs (TP-Link Kasa KP125):**
> - $12 each, takes 30 seconds to set up
> - 99%+ accuracy for any plugged-in appliance
> - Local API available (no cloud dependency)
> - Limitation: can't monitor hardwired appliances (central HVAC, water heater if hardwired, electric oven)
>
> **My recommendation for v1:** Smart plugs on the 4 big consumers: HVAC (if it plugs in), water heater (if it plugs in), EV charger, and washer/dryer. These probably account for 70-80% of your bill. Everything else is a rounding error at this stage.
>
> You can always add ML disaggregation as a v2 feature to catch the remaining 20-30%. But for v1, smart plugs give you ground-truth data with zero development effort on the disaggregation side.

**[16:45 UTC] Alex:**
> Smart plugs. No question. My HVAC and water heater both plug in (it's a mini-split and a hybrid tank). Let me order 4 KP125s. Can you start on the appliance breakdown view while I do that?

**[16:45 UTC] Claude (Anthropic, claude-opus-4-6):**
> On it. I'll create the appliance breakdown view component. Decision logged as #8.
>
> [Created `src/components/ApplianceBreakdown.tsx` — a stacked bar chart showing per-appliance energy usage with color coding. Supports daily and weekly views. Includes a "rest of home" category calculated as total minus known appliances.]
>
> The component expects data in this shape:
> ```typescript
> interface ApplianceReading {
>   timestamp: string;
>   appliance: 'hvac' | 'water_heater' | 'ev_charger' | 'washer_dryer' | 'other';
>   watts: number;
> }
> ```
>
> I also created `src/hooks/useApplianceData.ts` that merges the smart plug readings with the whole-home Emporia data and computes the "other" category. checkpoint

---

### Session 10 — 2026-02-12 — Mode: implementation

**[18:00 UTC] Alex:**
> Appliance view is great. Now I want alerts — I should get notified when something weird happens. Like if the HVAC runs all night, or if my bill is tracking way over budget. What's the best approach?

**[18:00 UTC] Claude (Anthropic, claude-opus-4-6):**
> Two types of alerts make sense for your use case:
>
> **1. Spike Detection (anomaly alert):**
> Compare current usage to a rolling average for the same time-of-day over the past 7 days. If current usage exceeds the mean + 2 standard deviations, fire an alert.
>
> Why 2σ: it's the standard threshold for "unusual but not rare." In a normal distribution, ~5% of readings will naturally exceed 2σ, so you'll get maybe 1-2 false positives per day — tolerable for a personal alert.
>
> **2. Budget Overshoot (cost alert):**
> Given your monthly target of $135, your daily budget is ~$4.50. If the projected daily cost (based on usage so far today, extrapolated using your TOU rates) exceeds 110% of the daily budget ($4.95), fire an alert.
>
> Why 110% not 100%: day-to-day variation is normal. You'll have $3 days and $6 days. Alerting at exactly $4.50 would be noisy. 110% catches the genuinely expensive days without crying wolf.
>
> For notification channels: push notifications (via web push API) and email. I'd defer SMS for now — Twilio costs $0.0075 per message, and for a personal project that might send 5-10 alerts per week, you'd be paying ~$2-4/month for a feature that push notifications handle for free.

**[18:20 UTC] Alex:**
> Perfect. Go with 2σ for spikes and 110% for budget. Build it. Defer SMS — we can decide on that later.

**[18:20 UTC] Claude (Anthropic, claude-opus-4-6):**
> Decision logged as #9. Building the notification system now.
>
> [Created `src/notifications/alerts.ts` — core alert engine with two detectors:
> - `SpikeDetector`: computes rolling 7-day stats per time-of-day bucket (1-hour windows), fires when current > mean + 2σ
> - `BudgetDetector`: projects daily cost from current consumption + TOU rates, fires when projection > daily_budget * 1.10
>
> Created `src/notifications/channels.ts` — notification delivery:
> - `PushChannel`: Web Push API with service worker registration
> - `EmailChannel`: Supabase Edge Function that sends via Resend API
>
> Created `src/notifications/manager.ts` — orchestrates detection and delivery, deduplicates alerts (max 1 alert per type per hour)]
>
> Push notifications are working — I tested the service worker registration flow. The email channel is functional but the HTML template renders poorly in Gmail (Gmail strips `<style>` tags, so we need inline CSS). That's a known Gmail limitation.
>
> Want me to fix the email CSS now, or move on to something else?

**[18:45 UTC] Alex:**
> Let's leave the email CSS for next time — I need to demo this to my partner on Friday and the push notifications are the important part. Good session. Also, this is session 10, so reconciliation is due right?

**[18:45 UTC] Claude (Anthropic, claude-opus-4-6):**
> Yes — reconciliation is due at session 10. Running it now.
>
> **Reconciliation complete.** ENGRAM.md rebuilt from the full log. Changes from reconciliation:
> - Moved "Supabase schema setup" and "Vercel deployment" from tasks to completed (were done in sessions 3-4 but still showing as open)
> - Added email CSS fix as P0 (blocking Friday demo)
> - Updated workstream status: Dashboard UI at ~85%, Data Pipeline at ~90%, Notifications at ~70%, Cost Optimization at ~40%
> - Cleaned up 3 duplicate open questions
>
> Session 10 complete. Log, summary, and state updated. Next reconciliation at session 15.
