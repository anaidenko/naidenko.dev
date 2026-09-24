import { describe, expect, it, vi } from "vitest";

import { SITEVERIFY_URL, isSiteFault, verifyTurnstile } from "./turnstile";

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

    it("passes on Cloudflare's verdict and its error codes", async () => {
        expect(await verifyTurnstile("t", "s", null, async () => jsonResponse({ success: true }))).toEqual({ success: true, errors: [] });
        expect(
            await verifyTurnstile("t", "s", null, async () => jsonResponse({ "success": false, "error-codes": ["invalid-input-response"] }))
        ).toEqual({ success: false, errors: ["invalid-input-response"] });
    });

    it("fails closed on HTTP errors and network failures, and says which", async () => {
        expect(await verifyTurnstile("t", "s", null, async () => jsonResponse({}, 500))).toEqual({ success: false, errors: ["http-500"] });
        expect(
            await verifyTurnstile("t", "s", null, async () => {
                throw new Error("offline");
            })
        ).toEqual({ success: false, errors: ["unreachable"] });
    });
});

describe("isSiteFault", () => {
    it("blames the visitor for a bad, stale or missing token", () => {
        for (const code of ["invalid-input-response", "timeout-or-duplicate", "missing-input-response"]) {
            expect(isSiteFault({ success: false, errors: [code] })).toBe(false);
        }
    });

    it("blames the site for its secret, a malformed request or an unreachable siteverify", () => {
        for (const code of ["invalid-input-secret", "missing-input-secret", "bad-request", "internal-error", "http-500", "unreachable"]) {
            expect(isSiteFault({ success: false, errors: [code] })).toBe(true);
        }
        expect(isSiteFault({ success: true, errors: [] })).toBe(false);
    });
});
