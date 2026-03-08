#!/bin/bash
# ============================================================================
# Engram Visualizer Updater
# Parses your engram markdown files and regenerates VISUALIZER.html with
# live project data. Requires only Python 3 (stdlib) — no other dependencies.
#
# Usage:
#   ./update-visualizer.sh                  # run from your engram project dir
#   ./update-visualizer.sh --dir ~/project  # point at another project
#
# Reads: STATE.md, ENGRAM-LOG.md, DECISIONS.md, ENGRAM.md, AGENTS.md
# Writes: VISUALIZER.html (in the engram repo directory)
# ============================================================================

set -euo pipefail

# ── Resolve paths ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dir) PROJECT_DIR="$(cd "$2" && pwd)"; shift 2 ;;
    --quiet|-q) QUIET=true; shift ;;
    -h|--help)
      echo "Usage: update-visualizer.sh [--dir PATH] [--quiet]"
      echo "  --dir PATH   Project directory containing engram files (default: script directory)"
      echo "  --quiet      Suppress output (used by engram-watch.sh)"
      exit 0
      ;;
    *) echo "Unknown option: $1. Use -h for help."; exit 1 ;;
  esac
done

QUIET=${QUIET:-false}

VISUALIZER="$SCRIPT_DIR/VISUALIZER.html"

if [ ! -f "$VISUALIZER" ]; then
  echo "Error: VISUALIZER.html not found at $SCRIPT_DIR"
  echo "Run this script from the engram repo directory, or copy VISUALIZER.html there."
  exit 1
fi

if [ "$QUIET" = false ]; then
  echo "Engram Visualizer Updater"
  echo "  Project: $PROJECT_DIR"
  echo ""
fi

# ── All parsing and injection handled by Python ───────────────────────────
python3 - "$PROJECT_DIR" "$VISUALIZER" "$QUIET" <<'PYEOF'
import sys, re, json, os
from datetime import datetime, timezone

project_dir = sys.argv[1]
visualizer_path = sys.argv[2]
quiet = sys.argv[3].lower() == 'true'

def log(msg):
    if not quiet:
        print(msg)


def read(filename):
    path = os.path.join(project_dir, filename)
    if not os.path.exists(path):
        return ''
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

state_text     = read('STATE.md')
log_text       = read('ENGRAM-LOG.md')
decisions_text = read('DECISIONS.md')
engram_text    = read('ENGRAM.md')
agents_text    = read('AGENTS.md')

def strip_model_version(name):
    """'Claude (Anthropic, claude-opus-4-6)' → 'Claude'
       'ChatGPT (gpt-5.2)' → 'ChatGPT'"""
    return re.sub(r'\s*\(.*?\)', '', name).strip()

# ── Project name & author ─────────────────────────────────────────────────
# Priority:  1) AGENTS.md "## Project:" heading
#            2) ENGRAM.md first H1 (if not a file header)
#            3) STATE.md "## Project:" heading
#            4) README.md first H1
#            5) Folder name (last resort)
project_name = os.path.basename(project_dir)
author = 'Author'
total_sessions = 0

# AGENTS.md Project heading is the most reliable source
for src in [agents_text, engram_text, state_text]:
    m = re.search(r'^## Project:\s*(.+)', src, re.MULTILINE)
    if m and m.group(1).strip():
        project_name = m.group(1).strip()
        break

# Author from STATE.md or AGENTS.md
if state_text:
    m = re.search(r'\*\*(?:Primary )?Author(?:[^:*]*):\*\*\s*(.+)', state_text)
    if m: author = m.group(1).strip()
    m = re.search(r'\*\*Total sessions\*\*:\s*(\d+)', state_text)
    if m: total_sessions = int(m.group(1))

# Fallback: count session headers in ENGRAM-LOG.md if STATE.md counter is unset
if total_sessions == 0 and log_text:
    total_sessions = len(re.findall(r'^### Session \d+', log_text, re.MULTILINE))

print('  Parsing STATE.md...')
print(f'    Project: {project_name}')
print(f'    Author: {author}')

# ── Sessions from ENGRAM-LOG.md ───────────────────────────────────────────
print('  Parsing ENGRAM-LOG.md...')
sessions = []
session_pattern = re.compile(
    r'^### Session (\d+) — (\d{4}-\d{2}-\d{2}) — Mode: ([^\n]+)',
    re.MULTILINE
)

# Known AI agent name pattern — match base name before any parenthetical
known_ai = re.compile(r'\b(Claude|ChatGPT|GPT-[0-9]|Gemini|Grok|Llama|Mistral|Copilot|Antigravity|Aria|Cursor|Cursor AI)\b', re.I)

matches = list(session_pattern.finditer(log_text))
for i, m in enumerate(matches):
    sid  = int(m.group(1))
    date = m.group(2)
    mode_raw = m.group(3).strip().lower()
    # Handle compound modes like "brainstorm + implementation"
    mode = re.split(r'[\s+/&]+', mode_raw)[0]
    valid_modes = {'brainstorm', 'implementation', 'review', 'admin'}
    if mode not in valid_modes:
        mode = 'brainstorm'

    # Chunk text for this session
    start = m.end()
    end   = matches[i + 1].start() if i + 1 < len(matches) else len(log_text)
    chunk = log_text[start:end]

    # Summary: prefer first AI response line (quoted "> ") that is substantive
    # Skip very short quoted lines (like "reconcile now" echoes, single-word acks)
    summary = f'Session {sid}'
    # Find all quoted lines and pick the first one that's from an AI (after an AI attribution)
    lines = chunk.split('\n')
    last_speaker_is_ai = False
    for line in lines:
        # Attribution line: **[HH:MM UTC] Name:**
        attr_m = re.match(r'\*\*\[\d+:\d+ UTC\]\s*([^:*]+):', line)
        if attr_m:
            speaker = strip_model_version(attr_m.group(1).strip())
            last_speaker_is_ai = bool(known_ai.search(speaker))
            continue
        # Quoted response line
        if line.startswith('> ') and last_speaker_is_ai:
            candidate = line[2:].replace('**', '').strip()
            # Skip trivial lines
            if len(candidate) >= 20 and not re.match(r'^(Yes|No|On it|Done|Starting|Running|Great|Sure|Perfect)', candidate):
                summary = candidate[:120]
                break
    # If still no good AI summary, fall back to any quoted line
    if summary == f'Session {sid}':
        qm = re.search(r'^> (.{20,})', chunk, re.MULTILINE)
        summary = qm.group(1).replace('**', '').strip()[:120] if qm else summary

    # Collect AI agent names — strip model version for display
    agent_names = set()
    for am in re.finditer(r'\*\*\[\d+:\d+ UTC\]\s*([^:*]+):', chunk):
        raw = am.group(1).strip()
        base = strip_model_version(raw)
        if known_ai.search(base):
            agent_names.add(base)
    if not agent_names:
        agent_names.add('Claude')

    sessions.append({
        'id': sid,
        'date': date,
        'mode': mode,
        'summary': summary,
        'details': summary,
        'agents': sorted(agent_names),
    })

# Fill in any session IDs that are in STATE.md but missing from the log
# (e.g., truncated example logs)
if total_sessions > len(sessions):
    existing_ids = {s['id'] for s in sessions}
    for missing_id in range(1, total_sessions + 1):
        if missing_id not in existing_ids:
            sessions.append({
                'id': missing_id,
                'date': '',
                'mode': 'brainstorm',
                'summary': f'Session {missing_id} (log entry not available)',
                'details': f'Session {missing_id} details not in log.',
                'agents': ['Claude'],
            })
    sessions.sort(key=lambda s: s['id'])

print(f'    Found {len(sessions)} sessions (log headers: {len(matches)}, total per STATE.md: {total_sessions})')

# ── Decisions from DECISIONS.md ───────────────────────────────────────────
print('  Parsing DECISIONS.md...')
decisions = []
dec_pattern = re.compile(r'^## Decision (\d+) — ([^\n]+)', re.MULTILINE)
dec_matches = list(dec_pattern.finditer(decisions_text))

for i, m in enumerate(dec_matches):
    did   = int(m.group(1))
    title = m.group(2).strip()
    start = m.start()
    end   = dec_matches[i + 1].start() if i + 1 < len(dec_matches) else len(decisions_text)
    block = decisions_text[start:end]

    date_m    = re.search(r'\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})', block)
    sess_m    = re.search(r'\*\*Session:\*\*\s*(\d+)', block)
    chosen_m  = re.search(r'\*\*Decision:\*\*\s*([^\n]+)', block)
    alts_m    = re.search(r'\*\*Alternatives Considered:\*\*\s*([^\n]+)', block)
    rat_m     = re.search(r'\*\*Rationale:\*\*\s*([^\n]+)', block)
    stat_m    = re.search(r'\*\*Status:\*\*\s*([^\n]+)', block)

    # Parse alternatives: "(a) X. (b) Y." or comma-separated
    alts_raw = alts_m.group(1).strip() if alts_m else ''
    if alts_raw:
        parts = re.split(r'\.\s*\([a-z]\)\s*|\([a-z]\)\s*', alts_raw)
        alts = [p.rstrip('.').strip() for p in parts if len(p.strip()) > 2]
    else:
        alts = []

    status_raw = stat_m.group(1).strip() if stat_m else ''
    status = 'implemented' if re.search(r'implement', status_raw, re.I) else 'pending'

    decisions.append({
        'id': did,
        'title': title,
        'date': date_m.group(1) if date_m else '',
        'sessionId': int(sess_m.group(1)) if sess_m else 0,
        'status': status,
        'chosen': chosen_m.group(1).strip() if chosen_m else '',
        'alternatives': alts,
        'rationale': rat_m.group(1).strip() if rat_m else '',
    })

print(f'    Found {len(decisions)} decisions')

# ── Workstreams from ENGRAM.md ────────────────────────────────────────────
print('  Parsing ENGRAM.md...')
workstreams = []
ws_m = re.search(r'## Workstreams([\s\S]*?)(?=\n## )', engram_text)
if ws_m:
    ws_id = 1
    for line in ws_m.group(1).split('\n'):
        nm = re.search(r'\*\*([^*]+)\*\*', line)
        if nm and line.strip().startswith('-'):
            raw_line = line.strip()[1:].strip()  # strip leading '-'
            # Description is everything after the em-dash (— or --)  after the bold name
            desc_m = re.search(r'\*\*[^*]+\*\*\s*[—–-]+\s*(.+)', raw_line)
            desc = desc_m.group(1).strip() if desc_m else ''
            workstreams.append({
                'id': ws_id,
                'name': nm.group(1).strip(),
                'description': desc,
                'progress': 50,
                'activeTasks': [],
                'blockers': [],
            })
            ws_id += 1

# ── Open Problems (P0/P1/P2) ─────────────────────────────────────────────
problems = []
pid = 1
p_m = re.search(r'## Open Problems([\s\S]*?)(?=\n## )', engram_text)
if p_m:
    current_sev = ''
    for line in p_m.group(1).split('\n'):
        sm = re.search(r'\*\*(P\d)', line)
        if sm:
            current_sev = sm.group(1)
            continue
        if current_sev and line.strip().startswith('- '):
            t = line.strip()[2:].strip()
            if len(t) > 3:
                problems.append({'id': pid, 'severity': current_sev, 'title': t[:80], 'description': t})
                pid += 1

# ── Tasks (- [ ] lines from any section) ─────────────────────────────────
tasks = [
    line.strip()[6:].strip()
    for line in engram_text.split('\n')
    if line.strip().startswith('- [ ] ')
]

# ── Open Questions ────────────────────────────────────────────────────────
questions = []
q_m = re.search(r'## Open Questions([\s\S]*?)(?=\n## |$)', engram_text)
if q_m:
    for line in q_m.group(1).split('\n'):
        qm = re.match(r'^\d+\.\s+(.+)', line)
        if qm:
            questions.append(re.sub(r'\*\*', '', qm.group(1)).strip())

print(f'    Found {len(workstreams)} workstreams, {len(problems)} problems, {len(tasks)} tasks, {len(questions)} questions')

# ── Agents from AGENTS.md ─────────────────────────────────────────────────
print('  Parsing AGENTS.md...')
agents = []
at_m = re.search(r'\| Agent\s*\|[^\n]*\n\|[-| ]+\n((?:\|[^\n]+\n?)+)', agents_text)
if at_m:
    agent_id = 1
    for row in at_m.group(1).strip().split('\n'):
        cols = [c.strip() for c in row.split('|') if c.strip()]
        if cols and not re.match(r'^-+$', cols[0]):
            raw_name = cols[0]
            display_name = strip_model_version(raw_name)
            notes = cols[3].strip() if len(cols) > 3 else ''
            # Role: primary if notes say primary, review if notes say review/one-off
            if re.search(r'[Pp]rimary', notes):
                role = 'Primary Agent'
                mode = 'primary'
            elif re.search(r'[Rr]eview|[Oo]ne-off|[Ss]econdary', notes):
                role = 'Code Reviewer'
                mode = 'review'
            else:
                role = 'Agent'
                mode = 'primary'
            # Count sessions this agent appears in
            agent_sessions = sum(1 for s in sessions if display_name in s['agents'] or
                                 any(display_name.lower() in a.lower() for a in s['agents']))
            expertise_raw = cols[1].strip() if len(cols) > 1 else 'AI'
            # Expertise from notes, falling back to provider
            expertise_tags = [expertise_raw] if expertise_raw else ['AI']
            if 'review' in notes.lower() or 'audit' in notes.lower():
                expertise_tags.append('Code Review')
            agents.append({
                'id': agent_id,
                'name': display_name,
                'role': role,
                'sessions': max(1, agent_sessions),
                'participationMode': mode,
                'expertise': expertise_tags,
            })
            agent_id += 1

if not agents:
    agents.append({
        'id': 1, 'name': 'Claude', 'role': 'Primary Agent',
        'sessions': total_sessions or len(sessions),
        'participationMode': 'primary',
        'expertise': ['Analysis', 'Architecture'],
    })

print(f'    Found {len(agents)} agents')

# ── Build final data object ───────────────────────────────────────────────
data = {
    'projectName': project_name,
    'author': author,
    'lastUpdated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'sessions': sessions,
    'decisions': decisions,
    'workstreams': workstreams,
    'agents': agents,
    'openItems': {
        'problems': problems,
        'tasks': tasks,
        'questions': questions,
    },
    'dependencies': {
        'decisionToWorkstream': [],
        'workstreamDependencies': [],
    },
}

# ── Generate HTML sections ────────────────────────────────────────────────
def esc(s):
    """HTML-escape a string."""
    return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def tag_mode(mode):
    cls = {'brainstorm':'tag-purple','implementation':'tag-teal','review':'tag-amber','admin':'tag-muted'}.get(mode,'tag-muted')
    return f'<span class="tag {cls}">{esc(mode)}</span>'

def tag_status(status):
    cls = 'tag-green' if status == 'implemented' else 'tag-amber'
    return f'<span class="tag {cls}">{esc(status)}</span>'

# Stats block
stats_html = f'''<div class="stats">
  <div class="stat"><div class="stat-num">{len(sessions)}</div><div class="stat-label">Sessions</div></div>
  <div class="stat"><div class="stat-num">{len(decisions)}</div><div class="stat-label">Decisions</div></div>
  <div class="stat"><div class="stat-num">{len(workstreams)}</div><div class="stat-label">Workstreams</div></div>
  <div class="stat"><div class="stat-num">{len(agents)}</div><div class="stat-label">AI Agents</div></div>
</div>'''

# Timeline
if sessions:
    tl_items = []
    for s in sessions:
        mode_cls = esc(s['mode'])
        date_str = f'<span class="tl-date">{esc(s["date"])}</span>' if s['date'] else ''
        agents_str = ' '.join(f'<span class="tag tag-purple">{esc(a)}</span>' for a in s['agents'])
        tl_items.append(f'''<div class="tl-item tl-clickable" data-session="{esc(s["id"])}" role="button" tabindex="0">
  <div class="tl-dot {mode_cls}"></div>
  <div class="tl-head">
    <span class="tl-num">Session {esc(s["id"])}</span>
    {date_str}
    {tag_mode(s["mode"])}
    {agents_str}
    <span class="tl-link">View log →</span>
  </div>
  <div class="tl-summary">{esc(s["summary"])}</div>
</div>''')
    timeline_html = '\n'.join(tl_items)
else:
    timeline_html = '<div class="empty"><div class="empty-icon">📅</div><div class="empty-text">No sessions logged yet.</div></div>'

# Decisions
if decisions:
    dec_items = []
    for d in decisions:
        alts_html = ''
        if d['alternatives']:
            alts_list = ''.join(f'<li>{esc(a)}</li>' for a in d['alternatives'] if a)
            alts_html = f'<div class="detail-row"><span class="detail-label">Alternatives</span><span class="detail-val"><ul style="padding-left:16px;margin:0">{alts_list}</ul></span></div>'
        rat_html = f'<div class="detail-row"><span class="detail-label">Rationale</span><span class="detail-val">{esc(d["rationale"])}</span></div>' if d['rationale'] else ''
        sess_tag = f'<span class="tag tag-muted">Session {esc(d["sessionId"])}</span>' if d["sessionId"] else ""
        date_tag = f'<span class="tag tag-muted">{esc(d["date"])}</span>' if d["date"] else ""
        dec_items.append(f'''<div class="card">
  <div class="card-head">
    <span class="card-id">#{esc(d["id"])}</span>
    <span class="card-title">{esc(d["title"])}</span>
    {tag_status(d["status"])}
  </div>
  <div class="card-body">
    <div class="detail-row"><span class="detail-label">Decision</span><span class="detail-val">{esc(d["chosen"])}</span></div>
    {alts_html}
    {rat_html}
  </div>
  <div class="card-meta">
    {sess_tag}
    {date_tag}
  </div>
</div>''')
    decisions_html = '\n'.join(dec_items)
else:
    decisions_html = '<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No decisions logged yet.</div></div>'

# Workstreams
if workstreams:
    ws_items = []
    for w in workstreams:
        desc_row = f'<div class="card-body" style="margin-top:8px">{esc(w["description"])}</div>' if w.get('description') else ''
        ws_items.append(f'''<div class="card">
  <div class="card-head">
    <span class="card-id">#{esc(w["id"])}</span>
    <span class="card-title">{esc(w["name"])}</span>
    <span class="tag tag-teal">active</span>
  </div>
  {desc_row}
</div>''')
    workstreams_html = '\n'.join(ws_items)
else:
    workstreams_html = '<div class="empty"><div class="empty-icon">🔀</div><div class="empty-text">No workstreams detected in ENGRAM.md yet.</div></div>'

# Agents
if agents:
    agent_items = []
    for a in agents:
        initial = esc(a['name'][0].upper())
        role_cls = 'tag-purple' if a['participationMode'] == 'primary' else 'tag-amber'
        expertise_tags = ' '.join(f'<span class="tag tag-muted">{esc(e)}</span>' for e in a['expertise'])
        agent_items.append(f'''<div class="agent-card">
  <div class="agent-avatar">{initial}</div>
  <div class="agent-name">{esc(a["name"])}</div>
  <div class="agent-role">{esc(a["role"])}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
    <span class="tag {role_cls}">{esc(a["participationMode"])}</span>
    {expertise_tags}
  </div>
  <div style="font-size:12px;color:var(--muted)">{esc(a["sessions"])} session{"s" if a["sessions"] != 1 else ""}</div>
</div>''')
    agents_html = '\n'.join(agent_items)
else:
    agents_html = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🤖</div><div class="empty-text">No agents found in AGENTS.md yet.</div></div>'

# Open items
open_parts = []
problems = data['openItems']['problems']
tasks_list = data['openItems']['tasks']
questions = data['openItems']['questions']

if problems:
    sev_cls = {'P0':'tag-red','P1':'tag-amber','P2':'tag-purple'}
    prob_rows = ''.join(f'<div class="card" style="margin-bottom:10px"><div class="card-head"><span class="tag {sev_cls.get(p["severity"],"tag-muted")}">{esc(p["severity"])}</span><span class="card-title" style="font-size:14px">{esc(p["title"])}</span></div></div>' for p in problems)
    open_parts.append(f'<h3 style="font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px">Problems</h3>{prob_rows}')

if tasks_list:
    task_rows = ''.join(f'<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13.5px"><span style="color:var(--accent)">☐</span><span>{esc(t)}</span></div>' for t in tasks_list)
    open_parts.append(f'<h3 style="font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:16px 0 12px">Tasks</h3><div class="card" style="padding:0 16px">{task_rows}</div>')

if questions:
    q_rows = ''.join(f'<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13.5px"><span style="color:var(--muted)">{i+1}.</span><span>{esc(q)}</span></div>' for i, q in enumerate(questions))
    open_parts.append(f'<h3 style="font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:16px 0 12px">Questions</h3><div class="card" style="padding:0 16px">{q_rows}</div>')

open_items_html = '\n'.join(open_parts) if open_parts else '<div class="empty"><div class="empty-icon">✅</div><div class="empty-text">No open items — looking good!</div></div>'

# ── Verbatim log (full turn-by-turn dialog) ──────────────────────────────
log('  Parsing ENGRAM-LOG.md for verbatim dialog...')

def parse_log_to_html(log_text):
    """Parse ENGRAM-LOG.md into styled turn-by-turn HTML."""
    if not log_text.strip():
        return '<div class="empty"><div class="empty-icon">📝</div><div class="empty-text">No log entries yet. Sessions will appear here after your first checkpoint.</div></div>'

    # Split into sessions on ### Session N headers
    session_blocks = re.split(r'(?=^### Session \d+)', log_text, flags=re.MULTILINE)
    html_parts = []

    for block in session_blocks:
        block = block.strip()
        if not block:
            continue

        # Parse session header — skip blocks without a valid header (e.g. file preamble)
        hdr = re.match(r'^### Session (\d+)\s*[—-]\s*(\d{4}-\d{2}-\d{2})\s*[—-]\s*Mode:\s*([^\n]+)', block, re.MULTILINE)
        if not hdr:
            continue
        sid   = hdr.group(1)
        sdate = hdr.group(2)
        smode = hdr.group(3).strip().lower()
        # Canonicalize mode
        smode_base = re.split(r'[\s+/&]+', smode)[0] if smode else 'brainstorm'
        valid_modes = {'brainstorm', 'implementation', 'review', 'admin'}
        if smode_base not in valid_modes:
            smode_base = 'brainstorm'

        mode_cls_map = {'brainstorm':'tag-purple','implementation':'tag-teal','review':'tag-amber','admin':'tag-muted'}
        mode_cls = mode_cls_map.get(smode_base, 'tag-muted')

        # Split block into individual turns
        # A turn starts with **[HH:MM UTC] Name:** on its own line
        turn_pattern = re.compile(r'^\*\*\[(\d{2}:\d{2}(?::\d{2})?\s*UTC)\]\s*([^:*]+?):\*\*', re.MULTILINE)
        turn_matches = list(turn_pattern.finditer(block))

        turns_html = []
        for i, tm in enumerate(turn_matches):
            ts       = tm.group(1).strip()
            speaker  = strip_model_version(tm.group(2).strip())
            # Content: everything from after the ** line to the next turn or end of block
            content_start = tm.end()
            content_end   = turn_matches[i+1].start() if i+1 < len(turn_matches) else len(block)
            raw_content   = block[content_start:content_end].strip()

            # Strip leading '> ' quote markers from each line
            content_lines = []
            for line in raw_content.split('\n'):
                if line.startswith('> '):
                    content_lines.append(line[2:])
                elif line.startswith('>'):
                    content_lines.append(line[1:])
                else:
                    content_lines.append(line)
            content = '\n'.join(content_lines).strip()

            # Detect if human or AI speaker
            is_ai = bool(known_ai.search(speaker))
            bubble_cls = 'turn-ai' if is_ai else 'turn-human'
            speaker_cls = 'turn-speaker-ai' if is_ai else 'turn-speaker-human'

            # Convert content: escape HTML but preserve line breaks and inline code
            def render_content(text):
                # Escape HTML
                text = text.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
                # Inline code: `code`
                text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
                # Bold: **text**
                text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
                # Paragraph breaks
                paras = re.split(r'\n{2,}', text)
                return ''.join(f'<p>{p.replace(chr(10), "<br>")}</p>' for p in paras if p.strip())

            rendered = render_content(content)
            if not rendered:
                continue

            turns_html.append(f'''<div class="turn {bubble_cls}">
  <div class="turn-meta">
    <span class="{speaker_cls}">{esc(speaker)}</span>
    <span class="turn-ts">{esc(ts)}</span>
    <button class="copy-btn" data-copy="{content.replace(chr(34), '&quot;').replace(chr(10), '&#10;')}" title="Copy to clipboard" aria-label="Copy">Copy</button>
  </div>
  <div class="turn-body">{rendered}</div>
</div>''')

        if not turns_html:
            # Fallback: show raw block (no recognized turn markers)
            content_raw = re.sub(r'^### Session.*?\n', '', block, count=1, flags=re.MULTILINE).strip()
            if content_raw:
                turns_html.append(f'<div class="turn turn-human"><div class="turn-body"><p>{esc(content_raw[:500])}</p></div></div>')

        turns_joined = '\n'.join(turns_html)
        html_parts.append(f'''<details class="session-block" id="session-{esc(sid)}" open>
  <summary class="session-summary">
    <span class="tl-num">Session {esc(sid)}</span>
    <span class="tl-date">{esc(sdate)}</span>
    <span class="tag {mode_cls}">{esc(smode_base)}</span>
    <span class="turn-count">{len(turns_html)} turn{"s" if len(turns_html) != 1 else ""}</span>
  </summary>
  <div class="session-turns">
{turns_joined}
  </div>
</details>''')

    return '\n'.join(html_parts) if html_parts else '<div class="empty"><div class="empty-icon">📝</div><div class="empty-text">No sessions found in ENGRAM-LOG.md.</div></div>'

log_html = parse_log_to_html(log_text)
log(f'    Log HTML generated ({len(log_text)} bytes of source)')

last_updated = datetime.now(timezone.utc).strftime('%b %d, %Y at %H:%M UTC')

# ── Read and update VISUALIZER.html ──────────────────────────────────────
with open(visualizer_path, 'r', encoding='utf-8') as f:
    content = f.read()

import re as _re

def inject(content, sentinel, replacement):
    """Replace content between <!-- BEGIN_X --> and <!-- END_X --> markers."""
    pat = _re.compile(r'<!--\s*BEGIN_' + sentinel + r'\s*-->[\s\S]*?<!--\s*END_' + sentinel + r'\s*-->', _re.DOTALL)
    new_block = f'<!-- BEGIN_{sentinel} -->\n{replacement}\n<!-- END_{sentinel} -->'
    if not pat.search(content):
        print(f'  ✗ Sentinel BEGIN_{sentinel} not found in VISUALIZER.html')
    return pat.sub(new_block, content)

content = inject(content, 'ENGRAM_STATS', stats_html)
content = inject(content, 'ENGRAM_TIMELINE', timeline_html)
content = inject(content, 'ENGRAM_DECISIONS', decisions_html)
content = inject(content, 'ENGRAM_WORKSTREAMS', workstreams_html)
content = inject(content, 'ENGRAM_AGENTS', agents_html)
content = inject(content, 'ENGRAM_OPEN_ITEMS', open_items_html)
# ── Artifacts scanner ─────────────────────────────────────────────────────
log('  Scanning for project artifacts...')

CORE_FILES = {
    'STATE.md','ENGRAM.md','ENGRAM-LOG.md','DECISIONS.md','AGENTS.md',
    'HANDOFF.md','ENGRAM-INDEX.md','VISUALIZER.html','CLAUDE.md','README.md',
    'LICENSE','update-visualizer.sh','engram-watch.sh','init-engram.sh',
    '.engram-watch.pid','.engram-watch.log',
}
SKIP_DIRS  = {'.git','node_modules','__pycache__','.next','.venv','venv','dist','build','.agents','_agents','.agent','_agent'}
CODE_EXT   = {'.py','.js','.ts','.jsx','.tsx','.sh','.rb','.go','.rs','.java','.c','.cpp','.h','.css','.html'}
DATA_EXT   = {'.json','.yaml','.yml','.csv','.toml','.env','.xml','.sql'}
DOC_EXT    = {'.md','.txt','.pdf','.rst','.org'}

artifacts_found = []
for root, dirs, files in os.walk(project_dir):
    # Prune unwanted dirs in-place
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
    rel_root = os.path.relpath(root, project_dir)
    for fname in sorted(files):
        if fname in CORE_FILES or fname.startswith('.'):
            continue
        fpath = os.path.join(root, fname)
        rel   = os.path.relpath(fpath, project_dir)
        try:
            stat = os.stat(fpath)
            size = stat.st_size
            mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).strftime('%Y-%m-%d')
        except OSError:
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext in DOC_EXT:      cat = 'doc'
        elif ext in CODE_EXT:   cat = 'code'
        elif ext in DATA_EXT:   cat = 'data'
        else:                   cat = 'other'
        def fmt_size(b):
            if b < 1024:      return f'{b} B'
            if b < 1048576:   return f'{b//1024} KB'
            return f'{b//1048576} MB'
        artifacts_found.append({'name': fname, 'rel': rel, 'size': fmt_size(size), 'mtime': mtime, 'cat': cat})

log(f'    Found {len(artifacts_found)} artifact(s)')

cat_label = {'doc':'📄 Document','code':'💻 Code','data':'📊 Data','other':'📦 Other'}
cat_tag   = {'doc':'tag-teal','code':'tag-purple','data':'tag-amber','other':'tag-muted'}

if artifacts_found:
    from collections import defaultdict
    by_cat = defaultdict(list)
    for a in artifacts_found:
        by_cat[a['cat']].append(a)
    art_parts = []
    for cat in ['doc','code','data','other']:
        items = by_cat.get(cat, [])
        if not items:
            continue
        rows = ''
        for a in items:
            rows += f'''<tr>
  <td style="padding:8px 12px;font-size:13px;font-weight:500">{esc(a["name"])}</td>
  <td style="padding:8px 12px;font-size:12px;color:var(--muted);font-family:monospace">{esc(a["rel"])}</td>
  <td style="padding:8px 12px;font-size:12px;color:var(--muted);text-align:right">{esc(a["size"])}</td>
  <td style="padding:8px 12px;font-size:12px;color:var(--muted)">{esc(a["mtime"])}</td>
</tr>'''
        art_parts.append(f'''<h3 style="font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:20px 0 10px">{cat_label[cat]} ({len(items)})</h3>
<div class="card" style="padding:0;overflow:hidden">
<table style="width:100%;border-collapse:collapse">
  <thead><tr style="border-bottom:1px solid var(--border)">
    <th style="padding:8px 12px;font-size:11px;color:var(--muted);text-align:left;font-weight:600">File</th>
    <th style="padding:8px 12px;font-size:11px;color:var(--muted);text-align:left;font-weight:600">Path</th>
    <th style="padding:8px 12px;font-size:11px;color:var(--muted);text-align:right;font-weight:600">Size</th>
    <th style="padding:8px 12px;font-size:11px;color:var(--muted);text-align:left;font-weight:600">Modified</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>
</div>''')
    artifacts_html = '\n'.join(art_parts)
else:
    artifacts_html = '<div class="empty"><div class="empty-icon">📂</div><div class="empty-text">No artifacts found yet. Files you create during sessions will appear here.</div></div>'

content = inject(content, 'ENGRAM_LOG', log_html)
content = inject(content, 'ENGRAM_ARTIFACTS', artifacts_html)
content = inject(content, 'ENGRAM_TITLE', esc(project_name))
content = inject(content, 'ENGRAM_PROJECT_NAME', f'<div class="logo-sub">{esc(project_name)}</div>')
content = inject(content, 'ENGRAM_LAST_UPDATED', esc(last_updated))

with open(visualizer_path, 'w', encoding='utf-8') as f:
    f.write(content)

log('  ✓ VISUALIZER.html updated.')
log('')
print(f'✓ Done!')
print(f'  Project:     {project_name}')
print(f'  Sessions:    {len(sessions)}')
print(f'  Decisions:   {len(decisions)}')
print(f'  Workstreams: {len(workstreams)}')
print(f'  Agents:      {len(agents)}')
print(f'  Open items:  {len(problems)} problems · {len(tasks_list)} tasks · {len(questions)} questions')
print('')
print(f'  open "{visualizer_path}"')
PYEOF
