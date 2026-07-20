// Mirror of the sendEmail helper documented in
// skills/godaddy-nodejs-hosting-email/SKILL.md — keep behaviourally
// identical. This is a plain-JavaScript CommonJS port of the TypeScript
// version in the skill; the runtime behaviour is byte-identical.

const EMAIL_GATEWAY_URL = 'http://127.0.0.1:2525/api/email/send';
const REQUEST_TIMEOUT_MS = 30_000;

async function sendEmail(input) {
  const payload = buildPayload(input);

  let response;
  let body;
  try {
    response = await fetch(EMAIL_GATEWAY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    body = await parseBody(response);
  } catch (err) {
    throw new Error(`email gateway unreachable: ${describeError(err)}`);
  }

  if (!response.ok || !body.success) {
    const detail = body.error ?? `HTTP ${response.status}`;
    const idSuffix = body.messageId ? ` (messageId=${body.messageId})` : '';
    throw new Error(`email send failed: ${detail}${idSuffix}`);
  }

  if (!body.messageId) {
    throw new Error('email send succeeded but gateway returned no messageId');
  }

  return { messageId: body.messageId };
}

function buildPayload(input) {
  const payload = {
    to: toArray(input.to),
    subject: input.subject,
  };
  const cc = toArray(input.cc);
  if (cc.length > 0) payload.cc = cc;
  const bcc = toArray(input.bcc);
  if (bcc.length > 0) payload.bcc = bcc;
  if (input.text) payload.text = input.text;
  if (input.html) payload.html = input.html;
  if (input.replyTo) payload.replyTo = input.replyTo;
  if (input.from) payload.from = input.from;
  if (input.attachments && input.attachments.length > 0) {
    payload.attachments = input.attachments.map(encodeAttachment);
  }
  return payload;
}

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function encodeAttachment(att) {
  const out = {
    filename: att.filename,
    content: Buffer.from(att.content).toString('base64'),
  };
  if (att.contentType) out.contentType = att.contentType;
  return out;
}

async function parseBody(response) {
  try {
    return await response.json();
  } catch (err) {
    if (isAbortLike(err)) throw err;
    return { success: false, error: `non-JSON response (HTTP ${response.status})` };
  }
}

function isAbortLike(err) {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

function describeError(err) {
  if (err instanceof Error) {
    if (isAbortLike(err)) return `timed out after ${REQUEST_TIMEOUT_MS}ms`;
    return err.message;
  }
  return String(err);
}

module.exports = { sendEmail, REQUEST_TIMEOUT_MS };
