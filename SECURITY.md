# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **<jim@ecom-x.com>**

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide an initial assessment within 5 business days.

## Scope

Engram is a lightweight AI memory protocol. Security concerns include:

- **Memory file integrity** — Engram stores context in plaintext markdown. Sensitive data should not be stored in engram files.
- **Init script execution** — `init-engram.sh` creates files and directories. Review before running in shared environments.
- **Watch script** — `engram-watch.sh` monitors file changes. Runs locally only; no network access.

## Best Practices

- Do not store API keys, passwords, or secrets in engram memory files
- Review generated files before committing to version control
- Run init scripts in trusted environments only
- Keep engram files in `.gitignore` if they contain project-specific context

## Supported Versions

| Version | Supported |
|---------|-----------|
| 4.0.x   | ✅        |
| < 4.0   | ❌        |
