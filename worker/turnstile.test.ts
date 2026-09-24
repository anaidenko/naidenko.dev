import { describe, expect, it, vi } from "vitest";

import { SITEVERIFY_URL, verifyTurnstile } from "./turnstile";

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("verifyTurnstile", () => {
    it("posts the secret, token and IP to siteverify", async () => {
        const fetchImpl = vi.fn(async (_input: string, _init: RequestInit) => jsonResponse({ success: true }));
        await verifyTurnstile("token-1", "secret-1", "203.0.113.7", fetchImpl);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe(SITEVERIFY_URL);
        const body = init.body as FormData;
        expect(body.get("secret")).toBe("secret-1");
        expect(body.get("response")).toBe("token-1");
        expect(body.get("remoteip")).toBe("203.0.113.7");
    });

    it("returns true only when Cloudflare reports success", async () => {
        expect(await verifyTurnstile("t", "s", null, async () => jsonResponse({ success: true }))).toBe(true);
        expect(
            await verifyTurnstile("t", "s", null, async () => jsonResponse({ "success": false, "error-codes": ["invalid-input-response"] }))
        ).toBe(false);
    });

    it("fails closed on HTTP errors and network failures", async () => {
        expect(await verifyTurnstile("t", "s", null, async () => jsonResponse({}, 500))).toBe(false);
        expect(
            await verifyTurnstile("t", "s", null, async () => {
                throw new Error("offline");
            })
        ).toBe(false);
    });
});
