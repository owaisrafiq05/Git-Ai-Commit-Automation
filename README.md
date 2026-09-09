# Git AI Commit Automation

AI-generated git commit messages from your staged diff. Works from any terminal — VS Code, Cursor, Claude Code, or plain shell — with **zero required backend and zero cost to run**, no matter how many people install it.

```
git add .
ai-commit
```

```
🤖 Generating commit message...

Suggested commit message:

  fix: handle empty cart state on checkout

[Enter] use it   [r] regenerate   [e] edit   [c] cancel
```

## How it's structured

```
Git-Ai-Commit-Automation/
├── cli/      the actual product — an npm CLI, works everywhere
├── server/   optional thin proxy (for the "hosted" provider), deployable on Render
└── .github/workflows/keep-alive.yml   pings the proxy every 14 min so Render doesn't sleep it
```

## The CLI (`/cli`) — this is the product

Run `git diff --cached` → send it to an AI provider → show a suggested commit message → user accepts / edits / regenerates / cancels → `git commit`.

Only the diff is sent, never the full repo, so even small models handle it fine.

### Three interchangeable providers — user picks on first run

| Provider | What it needs | Who pays for inference |
|---|---|---|
| **Gemini** (default, recommended) | User's own free API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | The user, within Google's free tier — $0 for you at any scale |
| **Ollama** | Ollama installed locally + a pulled model | Nobody — runs on the user's own machine |
| **Hosted** | A server URL (e.g. your Render deployment) | You, if you choose to run `/server` |

This is the important design decision: **the default path (Gemini, user's own key) costs you nothing whether 10 people or 10 million people install this.** Ollama is the same — the user's machine does the work. Only the "Hosted" option has a bill attached to you, and it's opt-in.

### Ollama model options

- **Recommended: `tavernari/git-commit-message`** — a two-model pipeline built specifically for this task (`sp_change_mini` summarizes each changed file, `sp_commit_mini` synthesizes the final message). The `mini` variant is ~5GB total on disk (2.5GB × 2 models). [ollama.com/tavernari/git-commit-message](https://ollama.com/tavernari/git-commit-message)
- **Custom** — any general-purpose coding model, e.g. `qwen2.5-coder:3b` (single-step, ~2GB)

### Setup

```bash
cd cli
npm link          # makes `ai-commit` available globally for local testing
```

Then in any git repo:

```bash
git add .
ai-commit
```

First run walks you through picking a provider. Reconfigure anytime with `ai-commit config`. Config lives at `~/.ai-commit/config.json`.

### Publishing (so `npx ai-commit` works for everyone)

```bash
cd cli
npm publish   # check the package name is available on npmjs.com first
```

## The server (`/server`) — optional, and **not** where the AI model runs

⚠️ **Important, based on what we found researching the tavernari model you shared:** even its smallest variant needs ~5GB of RAM/disk (two ~2.5GB models). Render's free tier gives you 512MB RAM and 0.1 CPU — an LLM will not fit there, full stop. That's not a config problem, it's a hardware ceiling.

So `/server` is **not** an Ollama host. It's a tiny proxy with **no AI logic of its own** — it just forwards a prompt to Gemini's API using a server-side key, so that key never has to be embedded in the public npm package (where anyone could extract it and rack up usage on your account). It's a few KB of code with zero dependencies, which is exactly the kind of thing Render's free tier is built for.

```
CLI (provider: "hosted")
        │
        ▼
  Render proxy  ──────►  Gemini API (your server-side key)
        │
        ▼
  commit message back to CLI
```

Use this if you want a shared/team setup where individual users don't need their own Gemini key. **Caveat to be upfront about:** this makes you responsible for Gemini's free-tier rate limits across everyone who uses it — fine for a small team, not something to point a public launch at without a real API key/billing strategy.

### Deploying to Render

1. Push this repo to GitHub (see below).
2. On [render.com](https://render.com): New → Blueprint → connect this repo. It'll read `render.yaml` and auto-configure the `server/` service on the free tier.
3. Set the environment variables it asks for:
   - `GEMINI_API_KEY` — your own key
   - `CLIENT_SECRET` — any random string, so strangers can't hit your endpoint and burn your quota (users configure this same string in the CLI's `ai-commit config`)
4. Once deployed, copy the service URL (e.g. `https://ai-commit-server.onrender.com`).

### Keeping it awake (your 15-minute idea — this is the right way to do it)

Render's free tier sleeps a service after ~15 min idle; the next request pays a slow cold start. Rather than a paid uptime service, this repo uses a **free GitHub Actions cron job** to ping `/health` every 14 minutes:

1. In GitHub: repo **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `RENDER_HEALTH_URL`
   - Value: `https://ai-commit-server.onrender.com/health`
2. That's it — `.github/workflows/keep-alive.yml` runs automatically on schedule, completely free (GitHub Actions gives generous free minutes for public/private repos).

## Roadmap

- [ ] VS Code / Cursor extension — thin wrapper around the same CLI logic, shown in the editor UI instead of the terminal
- [ ] `npm publish` the CLI so `npx ai-commit` works with zero install
- [ ] Benchmark tavernari-mini vs qwen2.5-coder vs Gemini on ~50 real diffs before picking a hard default
