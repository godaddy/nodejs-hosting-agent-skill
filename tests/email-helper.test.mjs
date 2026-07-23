import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const helperPath = fileURLToPath(new URL('fixtures/email-helper/email.cjs', import.meta.url));
const { sendEmail } = require(helperPath);

const originalFetch = globalThis.fetch;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let calls;

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('happy path POSTs to loopback gateway and returns messageId', async () => {
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return jsonResponse(200, { success: true, messageId: 'msg-abc' });
  };

  const result = await sendEmail({
    to: 'customer@example.com',
    subject: 'Welcome',
    text: 'Thanks!',
  });

  assert.equal(result.messageId, 'msg-abc');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:2525/api/email/send');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['content-type'], 'application/json');
  const payload = JSON.parse(calls[0].init.body);
  assert.deepEqual(payload.to, ['customer@example.com']);
  assert.equal(payload.subject, 'Welcome');
  assert.equal(payload.text, 'Thanks!');
  assert.ok(!('from' in payload), 'from must be omitted when unset');
  assert.ok(!('cc' in payload), 'cc must be omitted when unset');
  assert.ok(!('bcc' in payload), 'bcc must be omitted when unset');
  assert.ok(!('attachments' in payload), 'attachments must be omitted when unset');
});

test('arrays flow through to/cc/bcc; strings are wrapped', async () => {
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return jsonResponse(200, { success: true, messageId: 'msg-1' });
  };

  await sendEmail({
    to: ['a@x.com', 'b@x.com'],
    cc: 'c@x.com',
    bcc: ['d@x.com'],
    subject: 's',
    text: 't',
  });

  assert.deepEqual(calls[0].to, ['a@x.com', 'b@x.com']);
  assert.deepEqual(calls[0].cc, ['c@x.com']);
  assert.deepEqual(calls[0].bcc, ['d@x.com']);
});

test('attachments are base64-encoded on the wire', async () => {
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return jsonResponse(200, { success: true, messageId: 'msg-2' });
  };

  await sendEmail({
    to: 'a@x.com',
    subject: 's',
    text: 't',
    attachments: [
      {
        filename: 'hello.txt',
        content: Buffer.from('hello world', 'utf-8'),
        contentType: 'text/plain',
      },
    ],
  });

  const [att] = calls[0].attachments;
  assert.equal(att.filename, 'hello.txt');
  assert.equal(att.contentType, 'text/plain');
  assert.equal(Buffer.from(att.content, 'base64').toString('utf-8'), 'hello world');
});

test('Uint8Array attachment content is also base64-encoded', async () => {
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return jsonResponse(200, { success: true, messageId: 'msg-3' });
  };

  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  await sendEmail({
    to: 'a@x.com',
    subject: 's',
    text: 't',
    attachments: [{ filename: 'x.bin', content: bytes }],
  });

  const [att] = calls[0].attachments;
  assert.equal(att.filename, 'x.bin');
  assert.ok(!('contentType' in att), 'contentType omitted when not set');
  const decoded = Buffer.from(att.content, 'base64');
  assert.equal(decoded.length, 4);
  assert.equal(decoded[0], 0x89);
});

test('gateway 400 surfaces the gateway error message', async () => {
  globalThis.fetch = async () =>
    jsonResponse(400, { success: false, error: 'unverified sender: acme.com' });

  await assert.rejects(
    () => sendEmail({ to: 'a@x.com', subject: 's', text: 't', from: 'root@acme.com' }),
    (err) => {
      assert.match(err.message, /email send failed/);
      assert.match(err.message, /unverified sender: acme.com/);
      return true;
    },
  );
});

test('gateway 200 with success:false still throws', async () => {
  globalThis.fetch = async () =>
    jsonResponse(200, { success: false, error: 'rate limited', messageId: 'partial-abc' });

  await assert.rejects(
    () => sendEmail({ to: 'a@x.com', subject: 's', text: 't' }),
    (err) => {
      assert.match(err.message, /rate limited/);
      assert.match(err.message, /messageId=partial-abc/);
      return true;
    },
  );
});

test('success without messageId throws', async () => {
  globalThis.fetch = async () => jsonResponse(200, { success: true });

  await assert.rejects(
    () => sendEmail({ to: 'a@x.com', subject: 's', text: 't' }),
    /gateway returned no messageId/,
  );
});

test('non-JSON response surfaces sanitized HTTP-status error', async () => {
  globalThis.fetch = async () =>
    new Response('<html>oops</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    });

  await assert.rejects(
    () => sendEmail({ to: 'a@x.com', subject: 's', text: 't' }),
    (err) => {
      assert.match(err.message, /email send failed/);
      assert.match(err.message, /non-JSON response \(HTTP 502\)/);
      return true;
    },
  );
});

test('fetch rejection with TimeoutError is reported as a timeout', async () => {
  globalThis.fetch = async () => {
    const err = new Error('The operation timed out');
    err.name = 'TimeoutError';
    throw err;
  };

  await assert.rejects(
    () => sendEmail({ to: 'a@x.com', subject: 's', text: 't' }),
    (err) => {
      assert.match(err.message, /email gateway unreachable/);
      assert.match(err.message, /timed out after 30000ms/);
      return true;
    },
  );
});

test('fetch rejection with a generic network error is reported verbatim', async () => {
  globalThis.fetch = async () => {
    throw new Error('ECONNREFUSED 127.0.0.1:2525');
  };

  await assert.rejects(
    () => sendEmail({ to: 'a@x.com', subject: 's', text: 't' }),
    (err) => {
      assert.match(err.message, /email gateway unreachable/);
      assert.match(err.message, /ECONNREFUSED 127.0.0.1:2525/);
      return true;
    },
  );
});

test('replyTo and from are forwarded when set', async () => {
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return jsonResponse(200, { success: true, messageId: 'msg-4' });
  };

  await sendEmail({
    to: 'a@x.com',
    subject: 's',
    text: 't',
    replyTo: 'reply@x.com',
    from: 'ops@verified-domain.com',
  });

  assert.equal(calls[0].replyTo, 'reply@x.com');
  assert.equal(calls[0].from, 'ops@verified-domain.com');
});
