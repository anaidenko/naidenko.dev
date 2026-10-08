import { vi } from "vitest";

/** Loads modules as the Toptal build does: NEXT_PUBLIC_SITE_VARIANT is read when src/lib/variant.ts loads. */
export async function asToptalBuild<T>(load: () => Promise<T>): Promise<T> {
    vi.stubEnv("NEXT_PUBLIC_SITE_VARIANT", "toptal");
    vi.resetModules();
    try {
        return await load();
    } finally {
        vi.unstubAllEnvs();
        vi.resetModules();
    }
}
