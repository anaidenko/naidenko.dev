/**
 * How long a visit keeps its visitor hash. The hash is the only part of a visit that tells one
 * person from another, so it goes after a year and a month; the rest of the visit stays.
 */
export const VISITOR_MONTHS = 13;

/** The first day whose visits keep their hash, as YYYY-MM-DD (UTC). */
export function retentionCutoff(now: Date): string {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() - VISITOR_MONTHS;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(now.getUTCDate(), lastDay))).toISOString().slice(0, 10);
}

export function forgetVisitors(db: D1Database, cutoff: string): Promise<D1Result> {
    return db.prepare("UPDATE visits SET visitor = NULL WHERE visitor IS NOT NULL AND day < ?1").bind(cutoff).run();
}
