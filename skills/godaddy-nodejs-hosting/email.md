# Email via the Node.js Hosting email gateway

Send transactional email from an app on GoDaddy Node.js Hosting by `POST`ing JSON to the platform's built-in email gateway. The gateway authors the RFC-5322 message, applies platform sender-identity policy, attaches required tracking headers, and forwards to the configured SMTP relay. Customer code never touches SMTP — no `nodemailer`, no SMTP config, no third-party API keys.

The gateway listens on `http://127.0.0.1:2525/api/email/send` inside every Node.js Hosting container. It is loopback-only — traffic never leaves the kernel — so no TLS is needed for the loopback hop.

Copy the [`sendEmail()` helper](#the-helper) into the app and call it. **All email-sending code should call the helper** — do not POST to the gateway directly, and do not import `nodemailer`.

Referenced from [SKILL.md](SKILL.md) (`## Email`). Contract rule: **C13**.

---

## When email applies

- Send transactional emails (order confirmations, password resets, receipts).
- Implement contact forms.
- Send notifications (alerts, reminders, digests).
- Migrate existing Nodemailer/SMTP code to the gateway (see [Migrating from Nodemailer](#migrating-from-nodemailer)).

---

## Installation

There is no `npm install` step — the helper uses Node's native `fetch` and ships no runtime dependency.

1. Create `src/server/email.ts` (or `src/server/email.js` — see [JavaScript variant](#javascript-variant)) in your project.
2. Copy the helper from [The helper](#the-helper) below verbatim into that file.
3. Import from your route handlers or workers:

   ```typescript
   import { sendEmail } from './server/email';
   ```

Adjust the import path to match your project layout — the helper doesn't care where it lives.

---

## The helper

Copy this file into your project as `src/server/email.ts`. Keep it byte-for-byte as shown — the timeout handling and abort-signal wiring are load-bearing.

```typescript
// Mirror of the Airo email skill's sendEmail helper — keep behaviourally
// identical when updating on either side. Source of truth (private):
// airo-app-builder/agents/src/skills/email/templates/server/email.ts

/**
 * Send transactional email through the Node.js Hosting email gateway.
 *
 * Posts a JSON message to the loopback gateway provided by the platform
 * runtime. The gateway authors the outbound RFC-5322 message, applies
 * the platform sender-identity policy, and forwards to the configured
 * SMTP destination. Customer code never touches SMTP directly.
 *
 * The gateway listens on 127.0.0.1:2525 inside the Node.js Hosting
 * container; this module assumes that contract and does not accept an
 * override.
 */

// Loopback only — the email gateway runs on 127.0.0.1 inside the same
// container as customer code. TLS adds nothing for traffic that never
// leaves the kernel and would require cert provisioning for 127.0.0.1
// in every container.
const EMAIL_GATEWAY_URL = "http://127.0.0.1:2525/api/email/send";
const REQUEST_TIMEOUT_MS = 30_000;

export type EmailAttachment = {
	/** File name presented to the recipient. Must not contain CR, LF, quote, or backslash. */
	filename: string;
	/**
	 * Attachment bytes. Always pass raw bytes — the helper base64-encodes
	 * for the wire. For text content (e.g. an .ics calendar invite),
	 * encode the string yourself: `Buffer.from(text, 'utf-8')`.
	 */
	content: Buffer | Uint8Array;
	/** MIME type. Defaults to application/octet-stream when omitted. */
	contentType?: string;
};

export type SendEmailInput = {
	/** Recipient address(es). At least one required. */
	to: string | string[];
	/** Carbon-copy recipient(s). */
	cc?: string | string[];
	/** Blind-carbon-copy recipient(s). Never appears in headers. */
	bcc?: string | string[];
	/** Subject line. Required. */
	subject: string;
	/** Plain-text body. At least one of text or html is required. */
	text?: string;
	/** HTML body. At least one of text or html is required. */
	html?: string;
	/** Reply-To header. Use this to direct replies elsewhere. */
	replyTo?: string;
	/**
	 * Sender address. Omit to use the app's canonical sender — the gateway
	 * picks the right value based on attached domains. Only set this when
	 * a specific local-part on a verified domain is required; the gateway
	 * rejects unverified senders with a 400.
	 */
	from?: string;
	/** Up to 10 attachments, each ≤ 2 MB decoded. */
	attachments?: EmailAttachment[];
};

export type SendEmailResult = {
	/** Opaque id minted by the gateway. Logged on the gateway for correlation. */
	messageId: string;
};

type GatewayPayload = {
	to: string[];
	cc?: string[];
	bcc?: string[];
	subject: string;
	text?: string;
	html?: string;
	replyTo?: string;
	from?: string;
	attachments?: { filename: string; content: string; contentType?: string }[];
};

type GatewayResponse = {
	success: boolean;
	messageId?: string;
	error?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
	const payload = buildPayload(input);

	// AbortSignal.timeout() binds to the response so the same deadline
	// covers connect, headers, AND body reads. A manual
	// `setTimeout(controller.abort, ...)` cleared in `finally` after
	// `fetch()` resolves headers leaves body reads unprotected — the
	// caller hangs indefinitely on a stalled mid-body response.
	let response: Response;
	let body: GatewayResponse;
	try {
		response = await fetch(EMAIL_GATEWAY_URL, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		body = await parseBody(response);
	} catch (err) {
		throw new Error(`email gateway unreachable: ${describeError(err)}`);
	}

	if (!response.ok || !body.success) {
		const detail = body.error ?? `HTTP ${response.status}`;
		const idSuffix = body.messageId ? ` (messageId=${body.messageId})` : "";
		throw new Error(`email send failed: ${detail}${idSuffix}`);
	}

	if (!body.messageId) {
		throw new Error("email send succeeded but gateway returned no messageId");
	}

	return { messageId: body.messageId };
}

function buildPayload(input: SendEmailInput): GatewayPayload {
	const payload: GatewayPayload = {
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

function toArray(value: string | string[] | undefined): string[] {
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

function encodeAttachment(att: EmailAttachment): { filename: string; content: string; contentType?: string } {
	const out: { filename: string; content: string; contentType?: string } = {
		filename: att.filename,
		content: Buffer.from(att.content).toString("base64"),
	};
	if (att.contentType) out.contentType = att.contentType;
	return out;
}

async function parseBody(response: Response): Promise<GatewayResponse> {
	try {
		return (await response.json()) as GatewayResponse;
	} catch (err) {
		// Don't swallow aborts — re-raise so the outer catch reports the
		// timeout. JSON parse errors fall through to a sanitized "non-JSON
		// response" payload that lets sendEmail produce a useful error.
		if (isAbortLike(err)) throw err;
		return { success: false, error: `non-JSON response (HTTP ${response.status})` };
	}
}

function isAbortLike(err: unknown): boolean {
	return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function describeError(err: unknown): string {
	if (err instanceof Error) {
		if (isAbortLike(err)) return `timed out after ${REQUEST_TIMEOUT_MS}ms`;
		return err.message;
	}
	return String(err);
}
```

### JavaScript variant

If the project is plain JavaScript, strip the TypeScript type annotations. `sendEmail`, `buildPayload`, `toArray`, `encodeAttachment`, `parseBody`, `isAbortLike`, and `describeError` all become plain functions. The behaviour is identical.

---

## Critical security rules

### ⚠️ Sender address (`from`) — default to OMITTING

**Omit `from` by default.** The gateway picks the canonical sender per app — typically `<appId>@<defaultDomain>`, or `<appId>@<verifiedCustomDomain>` when the customer has attached and verified one. The gateway always knows the right answer; the app does not.

Set `from` only when the customer explicitly asks for a specific sender on a verified domain. When you do set it:

- It MUST be a hardcoded string literal in source. Never read it from form input, request bodies, query parameters, headers, or environment variables.
- The address must be on the platform default domain (with the app's local-part) or on a domain the customer has verified-attached. Anything else → 400. The error message lists the verified domains so you can correct it.

**Why hardcoded:** prevents end-users of the built app from spoofing the sender.

### ⚠️ Recipient address (`to`) — READ FROM ENVIRONMENT

For transactional notifications where the recipient is fixed configuration (contact form admin, order alerts, system notifications), **read the address from `process.env` at runtime and set the value in the Node.js Hosting UI environment-variables panel** — do not hardcode it in source, do not insert a placeholder, do not invent a TODO comment.

```typescript
const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
if (!recipient) {
  // Fail closed — sending to nowhere would silently drop submissions.
  console.error('email.contact_form.recipient_unset');
  return res.status(500).json({ error: 'Email recipient not configured' });
}
```

Customers set `CONTACT_FORM_RECIPIENT_EMAIL` (and any other recipient env vars) once, in the hosting UI, and can update it later without a code change.

For per-user recipients (welcome emails, password resets, order receipts to a buyer), the recipient comes from your application data — pass it through directly, never hardcode and never read from request bodies sent by anonymous end-users.

### ⚠️ Don't echo gateway errors to end-users

The gateway returns helpful error messages that may include the customer's verified-domain list. Customer code should avoid surfacing the raw error string to end-users. Log it server-side and show a generic "we couldn't send your message — please try again" to the caller.

---

## Sender identity

The gateway resolves the sender per-app from configuration the app cannot see. There are three things to know:

1. **Default sender.** When `from` is omitted, the gateway uses `<appId>@<primaryDomain>`. Primary domain is the customer's verified-attached domain when one exists; otherwise the platform default.
2. **Attached custom domains.** When the customer attaches a domain, the gateway updates automatically. **No code change is required.** Existing `sendEmail({ ... })` calls start sending from the new domain on the next request.
3. **Unverified `from` rejection.** If you pass `from: "support@acme.com"` and `acme.com` is not on the app's verified-attached list, the gateway returns 400. The helper surfaces that as a thrown `Error` with the gateway's reason. This is intentional — silently rewriting would mask a misconfiguration.

---

## Quickstart

```typescript
import { sendEmail } from './server/email';

await sendEmail({
  to: 'customer@example.com',
  subject: 'Welcome',
  text: 'Thanks for signing up!',
  html: '<p>Thanks for signing up!</p>',
});
```

That's the entire surface. Both `text` and `html` are optional individually, but at least one is required. `to` accepts a single string or an array.

---

## Common patterns

### Contact form handler

Set `CONTACT_FORM_RECIPIENT_EMAIL` in the Node.js Hosting UI (see [Recipient address](#recipient-address-to--read-from-environment) above). Then:

```typescript
import type { Request, Response } from 'express';
import { sendEmail } from './server/email';

export default async function handler(req: Request, res: Response) {
  const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
  if (!recipient) {
    // The env var hasn't been set yet. Fail closed — sending to nowhere
    // would silently drop submissions; a 500 surfaces the misconfiguration.
    console.error('email.contact_form.recipient_unset');
    return res.status(500).json({ error: 'Email recipient not configured' });
  }

  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await sendEmail({
      to: recipient,
      replyTo: email, // so the recipient can reply directly to the submitter
      subject: `Contact form: ${name}`,
      text: `From: ${name} (${email})\n\n${message}`,
      // No html field — user input must not be interpolated into HTML without escaping.
    });
    res.json({ success: true });
  } catch (error) {
    console.error('email.send.failed', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}
```

### Notification email

```typescript
import { sendEmail } from './server/email';

export async function sendWelcomeEmail(userEmail: string) {
  await sendEmail({
    to: userEmail,
    subject: 'Welcome to Our App',
    text: 'Thanks for signing up!',
    html: '<h1>Welcome!</h1><p>Thanks for signing up!</p>',
  });
}
```

### Email with attachment (e.g. `.ics` calendar invite)

`content` always takes raw bytes (`Buffer` or `Uint8Array`); the helper base64-encodes for the wire. Wrap text strings explicitly with `Buffer.from(text, 'utf-8')`:

```typescript
import { sendEmail } from './server/email';

export async function sendAppointmentConfirmation(
  customerEmail: string,
  icsContent: string,
) {
  await sendEmail({
    to: customerEmail,
    subject: 'Your appointment is confirmed',
    html: '<p>See attached calendar invite.</p>',
    attachments: [
      {
        filename: 'appointment.ics',
        content: Buffer.from(icsContent, 'utf-8'),
        contentType: 'text/calendar; charset=utf-8; method=REQUEST',
      },
    ],
  });
}
```

Binary attachments pass through the same way — read the file into a `Buffer`:

```typescript
import { readFile } from 'node:fs/promises';
import { sendEmail } from './server/email';

const pdf = await readFile('/tmp/receipt.pdf');
await sendEmail({
  to: customerEmail,
  subject: 'Your receipt',
  text: 'Receipt attached.',
  attachments: [
    { filename: 'receipt.pdf', content: pdf, contentType: 'application/pdf' },
  ],
});
```

---

## Error handling

`sendEmail` throws on any failure (network error, validation error, gateway 4xx/5xx). Wrap calls in `try`/`catch`:

```typescript
try {
  const { messageId } = await sendEmail({ to, subject, text });
  console.log('email.send.ok', { messageId });
} catch (error) {
  console.error('email.send.failed', error);
  // Show a generic failure message to the end user — do not surface error.message.
}
```

The thrown error message includes the gateway's `messageId` when one was minted (useful for log correlation). Don't depend on the message format programmatically; treat any throw as "the email did not send."

---

## Limits

The gateway enforces these caps; the helper does not pre-validate. If you exceed any of them the call throws.

| Limit | Value |
| --- | --- |
| Total recipients (`to` + `cc` + `bcc`) | 100 |
| `subject` length | 998 bytes |
| `text` body | 1 MB |
| `html` body | 1 MB |
| Attachments per send | 10 |
| Decoded size per attachment | 2 MB |
| Total request body | 5 MB |

For mass mail or large attachments, batch into multiple sends or move the data out-of-band.

---

## Migrating from Nodemailer

If the customer's existing code uses `nodemailer` (SMTP to `localhost:25` or an external provider), migrate it to the helper. The gateway is a better default: no SMTP config, sender identity handled centrally, and no third-party API keys to manage. Outbound SMTP is not routable from the container, so `nodemailer` cannot work on the platform regardless.

**Mechanical mapping:**

| Nodemailer | `sendEmail` |
| --- | --- |
| `transport.sendMail({ from, to, cc, bcc, subject, text, html, replyTo })` | `sendEmail({ from, to, cc, bcc, subject, text, html, replyTo })` |
| `transport.sendMail({ ..., attachments: [{ filename, content, contentType }] })` | `sendEmail({ ..., attachments: [{ filename, content: Buffer.from(content), contentType }] })` — `content` must be `Buffer`/`Uint8Array`. Wrap text content explicitly: `Buffer.from(text, 'utf-8')`. |
| `from: 'noreply@example.com'` (hardcoded) | omit `from` (gateway picks canonical sender — typically better) |

**Steps:**

1. Copy the helper from [The helper](#the-helper) above into `src/server/email.ts`.
2. Replace each `nodemailer.createTransport(...)` block with `import { sendEmail } from './server/email'`.
3. Replace each `transport.sendMail({ ... })` call with `await sendEmail({ ... })`.
4. Remove any hardcoded `from:` — let the gateway pick the canonical sender unless the customer has a specific custom-domain sender they want.
5. Remove `nodemailer` and `@types/nodemailer` from `package.json`.
6. Drop any unused imports.

The gateway's input shape was designed to mirror Nodemailer's, so most call sites translate one-for-one. Three differences to watch for:

- **No `Mail.Options` extras.** Fields like `priority`, `headers`, `dsn`, `envelope` aren't supported. If the customer was using them, ask whether they're load-bearing before dropping.
- **Attachments use a smaller schema.** The helper's `attachments` accepts only `{ filename, content, contentType? }`, and `content` must be `Buffer` or `Uint8Array` — Nodemailer accepted UTF-8 strings as text-attachment content; this helper does not. Wrap text strings as `Buffer.from(text, 'utf-8')`. Other Nodemailer attachment options (`path`, `href`, `cid`, `encoding`) aren't supported — read files into a Buffer first and pass the bytes.
- **`from` policy is enforced.** Nodemailer would happily send `from: 'whatever@anywhere.com'`; the gateway returns 400 unless the domain is verified-attached. Default to omitting.

---

## Key rules recap

- **Use `sendEmail` from your local copy** — never POST to the gateway directly, never import `nodemailer`.
- **Default to omitting `from`** — the gateway picks the right sender per app.
- **Store fixed recipients as environment variables** (e.g. `CONTACT_FORM_RECIPIENT_EMAIL`) and read them from `process.env` — never hardcode and never insert TODO placeholders. Set the value in the Node.js Hosting UI.
- **For per-user recipients, plumb the value through** — don't read recipient addresses from anonymous request bodies.
- **Hardcode `from` if you set it explicitly** — never read from end-user input.
- **Wrap in try/catch and don't surface raw errors** to end-users.
