# Contributing to Engram

Thank you for your interest in contributing! Engram is a lightweight protocol — the best contributions are ones that keep it that way.

---

## Ways to Contribute

### 🐛 Bug Reports

Open an issue using the **Bug Report** template. Include:

- What you expected to happen
- What actually happened
- The AI model and interface you were using (Claude, ChatGPT, Cursor, etc.)

### 💡 Feature Ideas

Open an issue using the **Feature Request** template. Explain the use case first — before proposing the implementation.

### 📝 Workflow Contributions

If you've adapted Engram for a specific workflow (academic research, architecture, creative writing, autonomous agents), open an issue describing it. Validated workflows are incorporated into the example library.

### 🔧 Code Contributions

1. **Fork** the repo
2. Create a feature branch: `git checkout -b feature/my-improvement`
3. Make your changes
4. Test: run `./init-engram.sh` in a temp directory and verify the output
5. Submit a **Pull Request** against `main` with a clear description of what changed and why

---

## What We're Looking For

✅ Smaller, focused PRs over large rewrites  
✅ Improvements that work across all AI platforms (Claude, ChatGPT, Gemini, Cursor)  
✅ Additions to `examples/` showing real project use  
✅ Fixes to workflow files that improve reliability or clarity  

❌ Changes that add external dependencies  
❌ Rewrites of the logging format without a migration path  
❌ Platform-specific features that don't degrade gracefully on other platforms  

---

## Workflow Files

The `.agents/workflows/` directory is the most impactful place to contribute. Each workflow is a plain markdown file with a YAML frontmatter `description`. Changes there affect every AI model that uses Engram.

---

## Code of Conduct

Be direct, be honest, and be kind. Flag problems clearly. Give credit where it's due.  
This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) v2.1.

---

## Questions?

Open an issue or reach out at **<jim@ecom-x.com>**.
