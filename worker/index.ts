import { postToSlack } from "./alert";
import { handleContact } from "./contact";
import { verifyTurnstile } from "./turnstile";

export default {
    async fetch(request, env): Promise<Response> {
        const { pathname } = new URL(request.url);
        if (pathname === "/api/contact") {
            return handleContact(request, {
                rateLimit: async key => (await env.CONTACT_RATE_LIMIT.limit({ key })).success,
                verifyTurnstile: (token, remoteIp) => verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, remoteIp),
                sendEmail: message => env.EMAIL.send(message),
                alert: async text => {
                    const delivered = await postToSlack(env.SLACK_WEBHOOK_URL, text);
                    if (!delivered) console.warn("contact: alert not delivered to Slack", text);
                    return delivered;
                },
                to: env.CONTACT_TO,
                from: env.CONTACT_FROM
            });
        }
        return env.ASSETS.fetch(request);
    }
} satisfies ExportedHandler<Env>;
