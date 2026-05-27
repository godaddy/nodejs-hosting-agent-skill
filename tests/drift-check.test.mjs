import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_IN_AGENTS = [
  'process.env.PORT',
  'scripts',
  'start',
  'scripts.build',
  '"main"',
  'devDependencies',
  'node_modules',
  'mysql2',
  'DB_HOST',
  '100 MB',
  'Node.js Hosting',
  'pnpm',
  'yarn',
];

const REQUIRED_IN_CONTRACT = [
  'contractVersion: 2',
  'process.env.PORT',
  'scripts.start',
  'scripts.build',
  'main',
  'mysql2',
  'DB_HOST',
  'pnpm',
  'yarn',
];

test('AGENTS.md contains required contract phrases', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  for (const phrase of REQUIRED_IN_AGENTS) {
    assert.ok(agents.includes(phrase), `AGENTS.md missing: ${phrase}`);
  }
});

test('contract.md contains required rules', () => {
  const contract = readFileSync(
    join(root, 'skills/godaddy-nodejs-hosting/contract.md'),
    'utf8',
  );
  for (const phrase of REQUIRED_IN_CONTRACT) {
    assert.ok(contract.includes(phrase), `contract.md missing: ${phrase}`);
  }
});

test('AGENTS.md and contract.md both reference PORT binding', () => {
  const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
  const contract = readFileSync(
    join(root, 'skills/godaddy-nodejs-hosting/contract.md'),
    'utf8',
  );
  assert.ok(agents.includes('process.env.PORT'));
  assert.ok(contract.includes('process.env.PORT'));
});
