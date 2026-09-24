type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Slack reads <, > and & as markup: unescaped, a visitor's "<!channel>" would ping the channel. */
export function escapeSlack(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Posts to a Slack incoming webhook. True only when Slack accepted the message. */
export async function postToSlack(webhookUrl: string | undefined, text: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
    if (!webhookUrl) return false;
    try {
        const response = await fetchImpl(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        return response.ok;
    } catch {
        return false;
    }
}
