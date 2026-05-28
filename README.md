# GoDaddy Node.js Hosting - Agent Skill

Open source [Agent Skill](https://agentskills.io/home) for building and adapting Node.js apps on [GoDaddy Node.js Hosting (PaaS)](https://godaddy.com/nodejs).

Supports **npm**, **pnpm**, and **yarn**.

**Repository:** [github.com/godaddy/nodejs-hosting-agent-skill](https://github.com/godaddy/nodejs-hosting-agent-skill) - the repo ships tests and docs. The installable skill is **`skills/godaddy-nodejs-hosting`** (skill id: `godaddy-nodejs-hosting`).

## Quick start

1. **Install the skill** - see [docs/INSTALL.md](docs/INSTALL.md):
   ```bash
   npx skills add godaddy/nodejs-hosting-agent-skill
   ```
   **Claude Code:** enable **Claude Code** in the installer's agent picker (easy to miss), or:
   ```bash
   npx skills add godaddy/nodejs-hosting-agent-skill --skill godaddy-nodejs-hosting -g -a claude-code
   ```
   Or symlink / marketplace when listed.
2. Open your **app** folder in your editor of choice (not this repo).
3. Invoke **`@godaddy-nodejs-hosting`** and ask it to prepare the project for Node.js Hosting (build or adapt).
4. Validate before upload (optional; requires Node.js):
   ```bash
   npm run validate -- /path/to/your-app
   ```

The skill includes workflows for new apps and existing repos, framework recipes, and a deploy contract enforced by `validate-paas.mjs`.

## Using Without Agent Skills

If your tool does not support Agent Skills (e.g. Claude.ai or a generic chat), copy [CLAUDE.md](CLAUDE.md) into your app’s project root and ask the model to follow it.

## Repository layout

```
├── skills/
│   └── godaddy-nodejs-hosting/   # Install this skill (Agent Skills standard layout)
│       ├── SKILL.md
│       ├── contract.md
│       ├── examples.md
│       └── scripts/validate-paas.mjs
├── CLAUDE.md                     # Optional copy-into-app guide (non-skill tools)
├── docs/INSTALL.md
├── tests/                        # Fixtures + automated tests
└── package.json                  # Maintainer scripts (npm test, npm run validate)
```

## Local testing

```bash
npm test
npm run validate -- tests/fixtures/express
```

See [docs/INSTALL.md](docs/INSTALL.md) to install. Maintainers: [docs/CONTRIBUTING-SKILL.md](docs/CONTRIBUTING-SKILL.md) for E2E test layers.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/CONTRIBUTING-SKILL.md](docs/CONTRIBUTING-SKILL.md).

## License

MIT — see [LICENSE](LICENSE).
