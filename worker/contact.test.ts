import { describe, expect, it, onTestFinished, vi } from "vitest";

import { type ContactDeps, MAX_BODY_BYTES, type OutgoingEmail, handleContact } from "./contact";

const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    company: "Analytical Engines",
    message: "We need an iOS and Android app for our field crews.",
    turnstileToken: "token-ok"
};

function post(body: unknown, headers: Record<string, string> = {}) {
    return new Request("https://naidenko.dev/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body)
    });
}

function setup(overrides: Partial<ContactDeps> = {}) {
    const sent: OutgoingEmail[] = [];
    const deps: ContactDeps = {
        rateLimit: vi.fn(async (_key: string) => true),
        verifyTurnstile: vi.fn(async () => ({ success: true, errors: [] as string[] })),
        alert: vi.fn(async (_text: string) => false),
        sendEmail: vi.fn(async (message: OutgoingEmail) => {
            sent.push(message);
        }),
        to: "inbox@example.net",
        from: "form@naidenko.dev",
        ...overrides
    };
    return { deps, sent };
}

describe("handleContact", () => {
    it("rejects methods other than POST", async () => {
        const res = await handleContact(new Request("https://naidenko.dev/api/contact"), setup().deps);
        expect(res.status).toBe(405);
        expect(res.headers.get("Allow")).toBe("POST");
    });

    it("rejects bodies that are not JSON", async () => {
        const plain = new Request("https://naidenko.dev/api/contact", {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: "hello"
        });
        expect((await handleContact(plain, setup().deps)).status).toBe(415);
        expect((await handleContact(post("{not json"), setup().deps)).status).toBe(400);
    });

    it("rejects bodies over the size limit", async () => {
        const res = await handleContact(post({ ...valid, message: "x".repeat(MAX_BODY_BYTES) }), setup().deps);
        expect(res.status).toBe(413);
    });

    it("rejects a declared Content-Length over the limit before reading", async () => {
        const res = await handleContact(post(valid, { "Content-Length": String(MAX_BODY_BYTES + 1) }), setup().deps);
        expect(res.status).toBe(413);
    });

    it("pretends to accept a filled honeypot and sends nothing", async () => {
        const { deps, sent } = setup();
        const res = await handleContact(post({ ...valid, website_url: "http://spam.example" }), deps);
        expect(res.status).toBe(200);
        expect(sent).toHaveLength(0);
        expect(deps.verifyTurnstile).not.toHaveBeenCalled();
    });

    it("returns field errors for invalid input", async () => {
        const res = await handleContact(post({ ...valid, email: "nope", message: "" }), setup().deps);
        expect(res.status).toBe(422);
        const body = (await res.json()) as { fields: Record<string, string> };
        expect(Object.keys(body.fields).sort()).toEqual(["email", "message"]);
    });

    it("requires a Turnstile token and a passing verification", async () => {
        const withoutToken = { ...valid, turnstileToken: undefined };
        expect((await handleContact(post(withoutToken), setup().deps)).status).toBe(400);
        const failing = setup({ verifyTurnstile: vi.fn(async () => ({ success: false, errors: ["invalid-input-response"] })) });
        expect((await handleContact(post(valid), failing.deps)).status).toBe(403);
        expect(failing.sent).toHaveLength(0);
    });

    it("passes the visitor IP to Turnstile", async () => {
        const { deps } = setup();
        await handleContact(post(valid, { "CF-Connecting-IP": "203.0.113.7" }), deps);
        expect(deps.verifyTurnstile).toHaveBeenCalledWith("token-ok", "203.0.113.7");
    });

    it("emails the message with the visitor as reply-to", async () => {
        const { deps, sent } = setup();
        const res = await handleContact(post(valid), deps);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({
            to: "inbox@example.net",
            from: { email: "form@naidenko.dev" },
            replyTo: { email: "ada@example.com", name: "Ada Lovelace" },
            subject: "[naidenko.dev] New message from Ada Lovelace (Analytical Engines)"
        });
        expect(sent[0].text).toContain("We need an iOS and Android app for our field crews.");
    });

    it("posts a copy of every message to Slack, in case the email lands in spam", async () => {
        const alert = vi.fn(async (_text: string) => true);
        const { deps } = setup({ alert });
        expect((await handleContact(post(valid), deps)).status).toBe(200);
        expect(alert).toHaveBeenCalledTimes(1);
        const text = alert.mock.calls[0][0];
        expect(text).toContain("New message on naidenko.dev");
        for (const part of [valid.name, valid.email, valid.company, valid.message]) expect(text).toContain(part);
        expect(text).not.toContain("did not go out");
    });

    it("still reports success when the email goes out but Slack is down", async () => {
        const { deps, sent } = setup({ alert: vi.fn(async () => false) });
        expect((await handleContact(post(valid), deps)).status).toBe(200);
        expect(sent).toHaveLength(1);
    });

    it("keeps the subject on one line and at most 120 characters", async () => {
        const { deps, sent } = setup();
        await handleContact(post({ ...valid, name: "A".repeat(100), company: `Acme\r\nBcc: x@example.com ${"B".repeat(150)}` }), deps);
        expect(sent).toHaveLength(1);
        expect(sent[0].subject).not.toMatch(/[\r\n]/);
        expect(sent[0].subject.length).toBeLessThanOrEqual(120);
    });

    it("reports a failed send as 502 and logs the error when Slack cannot take it either", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        onTestFinished(() => logged.mockRestore());
        const failing = setup({
            sendEmail: vi.fn(async () => {
                throw new Error("E_RATE_LIMIT_EXCEEDED");
            })
        });
        expect((await handleContact(post(valid), failing.deps)).status).toBe(502);
        expect(failing.deps.alert).toHaveBeenCalledTimes(1);
        expect(logged).toHaveBeenCalledWith("contact: send failed", expect.objectContaining({ message: "E_RATE_LIMIT_EXCEEDED" }));
    });

    it("forwards the message to Slack when the email fails, and tells the visitor it went through", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        onTestFinished(() => {
            vi.restoreAllMocks();
        });
        const alert = vi.fn(async (_text: string) => true);
        const failing = setup({
            alert,
            sendEmail: vi.fn(async () => {
                throw new Error("E_RATE_LIMIT_EXCEEDED");
            })
        });
        const res = await handleContact(post(valid), failing.deps);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        const text = alert.mock.calls[0][0];
        for (const part of ["naidenko.dev", "E_RATE_LIMIT_EXCEEDED", valid.name, valid.email, valid.company, valid.message]) {
            expect(text).toContain(part);
        }
    });

    it("escapes Slack markup in a forwarded message", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        onTestFinished(() => {
            vi.restoreAllMocks();
        });
        const alert = vi.fn(async (_text: string) => true);
        const failing = setup({
            alert,
            sendEmail: vi.fn(async () => {
                throw new Error("down");
            })
        });
        await handleContact(post({ ...valid, message: "Hi <!channel>, see <https://evil.example|this> & more" }), failing.deps);
        const text = alert.mock.calls[0][0];
        expect(text).not.toContain("<!channel>");
        expect(text).toContain("&lt;!channel&gt;");
        expect(text).toContain("&amp; more");
    });

    it("alerts when Turnstile rejects the site's own secret, but not a visitor's bad token", async () => {
        const broken = setup({ verifyTurnstile: vi.fn(async () => ({ success: false, errors: ["invalid-input-secret"] })) });
        expect((await handleContact(post(valid), broken.deps)).status).toBe(403);
        expect(broken.deps.alert).toHaveBeenCalledWith(expect.stringContaining("invalid-input-secret"));

        const visitor = setup({ verifyTurnstile: vi.fn(async () => ({ success: false, errors: ["timeout-or-duplicate"] })) });
        expect((await handleContact(post(valid), visitor.deps)).status).toBe(403);
        expect(visitor.deps.alert).not.toHaveBeenCalled();
    });

    it("answers 500 and alerts on an unexpected error", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        onTestFinished(() => {
            vi.restoreAllMocks();
        });
        const crashing = setup({
            rateLimit: vi.fn(async () => {
                throw new Error("binding missing");
            })
        });
        const res = await handleContact(post(valid, { "CF-Connecting-IP": "203.0.113.7" }), crashing.deps);
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ ok: false, error: "server" });
        expect(crashing.deps.alert).toHaveBeenCalledWith(expect.stringContaining("binding missing"));
    });

    it("turns away repeated sends from one address with 429", async () => {
        const limited = setup({ rateLimit: vi.fn(async () => false) });
        const res = await handleContact(post(valid, { "CF-Connecting-IP": "203.0.113.7" }), limited.deps);
        expect(res.status).toBe(429);
        expect(res.headers.get("Retry-After")).toBe("60");
        expect(limited.sent).toHaveLength(0);
        expect(limited.deps.verifyTurnstile).not.toHaveBeenCalled();
    });

    it("keys the limit by the visitor's address", async () => {
        const { deps } = setup();
        await handleContact(post(valid, { "CF-Connecting-IP": "203.0.113.7" }), deps);
        expect(deps.rateLimit).toHaveBeenCalledWith("contact:203.0.113.7");
    });

    it("skips the limit when a request carries no address", async () => {
        const { deps, sent } = setup();
        await handleContact(post(valid), deps);
        expect(deps.rateLimit).not.toHaveBeenCalled();
        expect(sent).toHaveLength(1);
    });

    it("stops reading a body without Content-Length once it passes the limit", async () => {
        let pulled = 0;
        const chunk = new TextEncoder().encode("x".repeat(4096));
        const body = new ReadableStream<Uint8Array>({
            pull(controller) {
                pulled += chunk.byteLength;
                controller.enqueue(chunk);
                if (pulled > 10_000_000) controller.close();
            }
        });
        const request = new Request("https://naidenko.dev/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            duplex: "half"
        } as RequestInit);
        expect((await handleContact(request, setup().deps)).status).toBe(413);
        expect(pulled).toBeLessThan(MAX_BODY_BYTES * 2);
    });

    it("accepts only the application/json media type, not a parameter that mentions it", async () => {
        const sneaky = new Request("https://naidenko.dev/api/contact", {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=application/json" },
            body: JSON.stringify(valid)
        });
        expect((await handleContact(sneaky, setup().deps)).status).toBe(415);
        const withCharset = post(valid, { "Content-Type": "application/json; charset=utf-8" });
        expect((await handleContact(withCharset, setup().deps)).status).toBe(200);
    });
});
