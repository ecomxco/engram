---
description: Regenerate VISUALIZER.html with live project data from engram markdown files
---
# Update Visualizer

Run this after every checkpoint to keep the Visualizer in sync with the project.

## When to Run

Run this workflow automatically as part of every `checkpoint` command, after STATE.md and ENGRAM.md have been updated.

## Steps

1. Confirm the engram project directory (usually the current working directory or the directory containing this `.agents/` folder).

2. Identify the path to `update-visualizer.sh`. It lives in the root of the engram repository (not the project directory). If the user installed engram by cloning the repo, it's at the repo root. If they ran `init-engram.sh`, it was copied to the project directory.

3. Run the script:

```bash
# If update-visualizer.sh is in the current project directory:
./update-visualizer.sh

# If pointing at a different project directory:
./update-visualizer.sh --dir /path/to/project
```

1. Confirm exit 0. The script prints a summary of sessions, decisions, workstreams, and agents parsed.

2. Open the visualizer in the browser to confirm (optional — only needed for manual verification):

```bash
open ./VISUALIZER.html
```

## Context Engineering Note

This script reads only the five *processed* files (`STATE.md`, `ENGRAM.md`, `DECISIONS.md`, `AGENTS.md`, and the session headers from `ENGRAM-LOG.md`) — not the full raw log. This is intentional: the Index/Summary layer exists precisely so that neither humans nor agents need to load the entire log. The visualizer is a downstream consumer of the same processed layer that protects your context window.
