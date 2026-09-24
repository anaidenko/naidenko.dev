import { describe, expect, it } from "vitest";

import { CONSENT_KEY, gaCookieNames, readConsent, saveConsent } from "./analytics";

function memoryStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
        data,
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key)
    };
}

const blocked = {
    getItem: (): string | null => {
        throw new Error("storage blocked");
    },
    setItem: () => {
        throw new Error("storage blocked");
    },
    removeItem: () => {
        throw new Error("storage blocked");
    }
};

describe("readConsent", () => {
    it("returns null until the visitor chooses", () => {
        expect(readConsent(memoryStorage())).toBeNull();
    });

    it("returns the stored choice", () => {
        expect(readConsent(memoryStorage({ [CONSENT_KEY]: "granted" }))).toBe("granted");
        expect(readConsent(memoryStorage({ [CONSENT_KEY]: "denied" }))).toBe("denied");
    });

    it("ignores values it did not write", () => {
        expect(readConsent(memoryStorage({ [CONSENT_KEY]: "yes" }))).toBeNull();
    });

    it("treats blocked storage as no choice", () => {
        expect(readConsent(blocked)).toBeNull();
    });
});

describe("saveConsent", () => {
    it("stores the choice", () => {
        const storage = memoryStorage();
        saveConsent(storage, "granted");
        expect(storage.data.get(CONSENT_KEY)).toBe("granted");
    });

    it("forgets the choice when given null", () => {
        const storage = memoryStorage({ [CONSENT_KEY]: "denied" });
        saveConsent(storage, null);
        expect(storage.data.has(CONSENT_KEY)).toBe(false);
    });

    it("does not throw when storage is blocked", () => {
        expect(() => saveConsent(blocked, "granted")).not.toThrow();
    });
});

describe("gaCookieNames", () => {
    it("finds only Google Analytics cookies", () => {
        expect(gaCookieNames("_ga=GA1.1.1; theme=dark; _ga_ABC123=GS1.1.1; other_ga=1")).toEqual(["_ga", "_ga_ABC123"]);
    });

    it("handles an empty cookie string", () => {
        expect(gaCookieNames("")).toEqual([]);
    });
});
