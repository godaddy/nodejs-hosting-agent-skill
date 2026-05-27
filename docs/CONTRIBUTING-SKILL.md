# Contributing to the Node.js Hosting skill

## Before every PR

```bash
npm test
```

If you changed a fixture or validator rule:

```bash
node skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs tests/fixtures/express
```

## Drift policy

These files must stay aligned:

| File | Role |
|------|------|
| [CLAUDE.md](../CLAUDE.md) | Copy-into-app guide (no Agent Skills); keep aligned with contract |
| [skills/godaddy-nodejs-hosting/contract.md](../skills/godaddy-nodejs-hosting/contract.md) | Testable rules (skill must not link outside its folder) |
| [skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs](../skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs) | Enforcement |
| [tests/drift-check.test.mjs](../tests/drift-check.test.mjs) | CI guard |

**One PR** should update all affected files when changing deploy rules.

Bump `contractVersion` in `contract.md` for breaking contract changes (current: **2** — requires `main`, always requires `build`).

## Adding a framework

1. Add a section to [examples.md](../skills/godaddy-nodejs-hosting/examples.md) with detection signal, `package.json`, and listen snippet.
2. Add a row to the framework table in [SKILL.md](../skills/godaddy-nodejs-hosting/SKILL.md).
3. Extend `BUILD_REQUIRED` / heuristics in [validate-paas.mjs](../skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs) if the framework requires `build`.
4. Add `tests/fixtures/<name>/` (good) and optional bad fixture.
5. Add a test case in `tests/validate-paas.test.mjs`.

## LOC budget

Keep the repo under **5,000 LOC**. Skill files must be self-contained (no links to repo-root `CLAUDE.md`). When deploy rules change, update `contract.md`, validator, and `CLAUDE.md` together (drift tests). No full sample apps — use minimal fixtures only.

## Local testing and validation

### Layer 1 — No AI (daily / CI)

```bash
cd nodejs-hosting-agent-skill
npm test
node skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs tests/fixtures/express
```

### Layer 2 — Local install/build/start

```bash
cd your-app
# Use the same tool as your lockfile (examples below use npm)
npm install && npm run build && PORT=3456 npm start
# pnpm: pnpm install && pnpm run build && PORT=3456 pnpm start
# yarn: yarn install && yarn build && PORT=3456 yarn start
```

### Layer 3 — Agent behavior (pre-release)

Install the skill (marketplace or [INSTALL.md](INSTALL.md) from source). In an app workspace, run prompts:

- *“@godaddy-nodejs-hosting Create an Express app for Node.js Hosting.”*
- *“@godaddy-nodejs-hosting Adapt this existing Express repo for Node.js Hosting without changing behavior.”*
- *“@godaddy-nodejs-hosting Fix this Lovable export for Node.js Hosting.”* (frontend-only zip)
- Non-technical: *“I need to upload my website to GoDaddy Node.js Hosting.”*

Confirm the agent runs the validator and outputs the pre-upload checklist.

### Layer 4 — Platform

Upload to Node.js Hosting preview after Layers 1–2 pass.

**Claude CLI is not required** for developing or testing this repository.

## Pre-release checklist (Layer 3)

- [ ] `npm test` passes on Node 18, 20, 22
- [ ] Cursor spot-check: Express greenfield prompt
- [ ] Cursor spot-check: adapt existing Express repo for Node.js Hosting without changing behavior
- [ ] Cursor spot-check: Lovable/static export fix
- [ ] Non-technical prompt returns checklist first
- [ ] Optional: same prompts on Claude Code

Record results in the PR or release notes.

## Security

The validator only reads files; it does not `require()` project code or spawn
shell commands. See [SECURITY.md](../SECURITY.md). CodeQL excludes
`scripts/validate-paas.mjs` (local CLI threat model).
