import { singleLine, validateContact } from "../src/lib/contact";

import { escapeSlack } from "./alert";
import { type TurnstileResult, isSiteFault } from "./turnstile";

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
    verifyTurnstile(token: string, remoteIp: string | null): Promise<TurnstileResult>;
    sendEmail(message: OutgoingEmail): Promise<unknown>;
    /** Posts an alert to Andrii's Slack channel; true when Slack accepted it. */
    alert(text: string): Promise<boolean>;
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

/** The media type without parameters: "application/json; charset=utf-8" → "application/json". */
function mediaType(contentType: string | null): string {
    return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

/** Reads the body as text, or returns null as soon as it passes `limit` bytes (a chunked body has no Content-Length). */
async function readLimited(request: Request, limit: number): Promise<string | null> {
    if (!request.body) return "";
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
}

function describe(error: unknown): string {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
    const host = new URL(request.url).host;
    try {
        return await respond(request, deps, host);
    } catch (error) {
        console.error("contact: unexpected error", error);
        await deps.alert(
            `:rotating_light: *Contact form on ${host}: unexpected error.* The visitor saw a failure.\n${escapeSlack(describe(error))}`
        );
        return json({ ok: false, error: "server" }, 500);
    }
}

async function respond(request: Request, deps: ContactDeps, host: string): Promise<Response> {
    if (request.method !== "POST") return json({ ok: false, error: "method" }, 405, { Allow: "POST" });
    // Cloudflare sets the visitor's address on every request (and wrangler dev copies the local one).
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip && !(await deps.rateLimit(`contact:${ip}`))) return json({ ok: false, error: "rate-limit" }, 429, { "Retry-After": "60" });
    if (mediaType(request.headers.get("Content-Type")) !== "application/json") {
        return json({ ok: false, error: "content-type" }, 415);
    }
    if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
        return json({ ok: false, error: "too-large" }, 413);
    }

    const raw = await readLimited(request, MAX_BODY_BYTES);
    if (raw === null) return json({ ok: false, error: "too-large" }, 413);

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
    const check = await deps.verifyTurnstile(token, ip);
    if (!check.success) {
        if (isSiteFault(check)) {
            await deps.alert(
                `:rotating_light: *Contact form on ${host}: Turnstile refused the site's own check* (${escapeSlack(check.errors.join(", "))}). Messages are refused while this lasts.`
            );
        }
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
        // Slack is the fallback inbox: once the message lands there, the visitor has reached Andrii.
        const forwarded = await deps.alert(
            [
                `:warning: *Contact form on ${host}: the email did not go out* (${escapeSlack(describe(error))}). The message is below; reply to the sender by email.`,
                "",
                escapeSlack(text)
            ].join("\n")
        );
        return forwarded ? json({ ok: true }) : json({ ok: false, error: "send" }, 502);
    }
    return json({ ok: true });
}
