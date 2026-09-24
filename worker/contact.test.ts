import { describe, expect, it, vi } from 'vitest';
import { handleContact, MAX_BODY_BYTES, type ContactDeps, type OutgoingEmail } from './contact';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  message: 'We need an iOS and Android app for our field crews.',
  turnstileToken: 'token-ok',
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://naidenko.dev/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function setup(overrides: Partial<ContactDeps> = {}) {
  const sent: OutgoingEmail[] = [];
  const deps: ContactDeps = {
    verifyTurnstile: vi.fn(async () => true),
    sendEmail: vi.fn(async (message: OutgoingEmail) => {
      sent.push(message);
    }),
    to: 'inbox@example.net',
    from: 'form@naidenko.dev',
    ...overrides,
  };
  return { deps, sent };
}

describe('handleContact', () => {
  it('rejects methods other than POST', async () => {
    const res = await handleContact(new Request('https://naidenko.dev/api/contact'), setup().deps);
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });

  it('rejects bodies that are not JSON', async () => {
    const plain = new Request('https://naidenko.dev/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello',
    });
    expect((await handleContact(plain, setup().deps)).status).toBe(415);
    expect((await handleContact(post('{not json'), setup().deps)).status).toBe(400);
  });

  it('rejects bodies over the size limit', async () => {
    const res = await handleContact(post({ ...valid, message: 'x'.repeat(MAX_BODY_BYTES) }), setup().deps);
    expect(res.status).toBe(413);
  });

  it('rejects a declared Content-Length over the limit before reading', async () => {
    const res = await handleContact(post(valid, { 'Content-Length': String(MAX_BODY_BYTES + 1) }), setup().deps);
    expect(res.status).toBe(413);
  });

  it('pretends to accept a filled honeypot and sends nothing', async () => {
    const { deps, sent } = setup();
    const res = await handleContact(post({ ...valid, website_url: 'http://spam.example' }), deps);
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid input', async () => {
    const res = await handleContact(post({ ...valid, email: 'nope', message: '' }), setup().deps);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fields: Record<string, string> };
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'message']);
  });

  it('requires a Turnstile token and a passing verification', async () => {
    const withoutToken = { ...valid, turnstileToken: undefined };
    expect((await handleContact(post(withoutToken), setup().deps)).status).toBe(400);
    const failing = setup({ verifyTurnstile: vi.fn(async () => false) });
    expect((await handleContact(post(valid), failing.deps)).status).toBe(403);
    expect(failing.sent).toHaveLength(0);
  });

  it('passes the visitor IP to Turnstile', async () => {
    const { deps } = setup();
    await handleContact(post(valid, { 'CF-Connecting-IP': '203.0.113.7' }), deps);
    expect(deps.verifyTurnstile).toHaveBeenCalledWith('token-ok', '203.0.113.7');
  });

  it('emails the message with the visitor as reply-to', async () => {
    const { deps, sent } = setup();
    const res = await handleContact(post(valid), deps);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'inbox@example.net',
      from: { email: 'form@naidenko.dev' },
      replyTo: { email: 'ada@example.com', name: 'Ada Lovelace' },
      subject: 'naidenko.dev: Ada Lovelace (Analytical Engines)',
    });
    expect(sent[0].text).toContain('We need an iOS and Android app for our field crews.');
  });

  it('keeps the subject on one line and at most 120 characters', async () => {
    const { deps, sent } = setup();
    await handleContact(
      post({ ...valid, name: 'A'.repeat(100), company: `Acme\r\nBcc: x@example.com ${'B'.repeat(150)}` }),
      deps,
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).not.toMatch(/[\r\n]/);
    expect(sent[0].subject.length).toBeLessThanOrEqual(120);
  });

  it('reports a failed send as 502', async () => {
    const failing = setup({
      sendEmail: vi.fn(async () => {
        throw new Error('E_RATE_LIMIT_EXCEEDED');
      }),
    });
    expect((await handleContact(post(valid), failing.deps)).status).toBe(502);
  });
});
