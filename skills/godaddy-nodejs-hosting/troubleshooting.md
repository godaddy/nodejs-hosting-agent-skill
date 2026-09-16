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

## Platform logs

The GoDaddy CLI (`gddy`, hosting commands in beta) reads logs when the local checks above are not enough:

```bash
gddy hosting nodejs logs --app-id <app-id> --target preview|publish --source exec --since <ISO-8601>
```

`--source exec` covers install, build, and import failures (a failed deploy); `stdout` and `stderr` are the running app's output (a crash after start). `--since` is required, `--lines` caps at 500. Ask the user to run it and paste the output if the CLI is not authenticated locally.

## Validator exit codes

| Code | Meaning |
|------|---------|
| 0 | Pass |
| 1 | Errors — must fix before upload |
| 2 | Warnings only (`--strict` treats warnings as errors) |
