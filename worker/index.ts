import { postToSlack } from "./alert";
import { handleContact } from "./contact";
import { handleHit, placeOf, recordEvent, recordTime, recordVisit } from "./hits";
import { handleHome } from "./home";
import { forgetVisitors, retentionCutoff } from "./retention";
import { handleStats, loadStats } from "./stats";
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
        if (pathname === "/api/hit") {
            return handleHit(request, {
                rateLimit: async key => (await env.HIT_RATE_LIMIT.limit({ key })).success,
                recordVisit: row => recordVisit(env.STATS_DB, row),
                recordEvent: row => recordEvent(env.STATS_DB, row),
                recordTime: (visit, seconds) => recordTime(env.STATS_DB, visit, seconds),
                now: () => new Date(),
                place: placeOf(request.cf),
                ignoredNetworks: env.IGNORE_NETWORKS ?? "",
                visitorKey: env.VISITOR_KEY ?? ""
            });
        }
        if (pathname === "/stats") {
            return handleStats(request, {
                password: env.STATS_PASSWORD ?? "",
                load: filter => loadStats(env.STATS_DB, filter),
                now: () => new Date()
            });
        }
        if (pathname === "/") {
            return handleHome(request, {
                page: () => env.ASSETS.fetch(request),
                fetchAsset: path => env.ASSETS.fetch(new URL(path, request.url))
            });
        }
        return env.ASSETS.fetch(request);
    },

    async scheduled(controller, env, ctx) {
        ctx.waitUntil(forgetVisitors(env.STATS_DB, retentionCutoff(new Date(controller.scheduledTime))));
    }
} satisfies ExportedHandler<Env>;
