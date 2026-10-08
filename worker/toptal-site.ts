import { handleToptalSite } from "./toptal";

/** The Toptal host's bindings (wrangler.toptal.jsonc). */
interface ToptalEnv {
    ASSETS: Fetcher;
    /** naidenko.dev's Worker, reached through a service binding. */
    SITE: Fetcher;
}

/**
 * toptal.naidenko.dev: the Toptal build, and its visits counted by naidenko.dev's Worker, which holds
 * the database, the visitor key and the ignored networks. Secrets cannot be read back to copy them.
 */
export default {
    async fetch(request, env): Promise<Response> {
        return handleToptalSite(request, {
            hit: () => env.SITE.fetch(request),
            asset: () => env.ASSETS.fetch(request)
        });
    }
} satisfies ExportedHandler<ToptalEnv>;
