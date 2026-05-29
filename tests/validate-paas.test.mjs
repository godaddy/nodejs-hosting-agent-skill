import { fileURLToPath } from 'url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNodeStart,
  envVarReferencedInContent,
  runValidation,
} from '../skills/godaddy-nodejs-hosting/scripts/validate-paas.mjs';

function fixtureDir(name) {
  return fileURLToPath(new URL(`fixtures/${name}/`, import.meta.url));
}

test('parseNodeStart verifies plain node entry; flags are unverified', () => {
  assert.deepEqual(parseNodeStart('node server.js'), {
    kind: 'entry',
    path: 'server.js',
  });
  assert.equal(parseNodeStart('node --trace-warnings server.js').kind, 'node-unverified');
  assert.equal(parseNodeStart('node -r dotenv/config server.js').kind, 'node-unverified');
  assert.equal(parseNodeStart('next start').kind, 'not-node');
  assert.equal(parseNodeStart('node -e "console.log(1)"').kind, 'node-unverified');
});

test('express fixture passes', () => {
  const { exitCode, errors } = runValidation([fixtureDir('express')]);
  assert.equal(errors.length, 0);
  assert.ok(exitCode === 0 || exitCode === 2, `exit ${exitCode}`);
});

test('express-node-flags fixture warns W003 instead of false E003', () => {
  const { exitCode, errors, warnings } = runValidation([fixtureDir('express-node-flags')]);
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => w.id === 'W003'));
  assert.ok(exitCode === 0 || exitCode === 2);
});

test('express-node-require fixture warns W003 instead of false E003', () => {
  const { exitCode, errors, warnings } = runValidation([
    fixtureDir('express-node-require'),
  ]);
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => w.id === 'W003'));
  assert.ok(exitCode === 0 || exitCode === 2);
});

test('next fixture passes', () => {
  const { exitCode, errors } = runValidation([fixtureDir('next')]);
  assert.equal(errors.length, 0);
  assert.ok(exitCode === 0 || exitCode === 2, `exit ${exitCode}`);
});

test('static-vite fixture passes', () => {
  const { exitCode } = runValidation([fixtureDir('static-vite')]);
  assert.ok(exitCode === 0 || exitCode === 2);
});

test('nest fixture passes', () => {
  const { exitCode } = runValidation([fixtureDir('nest')]);
  assert.ok(exitCode === 0 || exitCode === 2);
});

test('bad-node-flags-missing-entry warns W003 (no false E003 on flags)', () => {
  const { exitCode, errors, warnings } = runValidation([
    fixtureDir('bad-node-flags-missing-entry'),
  ]);
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => w.id === 'W003'));
  assert.ok(exitCode === 0 || exitCode === 2);
});

test('bad-missing-start fails with E002', () => {
  const { exitCode, errors } = runValidation([fixtureDir('bad-missing-start')]);
  assert.equal(exitCode, 1);
  assert.ok(errors.some((e) => e.id === 'E002'));
});

test('bad-hardcoded-port fails with E004', () => {
  const { exitCode, errors } = runValidation([fixtureDir('bad-hardcoded-port')]);
  assert.equal(exitCode, 1);
  assert.ok(errors.some((e) => e.id === 'E004'));
});

test('bad-hardcoded-port-with-env-ref fails with E004', () => {
  const { exitCode, errors } = runValidation([
    fixtureDir('bad-hardcoded-port-with-env-ref'),
  ]);
  assert.equal(exitCode, 1);
  assert.ok(errors.some((e) => e.id === 'E004'));
});

test('bad-wrong-deps fails with E006', () => {
  const { exitCode, errors } = runValidation([fixtureDir('bad-wrong-deps')]);
  assert.equal(exitCode, 1);
  assert.ok(errors.some((e) => e.id === 'E006'));
});

test('bad-missing-build fails with E005', () => {
  const { exitCode, errors } = runValidation([fixtureDir('bad-missing-build')]);
  assert.equal(exitCode, 1);
  assert.ok(errors.some((e) => e.id === 'E005'));
});

test('missing directory exits 1', () => {
  const { exitCode } = runValidation([fixtureDir('does-not-exist')]);
  assert.equal(exitCode, 1);
});

test('envVarReferencedInContent detects process.env.DB_HOST', () => {
  assert.ok(envVarReferencedInContent('const h = process.env.DB_HOST;', 'DB_HOST'));
  assert.ok(envVarReferencedInContent("const h = process.env['DB_HOST'];", 'DB_HOST'));
  assert.equal(envVarReferencedInContent('const h = "localhost";', 'DB_HOST'), false);
});

test('mysql-good fixture passes', () => {
  const { exitCode, errors } = runValidation([fixtureDir('mysql-good')]);
  assert.equal(errors.length, 0);
  assert.ok(exitCode === 0 || exitCode === 2);
});

test('bad-mysql-missing-env fails with E010', () => {
  const { exitCode, errors } = runValidation([fixtureDir('bad-mysql-missing-env')]);
  assert.equal(exitCode, 1);
  assert.ok(errors.some((e) => e.id === 'E010'));
});

test('runValidation returns independent error snapshots per call', () => {
  const first = runValidation([fixtureDir('bad-hardcoded-port')]);
  const second = runValidation([fixtureDir('express')]);

  assert.equal(first.exitCode, 1);
  assert.ok(second.exitCode === 0 || second.exitCode === 2);
  assert.equal(second.errors.length, 0);
  assert.equal(first.errors.length, 1);
  assert.equal(first.errors[0].id, 'E004');
});
