export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface TurnstileResult {
    success: boolean;
    /** Cloudflare's error codes, or "http-<status>" and "unreachable" when siteverify did not answer. */
    errors: string[];
}

/** Codes a visitor's token can cause. Any other failure is the site's own: its secret or its request. */
const VISITOR_ERRORS = new Set(["missing-input-response", "invalid-input-response", "timeout-or-duplicate"]);

export function isSiteFault(result: TurnstileResult): boolean {
    return !result.success && result.errors.some(code => !VISITOR_ERRORS.has(code));
}

/** Asks Cloudflare whether a Turnstile token is genuine. Any failure counts as "no". */
export async function verifyTurnstile(
    token: string,
    secret: string,
    remoteIp: string | null,
    fetchImpl: FetchLike = fetch
): Promise<TurnstileResult> {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);
    try {
        const response = await fetchImpl(SITEVERIFY_URL, { method: "POST", body });
        if (!response.ok) return { success: false, errors: [`http-${response.status}`] };
        const outcome = (await response.json()) as { "success"?: unknown; "error-codes"?: unknown };
        const codes = Array.isArray(outcome["error-codes"]) ? outcome["error-codes"] : [];
        return { success: outcome.success === true, errors: codes.filter((code): code is string => typeof code === "string") };
    } catch {
        return { success: false, errors: ["unreachable"] };
    }
}
