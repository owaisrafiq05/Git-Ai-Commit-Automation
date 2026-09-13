# @owaisrafiq05/git-ai-commit

**AI-generated git commit messages from your staged diff — one command, no local model download.**

[![npm](https://img.shields.io/npm/v/@owaisrafiq05/git-ai-commit.svg)](https://www.npmjs.com/package/@owaisrafiq05/git-ai-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
npm install -g @owaisrafiq05/git-ai-commit

git add .
ai-commit
```

Or without installing globally:

```bash
npx @owaisrafiq05/git-ai-commit
```

---

## What it does

1. Reads your **staged git diff**
2. Asks a hosted AI server for a conventional commit message
3. Lets you **accept / regenerate / edit / cancel**
4. Runs `git commit` for you

No Ollama on your laptop. No multi‑GB model download. Node.js 18+ is enough.

---

## Usage

```bash
ai-commit              # generate + commit
ai-commit --help       # help + branded banner
ai-commit --version    # version + credits
ai-commit config       # reset hosted defaults
```

| Key | Action |
|-----|--------|
| **Enter** | Use the suggested message |
| **r** | Regenerate |
| **e** | Edit, then commit |
| **c** | Cancel |

Config lives at `~/.ai-commit/config.json`.

---

## Requirements

- Node.js >= 18  
- A git repo with staged changes (`git add`)  

---

## Full documentation

Architecture, self-hosting, Docker Compose, and contributing guides:

**https://github.com/owaisrafiq05/Git-Ai-Commit-Automation**

If you find this helpful, please star the repo.

---

## Authors

- **Owais Rafiq** — [@owaisrafiq05](https://github.com/owaisrafiq05)  
- **Aliza Khan** — [@AlizaKhan3](https://github.com/AlizaKhan3)  

---

## License

MIT © Owais Rafiq, Aliza Khan
