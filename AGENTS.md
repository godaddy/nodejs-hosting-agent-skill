# CLAUDE.md — Node.js Hosting

This project is built to deploy on Node.js Hosting, a managed Node.js hosting platform. Use this file as context when helping build, debug, or prepare this app for deployment.

## Platform Overview

Node.js Hosting is a managed Node.js PaaS that supports Node.js applications and static sites. Customers upload their project folder through the GoDaddy interface — no Docker, no CI/CD pipelines, no infrastructure config needed. The platform handles SSL, CDN, and server-side compute automatically.

## Deployment Flow

1. Customer uploads their project folder via the Node.js Hosting UI
2. The platform installs dependencies and builds the app
3. The app is deployed to a private preview environment (requires GoDaddy auth to view)
4. Once ready, the customer can publish to production and connect a custom domain

## Requirements

Audit the project against each item below. Apply the **minimum** changes needed; do not remove existing functionality.

### 1. package.json

The project root must contain a valid `package.json` with at least:

- `"name"` — application name
- `"version"` — semver (e.g. `"1.0.0"`)
- `"main"` — entry-point file (e.g. `"server.js"` or `"index.js"`); the file must exist

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "build": "echo build",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

Use a real compile command in `"build"` when the stack requires it (Next.js, Vite, TypeScript, etc.). Use `"echo build"` only when nothing needs compiling.

The platform runs **install → `run build` → `run start`** using the package manager for your project (see [Package managers](#package-managers)).

### Package managers

Node.js Hosting supports **npm**, **pnpm**, and **yarn**. The platform picks the tool from your lockfile or `packageManager` field in `package.json`:

| Lockfile / signal | Package manager |
|-------------------|-----------------|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `package-lock.json` (or no lockfile) | npm |
| `"packageManager": "pnpm@9.0.0"` (etc.) | As specified (Corepack) |

**Include the lockfile in your upload** so installs are reproducible. Locally, use whichever tool you prefer — the `scripts` in `package.json` are the same:

```bash
# npm
npm install && npm run build && npm start

# pnpm
pnpm install && pnpm run build && pnpm start

# yarn (Berry: yarn install / yarn build / yarn start)
yarn install && yarn build && yarn start
```

On the platform, this is equivalent to: **install → run `build` → run `start`**.

### 2. Build and start scripts

Both scripts are required:

- `"build"` — compiles or bundles the app (or `"echo build"` if there is no compile step)
- `"start"` — starts the production server (e.g. `"node server.js"`, `"next start"`)

The file referenced by `start` (when using `node <file>`) must exist. Framework commands (`next start`, `nuxt start`, etc.) are allowed when documented in [Framework Setup Examples](#framework-setup-examples).

### 3. Port binding

The app must listen on the port from the `PORT` environment variable, not a hardcoded port.

```javascript
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### 4. Dependencies

All **runtime** dependencies must be in `"dependencies"`. Do **not** upload `node_modules` — the platform runs install automatically. Production installs omit `devDependencies`.

### 5. Environment variables

Read secrets, API keys, and external URLs from `process.env.VARIABLE_NAME`. Do not hard-code sensitive values. Configure values in the Node.js Hosting UI after upload. Never include `.env` in the upload.

### 6. Vite apps (if applicable)

The platform updates allowed-hosts for Vite automatically. Ensure dev and preview servers still respect `process.env.PORT`.

### 7. File-size limit

Keep the upload zip under **100 MB**. Exclude `node_modules`, build caches (`.next`, `dist`, etc.), and other large generated folders.

### Static Sites

For static sites with no server-side logic, include a simple server that serves the static files:

```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port);
```

## Supported Frameworks

Node.js Hosting supports any Node.js application or framework that can run via the `start` script in `package.json` (with npm, pnpm, or yarn). This includes but is not limited to:

- Express.js
- Next.js
- Fastify
- Nuxt.js
- Remix
- Nest.js
- Hono
- Koa
- Static sites served via a Node.js server

If your framework produces a production build and can start via a `"start"` script, it will work on Node.js Hosting.

## Single Application Per Upload

Node.js Hosting expects a single application per upload. Monorepos and multi-app setups are not supported unless a single `start` script at the root boots everything the app needs.

If your project is a monorepo, extract the specific app you want to deploy into its own folder with its own `package.json` and upload that folder instead.

For example, if your repo has a structure like `packages/api` and `packages/web`, upload just `packages/web` as a standalone project with its own complete `package.json` and `start` script.

## Project Structure

The platform is flexible with structure. As long as the root contains a valid `package.json` with a `start` script, the app will deploy. A typical structure looks like:

```
my-app/
├── package.json        # name, version, main, build, start
├── server.js           # Entry point (matches "main" / start script)
├── public/             # Static assets (if applicable)
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── routes/             # API routes (if applicable)
├── views/              # Templates (if applicable)
├── .env.example        # Document required env vars (do not upload .env)
└── CLAUDE.md           # This file
```

### 8. Network connectivity

Only outbound **HTTP (80)** and **HTTPS (443)** are allowed from the container, plus **GoDaddy managed MySQL**. Do not rely on arbitrary outbound ports or external databases on non-standard ports (e.g. remote PostgreSQL on 5432) — those connections are blocked. Use HTTPS APIs or the platform database.

### 9. Database (if the app uses one)

The platform provides managed **MySQL**. Credentials are injected as environment variables:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`

Read these from `process.env`. Use the **`mysql2`** package and **parameterized queries** — never interpolate user input into SQL strings.

External databases on arbitrary hosts/ports are not reachable unless exposed over HTTPS (e.g. some serverless providers). Otherwise migrate to platform MySQL or an HTTPS-accessible service.

## Environment Variables

- `PORT` is provided automatically. Always use `process.env.PORT`.
- Set other variables through the Node.js Hosting UI after upload.
- Never upload `.env` files.

## What the Platform Handles

You do not need to configure or worry about:

- SSL/TLS certificates — provisioned automatically
- CDN — included out of the box
- Process management — the platform manages restarts and uptime
- Server infrastructure — fully managed compute

## Deploying from AI Coding Tools

Many customers build their apps using AI-powered tools like Replit, Lovable, Bolt, Cursor, or Claude. These apps can be deployed on Node.js Hosting, but often need small adjustments before they're ready.

### How to get your code onto Node.js Hosting

1. Export or download your project as a zip from the AI tool
2. Unzip the folder locally
3. Check and fix the common issues below
4. Upload the folder through the Node.js Hosting UI

### Common issues and fixes

**Missing or incomplete `package.json`**
Some AI tools don't generate a complete `package.json`. Make sure yours exists in the root and includes a `"start"` script. If it's missing, create one:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "build": "echo build",
    "start": "node server.js"
  },
  "dependencies": {}
}
```

Then run `npm install`, `pnpm install`, or `yarn install` locally to generate the correct dependencies and lockfile.

**Hardcoded ports**
AI tools often hardcode a port like `3000` or `8080`. Replace any hardcoded port with `process.env.PORT`:

```javascript
// Before (common in AI-generated code)
app.listen(3000);

// After (ready for Node.js Hosting)
app.listen(process.env.PORT || 3000);
```

**Dependencies in the wrong place**
AI tools sometimes put production dependencies under `"devDependencies"`. Move anything the app needs at runtime into `"dependencies"`.

**Missing entry point**
Make sure the file referenced in your `"start"` script actually exists. AI tools sometimes generate a `main.js` but the start script points to `index.js`, or vice versa.

**Replit-specific files**
Replit projects often include `.replit` and `replit.nix` config files. These are not needed and can be removed before upload. Focus on having a clean `package.json` with the correct `"start"` script.

**Lovable / Bolt exports**
These tools often export frontend-only apps with no server. If your export doesn't include a server file, add a simple one to serve your static files:

```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port);
```

Make sure to add `express` to your dependencies, for example:

```bash
npm install express --save
# or: pnpm add express
# or: yarn add express
```

### Quick validation

Before uploading, run this locally with **your** package manager to confirm everything works:

```bash
# npm
npm install && npm run build && npm start

# pnpm
pnpm install && pnpm run build && pnpm start

# yarn
yarn install && yarn build && yarn start
```

If install, build, and start succeed locally, the app is ready for Node.js Hosting.

## Framework Setup Examples

### Express.js
Ensure `express` is in `dependencies`, set `"main"` to your server file, `"build": "echo build"` (or `tsc` if TypeScript), and `"start": "node server.js"`.

### Next.js
Use `next build` as a `build` script and `next start` as the `start` script:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

Next.js apps work out of the box with server-side rendering, API routes, and static generation.

### Nuxt.js
Similar to Next.js — build then start:

```json
{
  "scripts": {
    "build": "nuxt build",
    "start": "node .output/server/index.mjs"
  }
}
```

### Remix
```json
{
  "scripts": {
    "build": "remix build",
    "start": "remix-serve build"
  }
}
```

### Fastify
Same pattern as Express — bind to `process.env.PORT` and use `0.0.0.0` as the host:

```javascript
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
```

### Nest.js
```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main"
  }
}
```

## Pre-Upload Checklist

Before uploading to Node.js Hosting, verify:

- [ ] Root `package.json` with `name`, `version`, and `main` (file exists)
- [ ] `scripts.build` and `scripts.start` defined
- [ ] Runtime deps in `"dependencies"`; **no** `node_modules` in the zip
- [ ] App listens on `process.env.PORT`; no hardcoded listen ports
- [ ] Secrets via `process.env`; no `.env` in upload
- [ ] Zip under 100 MB (exclude caches and `node_modules`)
- [ ] Runs locally: install → build → start (npm, pnpm, or yarn)
- [ ] Lockfile in upload when possible
- [ ] Outbound traffic uses HTTP/HTTPS only; DB uses platform MySQL env vars + `mysql2` if applicable

## Troubleshooting

### App won't start
- Check that `"start"` script exists in `package.json`
- Make sure the entry point file referenced in `"start"` actually exists
- Verify all dependencies are listed under `"dependencies"`

### Port errors
- Never hardcode a port number — always use `process.env.PORT`
- For frameworks that need a host, bind to `0.0.0.0` not `localhost`

### Missing modules
- Ensure all required packages are in `"dependencies"`, not `"devDependencies"`
- Production installs omit `devDependencies` (npm, pnpm, and yarn all respect this for deploy)

### Build failures
- If the app needs a build step (TypeScript, Next.js, etc.), add a `"build"` script
- Check that build output paths match what the `"start"` script expects

## Getting Help

If you run into issues deploying, reach out through the Node.js Hosting interface or contact GoDaddy support.
