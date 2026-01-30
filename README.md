<div align="center">
  <img src="assets/logo.svg" width="140" alt="ClawShield logo" />
  <h1>ClawShield</h1>
  <p>Security preflight and guardrails for OpenClaw/Moltbot</p>
  <p>
    <img alt="CI" src="https://github.com/kappa9999/ClawShield/actions/workflows/ci.yml/badge.svg" />
  </p>
</div>

## What is ClawShield?
ClawShield is a safety helper for OpenClaw/Moltbot users. It checks your config
for risky settings, warns you if your gateway is exposed, and helps you keep
skills from being tampered with.

ClawShield does **not** change your config unless you explicitly opt in with
`clawshield apply safe --write`.

## Why this matters (plain English)
OpenClaw can run powerful tools. That is great, but it also means a mistake in
config can expose your control panel or let the wrong agent use dangerous tools.
ClawShield helps you catch those issues early.

Common risks it helps prevent:
- Gateway bound to the whole network without auth.
- Group chats where anyone can trigger actions without a mention.
- Non-main agents running without a sandbox.
- Skills modified after install (supply-chain risk).

## Quick install (macOS/Linux)
```bash
curl -fsSL https://raw.githubusercontent.com/kappa9999/ClawShield/main/scripts/install.sh | bash
```

## Install (local dev)
```bash
npm install
node ./src/cli.js --help
```

## Install (global)
```bash
npm install -g clawshield
clawshield --help
```

## How to use (step-by-step)

### 1) Run a basic audit
```bash
clawshield audit
```
You will see a report with PASS/WARN/FAIL items and suggested fixes.

### 2) Check if your gateway is exposed
```bash
clawshield exposure
```
If it shows EXPOSED listeners, your control port is reachable outside of
localhost and should be locked down.

### 3) Generate a safe profile snippet
```bash
clawshield profile safe
```
This prints a JSON snippet you can merge into `openclaw.json`.

### 4) Apply a safe profile (opt-in)
```bash
clawshield apply safe
clawshield apply safe --write --token "YOUR_TOKEN"
```
- The first command shows a dry-run diff.
- The second writes the changes and creates a `.bak-*` backup.

### 5) Lock your skills (tamper detection)
```bash
clawshield lock
clawshield verify
```
- `lock` creates a fingerprint of installed skills.
- `verify` tells you if anything changed or is missing.

### 6) Watch exposure in the background (macOS)
```bash
clawshield watch --interval 30
```
Or generate a LaunchAgent:
```bash
clawshield launchagent --bin /usr/local/bin/clawshield --interval 30 --write ~/Library/LaunchAgents/com.clawshield.watch.plist
launchctl load ~/Library/LaunchAgents/com.clawshield.watch.plist
```

## Notes
- Default config path: `~/.openclaw/openclaw.json` (override with `OPENCLAW_CONFIG_PATH`).
- Default workspace: `~/.openclaw/workspace`.
- The audit is read-only; only `apply safe --write` changes your config.

## Homebrew (draft)
```bash
brew install --formula ./docs/homebrew/ClawShield.rb
```

## Troubleshooting
- If `clawshield` is not found, ensure npm global bin is on your PATH.
- If the audit cannot read your config, pass `--config /path/to/openclaw.json`.
- On macOS, the exposure check uses `lsof`. Make sure it is available.

## Roadmap
- ClawdHub provenance integration (auto-verify installed skill sources).
- Optional notifications (desktop/Slack/Discord).
- Guided remediation mode.
