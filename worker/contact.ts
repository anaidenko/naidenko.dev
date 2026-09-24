import { singleLine, validateContact } from "../src/lib/contact";

export interface OutgoingEmail {
    to: string;
    from: { email: string; name: string };
    replyTo: { email: string; name: string };
    subject: string;
    text: string;
}

export interface ContactDeps {
    /** True while the key is under its limit. */
    rateLimit(key: string): Promise<boolean>;
    verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean>;
    sendEmail(message: OutgoingEmail): Promise<unknown>;
    to: string;
    from: string;
}

export const MAX_BODY_BYTES = 20_000;
const SUBJECT_MAX = 120;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers }
    });
}

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
    if (request.method !== "POST") return json({ ok: false, error: "method" }, 405, { Allow: "POST" });
    // Cloudflare sets the visitor's address on every request (and wrangler dev copies the local one).
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip && !(await deps.rateLimit(`contact:${ip}`))) return json({ ok: false, error: "rate-limit" }, 429, { "Retry-After": "60" });
    if (!(request.headers.get("Content-Type") ?? "").includes("application/json")) {
        return json({ ok: false, error: "content-type" }, 415);
    }
    if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
        return json({ ok: false, error: "too-large" }, 413);
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ ok: false, error: "too-large" }, 413);

    let payload: unknown;
    try {
        payload = JSON.parse(raw);
    } catch {
        return json({ ok: false, error: "json" }, 400);
    }
    const fields = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

    // People never see this field; bots fill it. Answer as if it worked and send nothing.
    if (typeof fields.website_url === "string" && fields.website_url.trim() !== "") return json({ ok: true });

    const result = validateContact(fields);
    if (!result.ok) return json({ ok: false, error: "invalid", fields: result.errors }, 422);

    const token = typeof fields.turnstileToken === "string" ? fields.turnstileToken : "";
    if (!token) return json({ ok: false, error: "turnstile" }, 400);
    if (!(await deps.verifyTurnstile(token, ip))) {
        return json({ ok: false, error: "turnstile" }, 403);
    }

    const { name, email, company, message } = result.value;
    const subject = singleLine(`[naidenko.dev] New message from ${name}${company ? ` (${company})` : ""}`).slice(0, SUBJECT_MAX);
    const text = [`Name: ${name}`, `Email: ${email}`, `Company or website: ${company || "—"}`, "", message].join("\n");

    try {
        await deps.sendEmail({
            to: deps.to,
            from: { email: deps.from, name: "naidenko.dev" },
            replyTo: { email, name },
            subject,
            text
        });
    } catch (error) {
        console.error("contact: send failed", error);
        return json({ ok: false, error: "send" }, 502);
    }
    return json({ ok: true });
}
