#!/bin/bash
# ============================================================================
# Engram Initializer v5.0
# Thin wrapper around `npx engram-protocol setup` — both install paths now
# produce identical output from the same .tmpl template source.
#
# Usage:
#   ./init-engram.sh
#   ./init-engram.sh --name "My Project" --author "Jane" --email "jane@co.com"
#   ./init-engram.sh --dir /path/to/folder
#   ./init-engram.sh --force              # overwrite existing files (backs up first)
#   ./init-engram.sh --dry-run            # preview what would be created
#   ./init-engram.sh --skip-existing      # skip files that already exist
#   ./init-engram.sh --uninstall          # remove engram files (restores backups)
#
# Safety features:
#   - Pre-install backup of existing files to .engram-backup/
#   - Install manifest (.engram-manifest) for clean uninstall
#   - Per-file collision handling: skip, overwrite, or abort per file
#   - --dry-run mode previews all operations without touching anything
#   - --uninstall removes only engram-managed files, restores backups
#   - .gitignore append mode (preserves existing rules)
#
# Changes from v4.1 → v5.0:
#   - Delegates all file creation to npx engram-protocol setup (single source of truth)
#   - Removed ~900 lines of heredoc templates
#   - Removed all sed placeholder replacement (npx handles this now)
#   - Requires Node.js 18+ (npx)
# ============================================================================

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────
_UNSET="__UNSET__"
PROJECT_DIR="."
PROJECT_NAME="$_UNSET"
AUTHOR_NAME="$_UNSET"
AUTHOR_EMAIL="$_UNSET"
PROJECT_DESC="$_UNSET"
TEMPLATE="default"
FORCE=false
DRY_RUN=false
UNINSTALL=false
SKIP_EXISTING=false
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
VERSION="4.0"
INSTALLER_VERSION="5.0"

# Collision mode: "ask", "skip_all", "overwrite_all"
COLLISION_MODE="ask"

# Tracking arrays
MANIFEST_CREATED=()
MANIFEST_COPIED=()
MANIFEST_BACKED_UP=()
MANIFEST_SKIPPED=()
GITIGNORE_MODE="created"

# ── Color helpers ─────────────────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  _GREEN='\033[0;32m'
  _YELLOW='\033[0;33m'
  _RED='\033[0;31m'
  _CYAN='\033[0;36m'
  _DIM='\033[2m'
  _RESET='\033[0m'
else
  _GREEN='' _YELLOW='' _RED='' _CYAN='' _DIM='' _RESET=''
fi

ok()   { printf "${_GREEN}✓${_RESET} %s\n" "$*"; }
warn() { printf "${_YELLOW}⚠${_RESET} %s\n" "$*"; }
skip() { printf "${_DIM}○${_RESET} %s\n" "$*"; }
err()  { printf "${_RED}✗${_RESET} %s\n" "$*" >&2; }
info() { printf "${_CYAN}→${_RESET} %s\n" "$*"; }

# ── Cross-platform sed ───────────────────────────────────────────────────
sed_inplace() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

# ── Backup a file before overwriting ─────────────────────────────────────
backup_file() {
  local relpath="$1"
  local src="$PROJECT_DIR/$relpath"
  local backup_dir="$PROJECT_DIR/.engram-backup"
  local dest="$backup_dir/$relpath"

  if [ ! -f "$src" ]; then
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  MANIFEST_BACKED_UP+=("$relpath")
}

# ── Check for existing files and handle collisions before npx ────────────
check_collision() {
  local filename="$1"
  local filepath="$PROJECT_DIR/$filename"

  # File doesn't exist: no collision
  if [ ! -f "$filepath" ]; then
    return 0
  fi

  # File exists: handle based on collision mode
  case "$COLLISION_MODE" in
    overwrite_all)
      backup_file "$filename"
      return 0
      ;;
    skip_all)
      skip "$filename (exists, skipped)"
      MANIFEST_SKIPPED+=("$filename")
      return 1
      ;;
    ask)
      warn "$filename already exists."
      printf "  (s)kip  (o)verwrite  (S)kip all  (O)verwrite all  (a)bort: "
      local choice
      read -r choice || choice="s"
      case "$choice" in
        s) skip "$filename (skipped)"; MANIFEST_SKIPPED+=("$filename"); return 1 ;;
        o) backup_file "$filename"; return 0 ;;
        S) COLLISION_MODE="skip_all"; skip "$filename (skipped)"; MANIFEST_SKIPPED+=("$filename"); return 1 ;;
        O) COLLISION_MODE="overwrite_all"; backup_file "$filename"; return 0 ;;
        a) echo "Aborted."; exit 0 ;;
        *) skip "$filename (skipped — invalid choice)"; MANIFEST_SKIPPED+=("$filename"); return 1 ;;
      esac
      ;;
  esac
}

# ── Handle .gitignore with sentinel-based append mode ────────────────────
handle_gitignore() {
  local gitignore="$PROJECT_DIR/.gitignore"

  local engram_rules
  engram_rules=$(cat << 'GITRULES'
# ── Engram managed rules (do not edit between these markers) ──

# OS files
.DS_Store
Thumbs.db

# Editor files
*.swp
*.swo
*~
.vscode/
.idea/

# Large media (uncomment if needed)
# *.mp4
# *.mov
# *.wav

# Temporary files
*.tmp
*.bak

# Engram internal
.engram-backup/
.engram-manifest
.engram-watch.pid
.engram-watch.log

# Optional: Ignore archived logs if they're too large for your repo
# ENGRAM-LOG-*.md

# ── End engram rules ──
GITRULES
)

  if $DRY_RUN; then
    if [ -f "$gitignore" ]; then
      info "[dry-run] Would append engram rules to existing .gitignore"
    else
      info "[dry-run] Would create .gitignore with engram rules"
    fi
    return 0
  fi

  if [ -f "$gitignore" ]; then
    backup_file ".gitignore"

    # Strip old engram section if present (idempotent re-install)
    if grep -q '^# ── Engram managed rules' "$gitignore" 2>/dev/null; then
      sed_inplace '/^# ── Engram managed rules/,/^# ── End engram rules ──$/d' "$gitignore"
    fi

    printf '\n%s\n' "$engram_rules" >> "$gitignore"
    GITIGNORE_MODE="appended"
    ok ".gitignore — engram rules appended (existing rules preserved)"
  else
    printf '%s\n' "$engram_rules" > "$gitignore"
    GITIGNORE_MODE="created"
    ok ".gitignore — created with engram rules"
  fi
}

# ── Write install manifest ───────────────────────────────────────────────
write_manifest() {
  local manifest="$PROJECT_DIR/.engram-manifest"

  if $DRY_RUN; then
    info "[dry-run] Would write manifest to .engram-manifest"
    return 0
  fi

  cat > "$manifest" << MANIFEST_EOF
# Engram Install Manifest
# Generated by init-engram.sh (installer v$INSTALLER_VERSION)
# Do not edit — used by --uninstall
installer_version=$INSTALLER_VERSION
engram_version=$VERSION
installed_at=$TIMESTAMP
gitignore_mode=$GITIGNORE_MODE
MANIFEST_EOF

  for f in ${MANIFEST_CREATED[@]+"${MANIFEST_CREATED[@]}"}; do
    echo "created=$f" >> "$manifest"
  done

  for f in ${MANIFEST_COPIED[@]+"${MANIFEST_COPIED[@]}"}; do
    echo "copied=$f" >> "$manifest"
  done

  for f in ${MANIFEST_BACKED_UP[@]+"${MANIFEST_BACKED_UP[@]}"}; do
    echo "backed_up=$f" >> "$manifest"
  done

  for f in ${MANIFEST_SKIPPED[@]+"${MANIFEST_SKIPPED[@]}"}; do
    echo "skipped=$f" >> "$manifest"
  done
}

# ── Uninstall ─────────────────────────────────────────────────────────────
do_uninstall() {
  local manifest="$PROJECT_DIR/.engram-manifest"

  if [ ! -f "$manifest" ]; then
    err "No manifest found at $manifest"
    err "Cannot uninstall without a manifest. Was engram installed with v4.1+?"
    exit 1
  fi

  echo ""
  echo "Engram Uninstaller"
  echo "Project: $PROJECT_DIR"
  echo ""

  if ! $FORCE; then
    echo "The following files will be removed:"
    grep '^created=' "$manifest" | cut -d= -f2- | while IFS= read -r f; do
      if [ -f "$PROJECT_DIR/$f" ]; then
        echo "  Remove: $f"
      fi
    done
    grep '^copied=' "$manifest" | cut -d= -f2- | while IFS= read -r f; do
      if [ -f "$PROJECT_DIR/$f" ]; then
        echo "  Remove: $f"
      fi
    done

    local backed_count
    backed_count=$(grep -c '^backed_up=' "$manifest" 2>/dev/null || echo 0)
    if [ "$backed_count" -gt 0 ]; then
      echo ""
      echo "The following files will be restored from backup:"
      grep '^backed_up=' "$manifest" | cut -d= -f2- | while IFS= read -r f; do
        if [ -f "$PROJECT_DIR/.engram-backup/$f" ]; then
          echo "  Restore: $f"
        fi
      done
    fi

    echo ""
    read -rp "Continue? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      echo "Aborted."
      exit 0
    fi
  fi

  # Remove created files
  grep '^created=' "$manifest" | cut -d= -f2- | while IFS= read -r f; do
    if [ -f "$PROJECT_DIR/$f" ]; then
      rm "$PROJECT_DIR/$f"
      ok "Removed: $f"
    fi
  done

  # Remove copied files
  grep '^copied=' "$manifest" | cut -d= -f2- | while IFS= read -r f; do
    if [ -f "$PROJECT_DIR/$f" ]; then
      rm "$PROJECT_DIR/$f"
      ok "Removed: $f"
    fi
  done

  # Restore backed up files
  grep '^backed_up=' "$manifest" | cut -d= -f2- | while IFS= read -r f; do
    local backup="$PROJECT_DIR/.engram-backup/$f"
    if [ -f "$backup" ]; then
      mkdir -p "$(dirname "$PROJECT_DIR/$f")"
      cp "$backup" "$PROJECT_DIR/$f"
      ok "Restored: $f"
    fi
  done

  # Handle .gitignore — strip engram section if it was appended
  local gitignore_mode
  gitignore_mode=$(grep '^gitignore_mode=' "$manifest" | cut -d= -f2- || echo "created")
  if [ "$gitignore_mode" = "appended" ] && [ -f "$PROJECT_DIR/.gitignore" ]; then
    if grep -q '^# ── Engram managed rules' "$PROJECT_DIR/.gitignore" 2>/dev/null; then
      sed_inplace '/^# ── Engram managed rules/,/^# ── End engram rules ──$/d' "$PROJECT_DIR/.gitignore"
      ok "Stripped engram rules from .gitignore (custom rules preserved)"
    fi
  fi

  # Clean up empty .agents/ directories
  if [ -d "$PROJECT_DIR/.agents/workflows" ]; then
    rmdir "$PROJECT_DIR/.agents/workflows" 2>/dev/null && ok "Removed empty .agents/workflows/" || true
  fi
  if [ -d "$PROJECT_DIR/.agents" ]; then
    rmdir "$PROJECT_DIR/.agents" 2>/dev/null && ok "Removed empty .agents/" || true
  fi

  # Remove manifest and backup directory
  rm -f "$manifest"
  if [ -d "$PROJECT_DIR/.engram-backup" ]; then
    rm -rf "$PROJECT_DIR/.engram-backup"
    ok "Removed .engram-backup/"
  fi

  echo ""
  ok "Engram uninstalled from $PROJECT_DIR"
  exit 0
}

# ── Parse arguments ───────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --name) PROJECT_NAME="$2"; shift 2 ;;
    --author) AUTHOR_NAME="$2"; shift 2 ;;
    --email) AUTHOR_EMAIL="$2"; shift 2 ;;
    --desc) PROJECT_DESC="$2"; shift 2 ;;
    --dir) PROJECT_DIR="$2"; shift 2 ;;
    --template) TEMPLATE="$2"; shift 2 ;;
    --force) FORCE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --skip-existing) SKIP_EXISTING=true; shift ;;
    --uninstall) UNINSTALL=true; shift ;;
    --version) echo "Engram v$VERSION (installer v$INSTALLER_VERSION)"; exit 0 ;;
    -h|--help)
      cat << 'HELPTEXT'
Engram Initializer v5.0

Usage: init-engram.sh [OPTIONS]

Options:
  --name NAME         Project name (will prompt if not provided)
  --author NAME       Author name (will prompt if not provided)
  --email EMAIL       Author email (optional)
  --desc DESC         One-line project description (will prompt if not provided)
  --dir DIR           Target directory (default: current directory)
  --template TYPE     Template type: default, research, software, startup, writing
  --force             Overwrite existing files (backs up originals first)
  --dry-run           Preview all operations without creating any files
  --skip-existing     Skip files that already exist (don't prompt)
  --uninstall         Remove engram files and restore backups
  --version           Show version information
  -h, --help          Show this help message

Requires Node.js 18+ (uses npx engram-protocol under the hood).

Examples:
  ./init-engram.sh
  ./init-engram.sh --name "Quantum Notes" --author "Alice"
  ./init-engram.sh --dir ~/projects/new-idea --dry-run
  ./init-engram.sh --dir ~/projects/existing --skip-existing
  ./init-engram.sh --dir ~/projects/old --uninstall
HELPTEXT
      exit 0
      ;;
    *) err "Unknown option: $1"; echo "Use -h for help."; exit 1 ;;
  esac
done

# ── Set collision mode from flags ─────────────────────────────────────────
if $SKIP_EXISTING; then
  COLLISION_MODE="skip_all"
fi
if $FORCE; then
  COLLISION_MODE="overwrite_all"
fi

# ── Handle uninstall ──────────────────────────────────────────────────────
if $UNINSTALL; then
  do_uninstall
fi

# ── Check Node.js / npx availability ─────────────────────────────────────
if ! command -v npx &>/dev/null; then
  err "Node.js is required but not found."
  err "Install Node.js 18+ from https://nodejs.org/ and try again."
  exit 1
fi

NODE_VERSION=$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)
if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" -lt 18 ] 2>/dev/null; then
  err "Node.js 18+ is required (found v$NODE_VERSION)."
  err "Update Node.js from https://nodejs.org/ and try again."
  exit 1
fi

# ── Interactive prompts for fields not provided via arguments ─────────────
if ! $DRY_RUN && [ -t 0 ]; then
  if [ "$PROJECT_NAME" = "$_UNSET" ]; then
    read -rp "Project name: " PROJECT_NAME
  fi
  if [ "$AUTHOR_NAME" = "$_UNSET" ]; then
    read -rp "Author name: " AUTHOR_NAME
  fi
  if [ "$AUTHOR_EMAIL" = "$_UNSET" ]; then
    read -rp "Author email (optional, press Enter to skip): " AUTHOR_EMAIL
  fi
  if [ "$PROJECT_DESC" = "$_UNSET" ]; then
    read -rp "One-line project description: " PROJECT_DESC
  fi
elif ! $DRY_RUN && ! [ -t 0 ]; then
  [ "$AUTHOR_EMAIL" = "$_UNSET" ] && AUTHOR_EMAIL=""
  [ "$PROJECT_DESC" = "$_UNSET" ] && PROJECT_DESC=""
fi

# ── Validate required fields ──────────────────────────────────────────────
if [ "$PROJECT_NAME" = "$_UNSET" ] || [ "$AUTHOR_NAME" = "$_UNSET" ]; then
  if ! [ -t 0 ]; then
    err "Non-interactive mode requires --name and --author flags."
  else
    err "Project name and author name are required."
  fi
  exit 1
fi

# ── Sanitize unset optional fields ────────────────────────────────────────
[ "$AUTHOR_EMAIL" = "$_UNSET" ] && AUTHOR_EMAIL=""
[ "$PROJECT_DESC" = "$_UNSET" ] && PROJECT_DESC=""

EMAIL_LINE=""
if [ -n "$AUTHOR_EMAIL" ]; then
  EMAIL_LINE=" ($AUTHOR_EMAIL)"
fi

# ── Create target directory if needed ─────────────────────────────────────
mkdir -p "$PROJECT_DIR"

# Resolve to absolute path for npx
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"

echo ""
if $DRY_RUN; then
  info "DRY RUN — previewing engram installation in: $PROJECT_DIR"
else
  echo "Creating engram architecture in: $PROJECT_DIR"
fi
echo "  Project: $PROJECT_NAME"
echo "  Author:  $AUTHOR_NAME$EMAIL_LINE"
echo "  Version: v$VERSION (installer v$INSTALLER_VERSION)"
echo ""

# ── Detect existing manifest (re-install / upgrade) ──────────────────────
if [ -f "$PROJECT_DIR/.engram-manifest" ] && ! $DRY_RUN; then
  local_installer_ver=$(grep '^installer_version=' "$PROJECT_DIR/.engram-manifest" | cut -d= -f2- || echo "unknown")
  if [ "$local_installer_ver" = "$INSTALLER_VERSION" ]; then
    info "Re-installing engram (same installer version: v$INSTALLER_VERSION)"
  else
    info "Upgrading engram installer from v$local_installer_ver to v$INSTALLER_VERSION"
  fi
  echo ""
fi

# ── Pre-flight: check collisions for known files ─────────────────────────
# The npx command will create these files. We need to handle collisions
# BEFORE calling npx so we can back up existing files.
KNOWN_FILES=(
  CLAUDE.md AGENTS.md README.md STATE.md
  ENGRAM-LOG.md ENGRAM-INDEX.md ENGRAM.md DECISIONS.md
  .mcp.json .gitignore
  update-visualizer.sh VISUALIZER.html engram-watch.sh
)

# Check if engram project already exists (npx will refuse if STATE.md exists)
NEEDS_FORCE=false
if [ -f "$PROJECT_DIR/STATE.md" ]; then
  NEEDS_FORCE=true
fi

FILES_TO_CREATE=()
for f in "${KNOWN_FILES[@]}"; do
  if $DRY_RUN; then
    if [ -f "$PROJECT_DIR/$f" ]; then
      info "[dry-run] Would overwrite: $f"
    else
      info "[dry-run] Would create: $f"
    fi
    MANIFEST_CREATED+=("$f")
  elif check_collision "$f"; then
    FILES_TO_CREATE+=("$f")
    MANIFEST_CREATED+=("$f")
  fi
done

# Also check for workflow files
WORKFLOW_DIR_EXISTS=false
if [ -d "$PROJECT_DIR/.agents/workflows" ]; then
  WORKFLOW_DIR_EXISTS=true
fi

if $DRY_RUN; then
  info "[dry-run] Would create .agents/workflows/ with workflow definitions"
  handle_gitignore
  write_manifest
  echo ""
  info "DRY RUN COMPLETE — no files were created or modified"
  echo ""
  echo "  Files that would be created: ${#MANIFEST_CREATED[@]}+"
  echo ""
  echo "To install for real, run without --dry-run."
  exit 0
fi

# ── If all files were skipped, nothing to do ──────────────────────────────
if [ ${#FILES_TO_CREATE[@]} -eq 0 ] && [ ${#MANIFEST_SKIPPED[@]} -gt 0 ]; then
  echo ""
  warn "All files already exist and were skipped."
  echo "Use --force to overwrite (originals will be backed up)."
  exit 0
fi

# ── Remove STATE.md temporarily if it exists (npx refuses to overwrite) ──
STATE_REMOVED=false
if [ "$NEEDS_FORCE" = true ] && [ -f "$PROJECT_DIR/STATE.md" ]; then
  # We already backed it up in check_collision if needed
  mv "$PROJECT_DIR/STATE.md" "$PROJECT_DIR/STATE.md.engram-tmp"
  STATE_REMOVED=true
fi

# ── Delegate file creation to npx engram-protocol setup ──────────────────
info "Running npx engram-protocol setup..."
echo ""

NPX_ARGS=(
  "engram-protocol" "setup"
  "--name" "$PROJECT_NAME"
  "--author" "$AUTHOR_NAME"
  "--template" "$TEMPLATE"
  "--dir" "$PROJECT_DIR"
  "--all"
)

if [ -n "$AUTHOR_EMAIL" ]; then
  NPX_ARGS+=("--email" "$AUTHOR_EMAIL")
fi
if [ -n "$PROJECT_DESC" ]; then
  NPX_ARGS+=("--desc" "$PROJECT_DESC")
fi

NPX_OUTPUT=""
NPX_EXIT=0
NPX_OUTPUT=$(npx -y "${NPX_ARGS[@]}" 2>&1) || NPX_EXIT=$?

# Restore STATE.md if npx failed
if [ "$STATE_REMOVED" = true ] && [ -f "$PROJECT_DIR/STATE.md.engram-tmp" ]; then
  if [ $NPX_EXIT -ne 0 ]; then
    mv "$PROJECT_DIR/STATE.md.engram-tmp" "$PROJECT_DIR/STATE.md"
  else
    rm -f "$PROJECT_DIR/STATE.md.engram-tmp"
  fi
fi

if [ $NPX_EXIT -ne 0 ]; then
  err "npx engram-protocol setup failed (exit code $NPX_EXIT):"
  echo "$NPX_OUTPUT" >&2
  exit 1
fi

# Show npx output
echo "$NPX_OUTPUT"
echo ""

# ── Remove files that were skipped in collision check ─────────────────────
# npx creates ALL files unconditionally, so we need to remove ones the user
# chose to skip and restore their originals from backup
for f in ${MANIFEST_SKIPPED[@]+"${MANIFEST_SKIPPED[@]}"}; do
  if [ -f "$PROJECT_DIR/.engram-backup/$f" ]; then
    cp "$PROJECT_DIR/.engram-backup/$f" "$PROJECT_DIR/$f"
  fi
done

# ── Enhance .gitignore (npx only creates a minimal one) ──────────────────
handle_gitignore

# ── Scan created files into manifest ─────────────────────────────────────
# Re-scan the directory to capture all files npx actually created
# (including workflow files we didn't enumerate above)
MANIFEST_CREATED=()
for f in CLAUDE.md AGENTS.md README.md STATE.md ENGRAM-LOG.md ENGRAM-INDEX.md ENGRAM.md DECISIONS.md .mcp.json; do
  if [ -f "$PROJECT_DIR/$f" ]; then
    # Only add if not in skipped list
    local_skip=false
    for s in ${MANIFEST_SKIPPED[@]+"${MANIFEST_SKIPPED[@]}"}; do
      if [ "$s" = "$f" ]; then local_skip=true; break; fi
    done
    if ! $local_skip; then
      MANIFEST_CREATED+=("$f")
    fi
  fi
done

# Track workflow files
if [ -d "$PROJECT_DIR/.agents/workflows" ]; then
  for wf in "$PROJECT_DIR/.agents/workflows/"*.md; do
    if [ -f "$wf" ]; then
      MANIFEST_CREATED+=(".agents/workflows/$(basename "$wf")")
    fi
  done
fi

# Track dashboard tools
MANIFEST_COPIED=()
for f in update-visualizer.sh VISUALIZER.html engram-watch.sh; do
  if [ -f "$PROJECT_DIR/$f" ]; then
    local_skip=false
    for s in ${MANIFEST_SKIPPED[@]+"${MANIFEST_SKIPPED[@]}"}; do
      if [ "$s" = "$f" ]; then local_skip=true; break; fi
    done
    if ! $local_skip; then
      MANIFEST_COPIED+=("$f")
    fi
  fi
done

# ── Write install manifest ───────────────────────────────────────────────
write_manifest

# ── Summary ───────────────────────────────────────────────────────────────
echo ""

# Report skipped files
if [ ${#MANIFEST_SKIPPED[@]} -gt 0 ]; then
  echo "Skipped (already existed):"
  for f in "${MANIFEST_SKIPPED[@]}"; do
    echo "  $f"
  done
  echo ""
fi

# Report backed up files
if [ ${#MANIFEST_BACKED_UP[@]} -gt 0 ]; then
  echo "Backed up (originals in .engram-backup/):"
  for f in "${MANIFEST_BACKED_UP[@]}"; do
    echo "  $f"
  done
  echo ""
fi

echo "To start brainstorming, open a new Claude session in this folder."
echo "Claude will read STATE.md first and pick up where you left off."
echo ""
echo "Quick commands:"
echo "  'checkpoint'       — sync all docs (log, summary, state)"
echo "  'status'           — get a concise summary of where things stand"
echo "  'reconcile now'    — rebuild summary from the full log"
echo "  'handoff'          — write HANDOFF.md for device/agent switching"
echo "  'context pressure' — run handoff ceremony when context window is getting tight"
echo ""
if [ -f "$PROJECT_DIR/VISUALIZER.html" ] && [ -f "$PROJECT_DIR/engram-watch.sh" ]; then
  echo "Dashboard (auto-updates every 30s when engram-watch.sh is running):"
  echo "  ./engram-watch.sh --daemon && open VISUALIZER.html"
  echo ""
fi
echo "To uninstall: ./init-engram.sh --dir \"$PROJECT_DIR\" --uninstall"
