export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Asks Cloudflare whether a Turnstile token is genuine. Any failure counts as "no". */
export async function verifyTurnstile(
    token: string,
    secret: string,
    remoteIp: string | null,
    fetchImpl: FetchLike = fetch
): Promise<boolean> {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);
    try {
        const response = await fetchImpl(SITEVERIFY_URL, { method: "POST", body });
        if (!response.ok) return false;
        const outcome = (await response.json()) as { success?: unknown };
        return outcome.success === true;
    } catch {
        return false;
    }
}
