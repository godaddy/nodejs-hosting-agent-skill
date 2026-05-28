# Installing the Node.js Hosting skill

Repository: [github.com/godaddy/nodejs-hosting-agent-skill](https://github.com/godaddy/nodejs-hosting-agent-skill)

Installable skill path: **`skills/godaddy-nodejs-hosting/`** (skill id: **`godaddy-nodejs-hosting`**).

## Who is this for?

| You are… | Start here |
|----------|------------|
| **Using Cursor or Claude Code** | [Skills CLI](#install-with-skills-cli-recommended) or [marketplace](#cursor--claude-code-marketplace) when listed |
| **Using Claude.ai or another AI without skills** | [Without Agent Skills](#without-agent-skills) — copy `CLAUDE.md` into your app |
| **Developing this repo** | [Install from source](#install-from-source) |
| **Checking a project before upload** | [Validator only](#validator-only) |

Non-technical users should use **`npx skills add`** (one command) or a marketplace listing—not manual symlinks.

## Install with Skills CLI (recommended)

Uses [vercel-labs/skills](https://github.com/vercel-labs/skills). Installs into Cursor, Claude Code, and other supported agents.

```bash
# Target Claude Code
npx skills add godaddy/nodejs-hosting-agent-skill --skill godaddy-nodejs-hosting -g -a claude-code -y
```

```bash
# Alternatively target Cursor
npx skills add godaddy/nodejs-hosting-agent-skill --skill godaddy-nodejs-hosting -g -a cursor -y
```

- `-g` — available in all projects (`~/.cursor/skills/`, `~/.claude/skills/` etc.)
- `-a claude`, `-a cursor` — target Claude Code or Cursor only (omit or add agents as needed)
- List skills in the repo first: `npx skills add godaddy/nodejs-hosting-agent-skill --list`

Then open your **app** workspace and use **`@godaddy-nodejs-hosting`** in chat.

## Cursor / Claude Code marketplace

When GoDaddy publishes a **Cursor plugin** or Claude marketplace entry, install from the in-app marketplace panel and invoke **`@godaddy-nodejs-hosting`**.

Until then, use the [Skills CLI](#install-with-skills-cli-recommended) or [install from source](#install-from-source).

The skill does not auto-run (`disable-model-invocation`); you must @-mention it or ask explicitly.

### After install — quick check

1. Open the folder that contains your app’s `package.json`.
2. Prompt: *“@godaddy-nodejs-hosting Help me prepare this project for GoDaddy Node.js Hosting.”*
3. Confirm the agent runs `validate-paas.mjs` and shares the pre-upload checklist before saying the app is ready.

## Without Agent Skills

For **Claude.ai**, generic chat, or tools that do not load skills:

1. Copy [CLAUDE.md](../CLAUDE.md) into your **app project root** (same level as `package.json`).
2. Ask the model to follow that file to fix the project for Node.js Hosting.
3. Optionally validate (requires Node.js):
   ```bash
   node path/to/nodejs-hosting-agent-skill/skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs path/to/your-app
   ```
4. Zip the project root and upload via [GoDaddy Node.js Hosting](https://godaddy.com/nodejs).

## Install from source

For contributors or when the repo is not yet public on the Skills CLI registry.

### Skills CLI from a local clone

```bash
git clone https://github.com/godaddy/nodejs-hosting-agent-skill.git
cd nodejs-hosting-agent-skill
npx skills add . --skill godaddy-nodejs-hosting -g -a cursor -y
```

### Cursor (manual symlink)

```bash
git clone https://github.com/godaddy/nodejs-hosting-agent-skill.git
cd nodejs-hosting-agent-skill
ln -sf "$(pwd)/skills/godaddy-nodejs-hosting" ~/.cursor/skills/godaddy-nodejs-hosting
```

Restart Cursor. Use **`@godaddy-nodejs-hosting`** in your app workspace.

**Windows:**

```powershell
mkdir $env:USERPROFILE\.cursor\skills -Force
Copy-Item -Recurse skills\godaddy-nodejs-hosting $env:USERPROFILE\.cursor\skills\godaddy-nodejs-hosting
```

### Cursor (project-scoped)

```bash
mkdir -p .cursor/skills
ln -sf /path/to/nodejs-hosting-agent-skill/skills/godaddy-nodejs-hosting .cursor/skills/godaddy-nodejs-hosting
```

### Claude Code

Symlink or copy `skills/godaddy-nodejs-hosting/` into your Claude Code user `skills` directory.

## Validator only

Requires [Node.js](https://nodejs.org/) 18+.

```bash
git clone https://github.com/godaddy/nodejs-hosting-agent-skill.git
node nodejs-hosting-agent-skill/skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs /path/to/your-app
```

From a clone:

```bash
npm run validate -- /path/to/your-app
```

Options:

- `--strict` — treat warnings as errors

For install -> build -> start locally, see [CONTRIBUTING-SKILL.md](CONTRIBUTING-SKILL.md) (Layer 2).
