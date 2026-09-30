import { describe, expect, it } from "vitest";

import { forgetVisitors, retentionCutoff } from "./retention";

describe("retentionCutoff", () => {
    it("is the same day 13 months earlier", () => {
        expect(retentionCutoff(new Date("2026-09-30T03:17:00Z"))).toBe("2025-08-30");
        expect(retentionCutoff(new Date("2027-01-15T03:17:00Z"))).toBe("2025-12-15");
    });

    it("falls back to the month's last day when the month is shorter", () => {
        expect(retentionCutoff(new Date("2027-03-31T03:17:00Z"))).toBe("2026-02-28");
    });
});

describe("forgetVisitors", () => {
    it("erases the visitor hash of every visit before the cutoff, and nothing else", async () => {
        const calls: { sql: string; args: unknown[] }[] = [];
        const db = {
            prepare: (sql: string) => ({
                bind: (...args: unknown[]) => ({
                    run: async () => {
                        calls.push({ sql, args });
                        return {};
                    }
                })
            })
        } as unknown as D1Database;
        await forgetVisitors(db, "2025-08-30");
        expect(calls).toEqual([{ sql: "UPDATE visits SET visitor = NULL WHERE visitor IS NOT NULL AND day < ?1", args: ["2025-08-30"] }]);
    });
});
