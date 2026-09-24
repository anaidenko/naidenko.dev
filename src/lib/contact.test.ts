import { describe, expect, it } from "vitest";

import { CONTACT_LIMITS, singleLine, validateContact } from "./contact";

const valid = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    company: "Analytical Engines",
    message: "We need an iOS and Android app for our field crews."
};

describe("validateContact", () => {
    it("accepts a complete submission and trims it", () => {
        const result = validateContact({ ...valid, name: "  Ada Lovelace ", email: " ada@example.com " });
        expect(result).toEqual({ ok: true, value: valid });
    });

    it("treats the company as optional", () => {
        const result = validateContact({ ...valid, company: undefined });
        expect(result).toEqual({ ok: true, value: { ...valid, company: "" } });
    });

    it("reports every missing required field", () => {
        const result = validateContact({});
        expect(result.ok).toBe(false);
        if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["email", "message", "name"]);
    });

    it("rejects a malformed email", () => {
        expect(validateContact({ ...valid, email: "ada@example" })).toMatchObject({
            ok: false,
            errors: { email: expect.any(String) }
        });
    });

    it("rejects a message that is too short or too long", () => {
        expect(validateContact({ ...valid, message: "Hi there" }).ok).toBe(false);
        expect(validateContact({ ...valid, message: "x".repeat(CONTACT_LIMITS.messageMax + 1) }).ok).toBe(false);
    });

    it("rejects over-long names and companies", () => {
        expect(validateContact({ ...valid, name: "x".repeat(CONTACT_LIMITS.name + 1) }).ok).toBe(false);
        expect(validateContact({ ...valid, company: "x".repeat(CONTACT_LIMITS.company + 1) }).ok).toBe(false);
    });

    it("flattens line breaks in single-line fields", () => {
        expect(validateContact({ ...valid, name: "Ada\r\nBcc: spam@example.com" })).toMatchObject({
            ok: true,
            value: { name: "Ada Bcc: spam@example.com" }
        });
    });

    it("keeps line breaks in the message", () => {
        const message = "First line of the brief.\nSecond line.";
        expect(validateContact({ ...valid, message })).toMatchObject({ ok: true, value: { message } });
    });

    it("ignores values that are not strings", () => {
        expect(validateContact({ name: 42, email: ["a@b.co"], message: { text: "hello there friend" } }).ok).toBe(false);
    });

    it("rejects input that is not an object", () => {
        expect(validateContact(null).ok).toBe(false);
        expect(validateContact("name=Ada").ok).toBe(false);
    });
});

describe("singleLine", () => {
    it("collapses whitespace runs", () => {
        expect(singleLine("  a \n\t b  ")).toBe("a b");
    });
});
