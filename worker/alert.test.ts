import { describe, expect, it, vi } from "vitest";

import { escapeSlack, postToSlack } from "./alert";

describe("escapeSlack", () => {
    it("neutralises Slack markup, so a visitor cannot ping the channel or disguise a link", () => {
        expect(escapeSlack("<!channel> & <https://evil.example|click>")).toBe("&lt;!channel&gt; &amp; &lt;https://evil.example|click&gt;");
    });
});

describe("postToSlack", () => {
    it("posts the text as JSON to the webhook", async () => {
        const fetchImpl = vi.fn(async (_input: string, _init: RequestInit) => new Response("ok"));
        expect(await postToSlack("https://hooks.slack.com/services/T/B/x", "hello", fetchImpl)).toBe(true);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe("https://hooks.slack.com/services/T/B/x");
        expect(init.method).toBe("POST");
        expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
        expect(JSON.parse(init.body as string)).toEqual({ text: "hello" });
    });

    it("reports false when there is no webhook, Slack refuses, or the network fails", async () => {
        const fetchImpl = vi.fn(async () => new Response("ok"));
        expect(await postToSlack(undefined, "hello", fetchImpl)).toBe(false);
        expect(await postToSlack("", "hello", fetchImpl)).toBe(false);
        expect(fetchImpl).not.toHaveBeenCalled();
        expect(await postToSlack("https://hooks.slack.com/x", "hello", async () => new Response("no_service", { status: 404 }))).toBe(
            false
        );
        expect(
            await postToSlack("https://hooks.slack.com/x", "hello", async () => {
                throw new Error("offline");
            })
        ).toBe(false);
    });
});
