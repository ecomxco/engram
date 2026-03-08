# Engram Roadmap
## Persistent Memory for AI Conversations

*Last updated: March 3, 2026*

---

## Overview

Engram is a lightweight, file-based system that gives AI conversations persistent memory across sessions, devices, and AI platforms. Built on markdown files and a simple, human-readable protocol—no database, no API, no plugins. Engram remembers what matters: decisions made, problems solved, context accumulated, and patterns learned.

This roadmap outlines seven phases of product evolution, from the current v3.0 release through v4.2 and beyond. Each phase builds capability while maintaining the core principle: **structured markdown files + shared protocol = persistent memory**.

---

## Current State (v2.1 → v3.0)

**What Engram is today:**
- 8 markdown files + 1 bash init script
- Cross-platform support: Claude, ChatGPT, Gemini, local models
- Core capabilities:
  - Verbatim append-only logging (ENGRAM-LOG.md)
  - Processed summaries (ENGRAM.md)
  - Decision tracking (DECISIONS.md)
  - State management (STATE.md)
  - Multi-agent registry (AGENTS.md)
- Designed for solo/small-team use, up to ~50 sessions
- **Usage model**: AI reads files at session start, updates them as work proceeds

---

## Phase 1: Foundation (v3.0) — Current Release

### Mission
Establish Engram's identity and create the visual layer for session replay and context loading.

### Deliverables

| Item | Description |
|------|-------------|
| **Branding** | Rename from "Brainstorm Architecture" to "Engram" across all materials |
| **HTML Session Visualizer** | Interactive browser-based viewer for session history, decision flow, and state timeline |
| **File Renames** | BRAINSTORM-LOG.md → ENGRAM-LOG.md, BRAINSTORM.md → ENGRAM.md |
| **Init Script** | Updated `init-engram.sh` with new naming and optional personalizations |
| **Documentation** | Getting Started guide, file schema documentation, protocol specification |

### Why It Matters
- Establishes Engram as a distinct product with clear identity
- Visual session history helps users understand what happened and why
- Renames align tooling with product brand
- Lowers onboarding friction for new users

### Estimated Complexity
**Medium (M)** — Mostly rename/rebrand work, HTML visualizer is straightforward DOM rendering

### Dependencies
None (foundation phase)

### Success Metrics
- Init script runs cleanly on macOS, Linux, Windows (WSL)
- Visualizer loads any project and renders session timeline
- All files properly renamed across repos/docs

---

## Phase 2: Query & Retrieval Layer (v3.1)

### Mission
Move Engram from a read-on-startup system to an actively queryable knowledge base with programmatic access.

### Deliverables

#### CLI Tool: `engram` Command
Installable via npm or pip; provides rich interface to engram projects.

```
engram init [--template TYPE]         # Initialize new engram project
engram search "query"                 # Full-text search across all files
engram decisions [--filter TYPE]      # List decisions with optional filtering
engram status                         # Formatted STATE.md output
engram checkpoint                     # Trigger sync + save point
engram visualize                      # Regenerate VISUALIZER.html
engram export [--format json|csv]     # Export project state
```

**Technology recommendation**: Node.js CLI (JavaScript) for cross-platform consistency and npm ecosystem.

#### Structured Data Layer
- `engram-data.json`: Machine-readable export of all project state
  - Generated automatically at each checkpoint
  - Consumed by VISUALIZER.html for richer interactivity
  - Available to external tools (CI/CD integrations, reporting)
  - Schema versioning for forward compatibility

#### New File
- `ENGRAM-DATA.json` — indexed, timestamped records of all sessions, decisions, and state changes

### Why It Matters
- Users can find past decisions without scrolling through logs
- Programmatic access enables integrations (GitHub issue auto-linking, Slack status updates)
- Structured data unlocks analytics and insights
- Makes Engram scriptable in larger workflows

### Estimated Complexity
**Large (L)** — CLI implementation, full-text search indexing, JSON schema design

### Dependencies
- Phase 1 (foundation, branding, naming)

### Key Features by Command

**`engram search`**
- Full-text across ENGRAM-LOG, ENGRAM.md, DECISIONS.md
- Boolean operators: `search "auth AND permissions NOT deprecated"`
- Return format: filename, line number, snippet, context

**`engram decisions`**
- Filters: `--type decision|assumption|blockedby|clarified`
- Sorting: by date, by impact, by status
- Output: table or JSON

**`engram status`**
- Renders STATE.md in human-readable format
- Highlights stale workstreams (no updates in N days)
- Shows decision age and decision velocity

**`engram checkpoint`**
- Compress ENGRAM-LOG into summary
- Validate file integrity
- Generate ENGRAM-DATA.json snapshot
- Optional git commit with timestamp

**`engram export`**
- JSON: full project structure + metadata
- CSV: flattened decisions, sessions, workstreams
- For reporting, archival, or handoff to other tools

### Success Metrics
- CLI installs cleanly on macOS, Linux, Windows
- Search finds all occurrences within 500ms on typical projects
- engram-data.json generated at each checkpoint without user intervention
- All export formats validate against published schemas

---

## Phase 3: MCP Server (v3.2)

### Mission
Elevate Engram from a read-at-startup protocol to a live, always-available tool that AIs use to maintain memory **during** conversation.

### Deliverables

#### MCP (Model Context Protocol) Server
- Engram runs as an MCP server that Claude Desktop, Claude Code, and other MCP-compatible clients can connect to
- No installation friction—drop the server binary in ~/.mcp/servers/
- Exposes six core operations as MCP tools

#### MCP Tools

| Tool | Parameters | Returns | Use Case |
|------|-----------|---------|----------|
| `engram_read_state` | (none) | Current STATE.md as JSON | Get up-to-speed at session start |
| `engram_log_exchange` | prompt, response, mode, agent_name | Confirmation + log_id | Log conversation turns |
| `engram_checkpoint` | (none) | Summary of synced files | Explicit save point (end of session) |
| `engram_search` | query, filters (optional) | Array of results with context | Look up past decisions/context |
| `engram_log_decision` | decision (structured) | Decision ID + timestamp | Record a decision formally |
| `engram_get_decisions` | filters (optional) | Array of decisions | Query decision log |
| `engram_reconcile` | (none) | Rebuilt ENGRAM.md summary | Rebuild summaries from logs |

#### Protocol Shift
- **Before (v3.1)**: AI is given instructions like "update STATE.md before ending session"
- **After (v3.2)**: AI is given tools; protocol enforcement is automatic

This is a **critical shift**: the system moves from "trust the AI to follow protocol" to "the protocol is embedded in the available tools."

### Why It Matters
- **Protocol compliance becomes automatic**: AI can't forget to update STATE.md because `engram_log_decision` enforces schema
- **Real-time memory**: AI has access to past decisions mid-conversation, not just at startup
- **Multi-platform reach**: Any MCP-compatible client (Claude, Cursor, Cline, etc.) can use Engram
- **Tool calling is more reliable** than natural language instructions
- **Audit trail**: Every memory operation is logged automatically

### Estimated Complexity
**Large (L)** — MCP server implementation, tool schema design, error handling

### Dependencies
- Phase 2 (CLI, structured data)
- External: MCP spec compliance testing

### Implementation Notes

**Backward compatibility**
- Existing markdown-based workflows still work
- MCP tools read/write same files as CLI
- Projects can mix MCP and CLI access

**Error handling**
- Concurrent writes from multiple AIs → last-write-wins with merge conflict markers
- Invalid tool calls → clear error messages with schema hints
- File corruption → automatic repair mode + notification

**Performance targets**
- read_state: <100ms
- log_exchange: <200ms (includes file I/O)
- search: <500ms on 500-session projects
- checkpoint: <1000ms

### Success Metrics
- Server starts cleanly in Claude Desktop MCP configuration
- All six tools work from Claude Code within conversation
- File writes atomic and correct under concurrent access
- Compliance tested against MCP spec v1.0

---

## Phase 4: Project Templates (v3.3)

### Mission
Lower time-to-value for different use cases by providing domain-specific project structures.

### Deliverables

#### Five Project Templates

```
engram init                                    # Default = software
engram init --template research                # Academic/research
engram init --template startup                 # Business/startup
engram init --template software                # Software development
engram init --template writing                 # Creative/long-form
engram init --template learning                # Structured learning
```

#### Template Components

Each template pre-configures:

1. **Workstream categories**
   - research: Literature review, Experiments, Hypothesis, Results
   - startup: Product, GTM, Finance, Operations
   - software: Architecture, Development, Testing, Deployment
   - writing: Outline, Drafting, Editing, Publishing
   - learning: Topics, Resources, Practice, Milestones

2. **Decision categories** (tailored per domain)
   - research: Methodology, Analysis approach, Publication venue
   - startup: Market hypothesis, Pricing, Launch timing
   - software: Architecture decision, Tech stack, API design
   - writing: Genre choice, Narrative structure, Audience
   - learning: Learning method, Resource prioritization, Pace

3. **Session mode suggestions**
   - research: `research`, `analysis`, `writing`
   - startup: `strategy`, `planning`, `retrospective`
   - software: `architecture`, `implementation`, `review`
   - writing: `brainstorm`, `draft`, `revise`
   - learning: `study`, `practice`, `reflection`

4. **CLAUDE.md with domain-specific instructions**
   - Research template: emphasis on hypothesis rigor, citation tracking
   - Startup template: decision velocity, customer validation
   - Software template: architecture trade-offs, testing strategy
   - Writing template: voice consistency, narrative arc
   - Learning template: spaced repetition, knowledge synthesis

### Why It Matters
- **Faster onboarding**: New users don't start with a blank slate
- **Domain alignment**: Categories and instructions match user workflows
- **Best practices baked in**: Each template encodes proven practices for its domain
- **Expandable**: Community can contribute templates over time

### Estimated Complexity
**Medium (M)** — Template scaffolding, domain research, instruction writing

### Dependencies
- Phase 2 (CLI `engram init` command)

### Template Examples

**Research Template**
```
WORKSTREAMS:
- Literature Review (papers, summaries, synthesis)
- Experimental Design (hypothesis, protocol, ethics)
- Data Collection (raw data, logs, observations)
- Analysis (statistical tests, code, interpretation)
- Publication (draft, peer feedback, venue selection)
```

**Startup Template**
```
WORKSTREAMS:
- Product (feature list, design, roadmap)
- GTM (customer discovery, messaging, channels)
- Finance (unit economics, funding strategy, runway)
- Operations (team, processes, tools)
- Metrics (leading indicators, dashboards, review cadence)
```

### Success Metrics
- Each template scaffolds in <200ms
- All templates pass validation (required fields present, schema correct)
- Documentation for each template includes domain-specific examples
- Community contributes 2+ new templates by v3.4

---

## Phase 5: Cross-Project Memory (v4.0)

### Mission
Create persistent "developer identity" that carries across projects, so Engram becomes a long-term knowledge companion, not just a per-project assistant.

### Deliverables

#### Global Engram Store
Location: `~/.engram/`

**New Files:**
1. **META-LEARNINGS.md**
   - Patterns, lessons, preferences extracted from all past projects
   - Entries: category, lesson, projects that contributed, confidence level
   - Examples:
     - "Database schema design benefits from spike: 3/5 projects validate this"
     - "User interviews yield 2x better insights than surveys: 4/4 projects"
     - "Ship MVP with 60% feature completeness: proven in 5 projects"

2. **IDENTITY.md**
   - Persistent user/developer profile
   - Sections:
     - Technical preferences (Python > Node.js, PostgreSQL > MongoDB)
     - Decision-making style (pragmatic, risk-aware, performance-focused)
     - Timezone, communication style, availability
     - Preferred learning modality, tools, collaboration patterns
   - AI reads IDENTITY.md to personalize interactions across all projects

3. **PROJECT-INDEX.md**
   - Registry of all engram projects
   - Fields: project name, location, date created, completion status, key outcomes
   - Enables "give me context from similar past projects" queries

#### New Commands

```
engram learn                      # Extract generalizable lessons from current project
engram context [--filter TYPE]   # Load relevant cross-project context for new session
engram identity [--update]       # View/edit persistent developer profile
engram projects                  # List all indexed projects with summaries
```

#### Integration Points

- New session prompt automatically includes relevant META-LEARNINGS
- `engram context --filter "database-design"` pulls lessons from past DB projects
- IDENTITY.md shapes how the AI offers advice (pragmatic vs. academic tone, etc.)

### Why It Matters
- **Persistent learning across projects**: Mistakes in Project A inform Project B
- **Developer identity**: The AI knows you prefer pragmatic over perfect, ship-to-learn over big design
- **Compounding knowledge**: Each project enriches the next
- **Reduced re-learning**: "We tried this before; here's what happened" is automatic
- **Long-term companionship**: Engram becomes your ongoing thinking partner, not a per-project tool

### Estimated Complexity
**Large (L)** — Cross-project context aggregation, learning extraction algorithm, identity schema

### Dependencies
- Phase 2 (structured data export)
- Phase 3 (MCP tools for read/write)

### Learning Extraction Algorithm

When user runs `engram learn`:
1. Analyze DECISIONS.md for patterns
2. Identify decisions repeated across sessions
3. Score lessons by frequency and positive outcomes
4. Extract to META-LEARNINGS.md with citation
5. Prompt user to review/validate

Example:
```
Lesson: "Spike on unknown tech before committing to project timeline"
- Validated in: project-web-auth, project-streaming, project-ml
- Confidence: 3/3 = HIGH
- When to apply: Any new technology in critical path
```

### Success Metrics
- `engram learn` identifies 5-10 valid lessons per 20-session project
- META-LEARNINGS queried within new sessions improve decision quality (subjective user feedback)
- IDENTITY.md survives 5+ projects with minimal manual updates
- Cross-project context loads in <500ms

---

## Phase 6: Token-Aware Context Loading (v4.1)

### Mission
Adapt context to the AI's current token budget, ensuring Engram is useful even when budget is tight (mobile, expensive models) and comprehensive when generous.

### Deliverables

#### Context Budget System
- User specifies available context tokens: `engram context --budget 8000`
- Tiered loading algorithm:

```
1. STATE.md              (always, ~500 tokens)
2. ENGRAM.md             (if room, ~1500 tokens)
3. ENGRAM-LOG sections   (if room, up to ~4000 tokens, recent first)
4. DECISIONS.md          (if room, ~1500 tokens)
5. META-LEARNINGS        (if room, relevant items filtered)
```

#### Pre-Computed Context Packages
- **"8k summary"**: STATE + high-priority decisions + key learnings
- **"32k full context"**: Full STATE + recent ENGRAM + DECISIONS + META-LEARNINGS
- **"128k deep dive"**: Everything above + full ENGRAM-LOG + all past sessions

#### Smart Summarization
- If full files don't fit within budget:
  - Auto-generate compressed summaries (ENGRAM.md → condensed version)
  - Highlight: decisions made, blockers, next steps, open questions
  - Include: decision timestamps and impact scores

#### Model-Specific Token Counting
- Integrate with `js-tiktoken` (JavaScript) or `tiktoken` (Python)
- Support multiple model families: GPT-4, Claude, Gemini, Llama
- Account for tool/MCP overhead in budget calculation

#### New Commands

```
engram load --budget 8000 --model claude-opus      # Get curated context
engram context-test --budget 8000                  # Preview what would load
engram summarize --level condensed|full            # Generate summaries on demand
```

### Why It Matters
- **Mobile-friendly**: Works with tight budgets (Gemini on mobile, older models)
- **Cost-aware**: Users can optimize spend by choosing lower budgets for low-stakes decisions
- **Reliability**: Less hallucination when context is well-curated vs. truncated
- **Transparency**: Users see exactly what context was loaded and why
- **Model flexibility**: Same project works across GPT-4, Claude, local models, etc.

### Estimated Complexity
**Large (L)** — Token counting integration, priority scoring algorithm, multiple summarization strategies

### Dependencies
- Phase 2 (structured data, ENGRAM-DATA.json)
- Phase 5 (META-LEARNINGS, learned patterns)

### Priority Scoring Algorithm

Context items scored by:
- Recency (recent items weighted higher)
- Impact (decisions that affected project trajectory)
- Relevance (semantic similarity to current session type)
- Status (open questions ranked above resolved ones)

### Success Metrics
- Context loads correctly within ±5% of specified token budget
- "8k summary" covers all critical STATE + recent decisions
- Compressed ENGRAM.md retains 80%+ of semantic content
- Load time for large projects <1000ms

---

## Phase 7: Collaboration & Teams (v4.2)

### Mission
Enable small teams to share Engram projects while maintaining individual perspectives and decision velocity.

### Deliverables

#### Multi-User Support
- **Ownership model**: Project has owner; team members have read/write access
- **Conflict resolution**: Merge conflicts in markdown files detected and surfaced with options
- **User attribution**: Every log entry, decision, and state change tagged with user/AI identity

#### Git-Native Workflows
- Engram projects are git repositories
- Team members work on branches: `feature/auth-redesign`
- Pull requests for state changes (decision approval, major workstream updates)
- Merge conflicts shown with context: who changed what, when, why

#### Role-Based Perspectives
- **Observer**: Read STATE.md only
- **Contributor**: Can log exchanges and decisions
- **Reviewer**: Can approve decisions before merge
- **Lead**: Can create checkpoints and release summary versions

#### Shared Decision Log with Workflows
- Decision has status: `proposed` → `approved` → `implemented` → `closed`
- Approval required for major decisions (configurable)
- Voting/consensus: "2 of 3 lead engineers approve before shipping"

#### New Files/Features
- **TEAM.md**: List of members, roles, email, timezone, preferences
- **ACCESS.md**: Permission matrix (who can edit which files)
- **PULL_REQUESTS.md**: Log of team reviews and approvals
- New MCP tools:
  - `engram_propose_decision(decision, require_approval)`
  - `engram_approve_decision(decision_id, reviewer_id, notes)`
  - `engram_request_review(changes, reviewers)`

### Why It Matters
- **Small teams**: Startup founders, research groups, open-source maintainers can co-create
- **Institutional knowledge**: Decisions are visible and debated, not siloed
- **Audit trail**: Who decided what, when, with whose input—valuable for accountability
- **Async collaboration**: Teams in different timezones can review and approve asynchronously

### Estimated Complexity
**Large (L)** — Git integration, merge conflict resolution, permission system, approval workflows

### Dependencies
- Phase 2 (CLI, structured data)
- Phase 3 (MCP tools)

### Conflict Resolution Example

When Alice and Bob both update STATE.md:
```
CONFLICT in STATE.md:
<<< Alice's version (commit abc123, 2 hours ago)
  CURRENT_WORKSTREAM: Feature auth redesign
>>> Bob's version (commit def456, 1 hour ago)
  CURRENT_WORKSTREAM: Testing infrastructure

Suggestion: Alice's version is newer. Merge and note:
  - Bob was testing, Alice moved to next phase
  - Next sync call: review together
```

### Success Metrics
- Conflict detection works on all file types (markdown, JSON)
- Merge suggestions generated in <100ms
- Teams of 3-5 can collaborate without stepping on each other
- Approval workflows enforce decision governance without friction

---

## Phase 8+: Future Exploration

Beyond v4.2, emerging capabilities to explore:

### Real-Time Collaboration (v5.0)
- CRDT-based sync for simultaneous editing
- Live cursor tracking (who's editing what, right now)
- Useful for: synchronous brainstorms, mob programming sessions

### Plugin Ecosystem (v5.1)
- Custom session modes: `engram init --plugin user-interview`
- Custom file types: METRICS.md, ROADMAP.md generated by plugins
- Language: JavaScript plugins loaded dynamically

### AI-to-AI Handoff Protocols (v5.2)
- Automated handoffs: Claude → GPT-4 → local model, memory maintained
- Provenance tracking: "Generated by GPT-4 on 2026-03-03"
- Useful for: distributed AI teams, model comparison, hybrid workflows

### Engram-as-a-Service (v5.3)
- Hosted version: projects on engram.ai instead of user's machine
- Sync to device, work offline, push when ready
- Useful for: users without file system access, mobile-first workflows

### IDE Integration (v5.4)
- VS Code extension: sidebar shows STATE.md, recent decisions, search
- Quick actions: log decision, checkpoint, search—without leaving editor
- Useful for: developers who live in their editor

### Voice Session Support (v5.5)
- Transcribe voice → log as conversation
- Voice search: "What did we decide about authentication?"
- Useful for: voice-first interactions, accessibility, hands-free workflows

---

## Success Criteria Across All Phases

### User Adoption
- v3.0: 100+ users in first 2 weeks (signup via GitHub releases)
- v3.1: 5k+ CLI installs/month by end of phase
- v3.2: MCP adoption in 3+ Claude Desktop plugins
- v4.0: 10k+ daily active projects by end of year

### Product Quality
- Zero data loss incidents (all file writes atomic)
- Search accuracy >95% (precision + recall on typical queries)
- CLI responsiveness: <500ms for all commands on projects with 100+ sessions
- Documentation: each feature has README + 3+ working examples

### Community
- v3.1: Community contributions to CLI (new commands, file formatters)
- v3.3: 5+ templates contributed by community by v3.4
- v4.0: Engram used to maintain itself (dogfooding: Engram project uses Engram)

### Reliability
- 99.5% uptime for any self-hosted instances (file I/O reliability)
- Graceful degradation: if one feature fails, others continue
- Backward compatibility: projects created in v3.0 work unchanged in v4.2

---

## Implementation Priorities

### High Priority (Do First)
1. Phase 1: Branding and visualization (establish identity)
2. Phase 2: CLI + structured data (enable retrieval)
3. Phase 3: MCP server (reach new platforms, enforce protocol)

### Medium Priority (Follow Up)
4. Phase 4: Templates (lower time-to-value for new users)
5. Phase 5: Cross-project memory (compound learning)
6. Phase 6: Token-aware loading (maximize utility across models)

### Lower Priority (Explore If Demand)
7. Phase 7: Collaboration (team workflows)
8. Phase 8+: Future explorations (longer-term bets)

---

## Technical Architecture Notes

### Core Stack (Recommended)
- **CLI tool**: Node.js + TypeScript (cross-platform, npm)
- **MCP server**: TypeScript SDK for MCP
- **Visualizer**: HTML5 + vanilla JS (no build step, works offline)
- **Storage**: Plain markdown + JSON (portable, human-readable, git-friendly)

### Key Design Constraints
- **No database**: All state in markdown files + JSON
- **No external APIs**: Works fully offline
- **No vendor lock-in**: Files are portable, readable by any text editor
- **Git-compatible**: All files work with standard git workflows
- **AI-agnostic**: Works with Claude, ChatGPT, Gemini, local models

### File System Organization
```
project-root/
├── ENGRAM.md              (current state summary)
├── ENGRAM-LOG.md          (raw session transcript)
├── STATE.md               (project state snapshot)
├── DECISIONS.md           (structured decisions)
├── AGENTS.md              (agent registry)
├── CLAUDE.md              (AI instructions)
├── WORKSTREAMS.md         (active work areas)
├── ENGRAM-DATA.json       (indexed, queryable export)
├── VISUALIZER.html        (session browser)
└── .engram/               (metadata, local caches)
    ├── last-checkpoint    (timestamp)
    ├── search-index.json  (fast search)
    └── config.json        (project settings)
```

### Backward Compatibility Strategy
- v3.1+ tools read v3.0 files without modification
- Migrations run on-demand (`engram migrate --from v3.0`)
- Old formats stay readable; new formats are default for new files

---

## Roadmap Timeline (Estimated)

| Phase | Version | Estimated Duration | Target Launch |
|-------|---------|-------------------|-----------------|
| 1. Foundation | v3.0 | 4 weeks | March 2026 |
| 2. Query & Retrieval | v3.1 | 8 weeks | May 2026 |
| 3. MCP Server | v3.2 | 6 weeks | June 2026 |
| 4. Templates | v3.3 | 4 weeks | July 2026 |
| 5. Cross-Project Memory | v4.0 | 8 weeks | September 2026 |
| 6. Token-Aware Loading | v4.1 | 6 weeks | October 2026 |
| 7. Collaboration & Teams | v4.2 | 8 weeks | December 2026 |

*Note: Timelines assume ~1 FTE on core development. Parallel work on docs, examples, and community support throughout.*

---

## Call to Action

Engram is more than a tool—it's a philosophy: **persistent memory for AI conversations should be simple, portable, and in your control.**

This roadmap is a commitment to building toward that vision, phase by phase, with your feedback shaping the journey.

**How to get involved:**
- Try Engram v3.0 and send feedback
- Run it on your own projects (research, startup, software—whatever you're building)
- Contribute templates, CLI commands, or documentation
- Join the conversation: GitHub issues, discussions, and the roadmap updates

Let's build the thinking partner AIs deserve.

---

*Engram: Persistent memory. Plain text. Your way.*
