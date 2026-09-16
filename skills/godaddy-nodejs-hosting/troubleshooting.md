# Troubleshooting — Node.js Hosting skill

Map symptoms to [contract.md](contract.md) rules and validator IDs.

| Symptom | Contract | Validator | Fix |
|---------|----------|-----------|-----|
| Deploy fails immediately | C2, C4 | E001, E002, E007, E008 | Complete `package.json`; add `main`, `build`, `start` |
| App won't start locally | C4 | E003 | Fix `start` path; ensure `main` file exists |
| Port / connection errors on platform | C5, C6 | E004 | Replace `listen(3000)`; use `host: '0.0.0.0'` for Fastify |
| `Cannot find module` in production | deps | E006 | Move packages from `devDependencies` to `dependencies` |
| Build step skipped / stale assets | C3 | E005 | Add `scripts.build` (real command or `echo build`) |
| Next/Nuxt/Remix blank or old UI | C3 | E005 | Use framework `build`; run install → build → start locally |
| `next start` fails / "Could not find a production build" / app has `output: 'export'` | C4 | E002, E003 | Static export: switch `start` to Express serving the export dir from `distDir` in `next.config.*` (default `out/`); keep `next build` ([examples.md#nextjs-static-export](examples.md#nextjs-static-export)) |
| Upload too large | C10 | W004 | Remove `node_modules`, caches from zip |
| Secrets leaked | C8 | W001 | Remove `.env` from upload; use hosting UI for env vars |
| Monorepo upload fails | C1 | — | Upload single package folder only |
| External API unreachable | C11 | — | Use HTTP/HTTPS (80/443) only |
| Database connection fails | C12 | E009, E010 | Use platform MySQL: all five `DB_*` from `process.env`, `mysql2` in `dependencies`; not remote :3306 |
| npm E401 / auth error during install | C14 | — | Add `.npmrc` with `registry=https://registry.npmjs.org/` to project root. If the lockfile contains non-public URLs, delete it and reinstall |

## GoDaddy CLI

The `gddy` CLI drives Node.js Hosting from the terminal: uploading a new version, publishing to **preview** or **publish**, managing secrets, and reading platform logs. When the checks above do not explain a failure, logs are the next step, covering install and build output for a deploy and the app's stdout and stderr for a crash after start.

Setup and authentication: [developer.godaddy.com](https://developer.godaddy.com/llms.mdx/api-users/cli/set-up). Hosting commands are in beta and not in those docs; [github.com/godaddy/cli](https://github.com/godaddy/cli) is the source of truth for what exists.

## Validator exit codes

| Code | Meaning |
|------|---------|
| 0 | Pass |
| 1 | Errors — must fix before upload |
| 2 | Warnings only (`--strict` treats warnings as errors) |
