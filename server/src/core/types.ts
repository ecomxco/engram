// ── STATE.md ──────────────────────────────────────────────────────────────

export interface StateFrontmatter {
  current_turn: number;
  last_sync_turn: number;
  sync_threshold: number;
}

export interface SessionSummary {
  session: number;
  date: string;
  mode: string;
  items: string[];
}

export interface StateFile {
  frontmatter: StateFrontmatter;
  lastUpdated: string | null;
  updatedBy: string | null;
  whatJustHappened: SessionSummary[];
  activeThreads: string[];
  currentPriorities: string[];
  blockers: string[];
  keyContext: string[];
  totalSessions: number;
  lastSession: string | null;
  nextReconciliation: string | null;
}

// ── ENGRAM-LOG.md ────────────────────────────────────────────────────────

export interface LogExchange {
  timestamp: string;
  speaker: string;
  content: string;
  // YAML-format fields (present for newer entries)
  turn?: number;
  agent?: string;
  confidence?: number;
  deliverables?: string[];
  gapsIdentified?: string[];
  isParaphrase?: boolean;
}

export interface LogSession {
  number: number;
  date: string;
  mode: string;
  exchanges: LogExchange[];
}

export interface LogFile {
  sessions: LogSession[];
}

// ── ENGRAM.md ────────────────────────────────────────────────────────────

export interface Workstream {
  name: string;
  description: string;
}

export interface PrioritizedProblem {
  priority: string; // P0, P1, P2
  description: string;
}

export interface Task {
  description: string;
  done: boolean;
}

export interface TaskGroup {
  group: string;
  tasks: Task[];
}

export interface EngramSummary {
  lastUpdated: string | null;
  sessionsProcessed: number;
  lastReconciled: string | null;
  workstreams: Workstream[];
  openProblems: PrioritizedProblem[];
  tasks: TaskGroup[];
  decisionRefs: string[];
  openQuestions: string[];
}

// ── DECISIONS.md ─────────────────────────────────────────────────────────

export interface Decision {
  number: number;
  title: string;
  date: string;
  session: number;
  tags: string[];
  context: string;
  decision: string;
  alternativesConsidered: string;
  rationale: string;
  status: string;
  revisit?: string;
}

export interface DecisionsFile {
  lastUpdated: string | null;
  decisions: Decision[];
  pendingDecisions: string[];
}

// ── AGENTS.md ────────────────────────────────────────────────────────────

export interface AgentConfig {
  name: string;
  role: string;
  constraints: string[];
  capabilities: string[];
}

export interface AgentRegistryEntry {
  agent: string;
  provider: string;
  firstUsed: string;
  notes: string;
}

export interface AgentsFile {
  projectName: string;
  lastUpdated: string | null;
  primaryAgent: AgentConfig | null;
  agentRegistry: AgentRegistryEntry[];
}

// ── ENGRAM-INDEX.md ──────────────────────────────────────────────────────

export interface IndexEntry {
  tag: string;
  timestamp: string;
  session: number;
  turn: number;
  description: string;
}

export interface IndexCategory {
  name: string;
  entries: IndexEntry[];
}

export interface IndexFile {
  lastUpdated: string | null;
  sessionsIndexed: string | null;
  categories: IndexCategory[];
}

// ── Project ──────────────────────────────────────────────────────────────

export interface EngramFiles {
  state: string;
  log: string;
  engram: string;
  decisions: string;
  agents: string;
  index: string;
  claude: string;
  readme: string;
  handoff: string;
}

export interface EngramProject {
  root: string;
  files: EngramFiles;
}
