# Framework recipes for Node.js Hosting

Apply **one** recipe per project. Detection signals are in `dependencies` / `devDependencies` unless noted.

**Install behavior:** The platform runs **production install** (omits `devDependencies`), then `run build`, then `run start` ([contract.md](contract.md)). Put every package required for `scripts.build` and `scripts.start` in `dependencies`. Use `devDependencies` only for tooling that is not needed on the platform (e.g. local linters), or when you upload pre-built assets and use `"build": "echo build"`.

Shared static server template (Lovable, Bolt, Vite SPA, CRA) — see [vite-react-vue-spa](#vite-react-vue-spa).

---

## express-koa-hono

**Detection:** `express`, `koa`, or `hono` in `dependencies`, or a hand-written server file.

**package.json:**

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

**server.js (PORT binding):**

```javascript
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('OK'));

app.listen(port, () => console.log(`Listening on ${port}`));
```

TypeScript: add `"build": "tsc"`, `"start": "node dist/server.js"`, put `typescript` (and any types needed to compile) in `dependencies` alongside runtime deps.

---

## fastify

**Detection:** `fastify` in `dependencies`.

**package.json:** same as Express; `start` points to your server file.

**Listen (host required):**

```javascript
const port = Number(process.env.PORT) || 3000;
await fastify.listen({ port, host: '0.0.0.0' });
```

---

## nextjs

**Detection:** `next` in `dependencies`, and **no** `output: 'export'` in `next.config.js`, `next.config.mjs`, or `next.config.ts`.

Check `next.config.*` before choosing a recipe. Standard Next.js uses a Next server at runtime; static export does not — see [nextjs-static-export](#nextjs-static-export).

| Path | Detection | `build` | `start` |
|------|-----------|---------|---------|
| Standard Next.js | `next` dep, no `output: 'export'` | `next build` | `next start` |
| Static export | `output: 'export'` in `next.config.*` | `next build` | `node server.js` (Express) |

**package.json (standard):**

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

Do not replace `next start` for standard Next.js apps (SSR, API routes, server middleware). Static export (`output: 'export'`) is the documented exception — use [nextjs-static-export](#nextjs-static-export).

---

## nextjs-static-export

**Detection:** `output: 'export'` in `next.config.js`, `next.config.mjs`, or `next.config.ts`. `images.unoptimized: true` often appears alongside export mode but is not required for detection.

**Why Express:** Node.js Hosting runs `install → build → start` as a Node process. Export mode runs `next build` to static HTML/JS/CSS (default `out/`; overridable via `distDir` in `next.config.*`) — there is no Next.js server for `next start`. A small Express server is the hosting adapter, not a framework change. Do not suggest removing `output: 'export'` unless the user needs SSR, API routes, or other server features.

**package.json:**

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "build": "next build",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

Keep `next build` (not `vite build`). Read `distDir` in `next.config.*` for the export folder (default `out/`); point Express at that path — do not hardcode `out/` when the project sets `distDir`.

**server.js (serve export dir):**

```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Match distDir in next.config (default 'out')
app.use(express.static(path.join(__dirname, 'out')));
app.listen(port, () => console.log(`Listening on ${port}`));
```

**Agent note:** `express.static` is enough for most export builds — Next generates per-route HTML files. Do not copy the SPA catch-all to `index.html` from the Vite recipe; that pattern is for single-page apps, not multi-page static export.

---

## nuxtjs

**Detection:** `nuxt` in `dependencies`.

**package.json:**

```json
{
  "scripts": {
    "build": "nuxt build",
    "start": "node .output/server/index.mjs"
  },
  "dependencies": {
    "nuxt": "^3.0.0"
  }
}
```

Verify `.output/server/index.mjs` exists after `run build`.

---

## remix

**Detection:** `@remix-run/node` or `remix` in `dependencies`.

**package.json:**

```json
{
  "scripts": {
    "build": "remix build",
    "start": "remix-serve build"
  },
  "dependencies": {
    "@remix-run/node": "^2.0.0",
    "@remix-run/serve": "^2.0.0"
  }
}
```

Ensure `remix-serve` is in `dependencies`, not only `devDependencies`.

---

## nestjs

**Detection:** `@nestjs/core` in `dependencies`.

**package.json:**

```json
{
  "scripts": {
    "build": "nest build",
    "start": "node dist/main"
  },
  "dependencies": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/cli": "^10.0.0",
    "typescript": "^5.0.0"
  }
}
```

`main.ts` must compile to `dist/main.js`. Nest listens on `process.env.PORT` by default when configured via `app.listen(process.env.PORT || 3000)`.

---

## vite-react-vue-spa

**Detection:** `vite` in `dependencies` and SPA export (no SSR `start` from Vite preview in production).

**package.json:**

```json
{
  "scripts": {
    "build": "vite build",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

Production install omits `devDependencies`, so `vite`, its plugins, and framework packages used during `vite build` must be in `dependencies`. Keep `express` in `dependencies` for runtime static serving. If you upload a pre-built `dist/` instead, use `"build": "echo build"` and you may omit Vite from `dependencies`.

**server.js (serve `dist/`):**

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

**Vue SPA:** same recipe; use `@vitejs/plugin-vue` instead of React plugin.

---

## create-react-app

**Detection:** `react-scripts` in `dependencies`.

**package.json:**

```json
{
  "scripts": {
    "build": "react-scripts build",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-scripts": "^5.0.0"
  }
}
```

**server.js:** same as Vite but use `build/` instead of `dist/`:

```javascript
app.use(express.static(path.join(__dirname, 'build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
```

---

## static-only

**Detection:** no framework; static files in `public/`.

**package.json:**

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

**server.js:**

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

---

## managed-mysql

**Detection:** `mysql2`, `sequelize`, `knex`, `typeorm`, or `mariadb` in dependencies; or Prisma `provider = "mysql"` in `prisma/schema.prisma`.

**Platform:** Since each Node.js Hosting app gets its own MySQL capacity automatically, the platform sets `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Read **each** from `process.env` in application code (typically one config module).

**package.json:**

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mysql2": "^3.11.0"
  }
}
```

**db.js (all five vars from env):**

```javascript
const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

Use **parameterized** queries (`pool.query('SELECT * FROM users WHERE id = ?', [id])`). Do not interpolate user input into SQL strings.
