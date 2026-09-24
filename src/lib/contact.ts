/** Field rules shared by the contact form (browser) and the Worker (server). */
export interface ContactInput {
    name: string;
    email: string;
    company: string;
    message: string;
}

export type ContactField = keyof ContactInput;
export type ContactErrors = Partial<Record<ContactField, string>>;
export type ContactValidation = { ok: true; value: ContactInput } | { ok: false; errors: ContactErrors };

export const CONTACT_LIMITS = {
    name: 100,
    email: 254,
    company: 200,
    messageMin: 10,
    messageMax: 5000
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

/** Collapses runs of whitespace, line breaks included, into single spaces. */
export function singleLine(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function validateContact(raw: unknown): ContactValidation {
    const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
    const value: ContactInput = {
        name: singleLine(text(source.name)),
        email: text(source.email),
        company: singleLine(text(source.company)),
        message: text(source.message)
    };
    const errors: ContactErrors = {};

    if (!value.name) errors.name = "Please enter your name.";
    else if (value.name.length > CONTACT_LIMITS.name) errors.name = `Please keep your name under ${CONTACT_LIMITS.name} characters.`;

    if (!value.email) errors.email = "Please enter your email.";
    else if (value.email.length > CONTACT_LIMITS.email || !EMAIL_PATTERN.test(value.email)) {
        errors.email = "Please enter a valid email address.";
    }

    if (value.company.length > CONTACT_LIMITS.company) {
        errors.company = `Please keep this under ${CONTACT_LIMITS.company} characters.`;
    }

    if (!value.message) errors.message = "Please tell me what you’re building.";
    else if (value.message.length < CONTACT_LIMITS.messageMin) errors.message = "Please add a little more detail.";
    else if (value.message.length > CONTACT_LIMITS.messageMax) {
        errors.message = `Please keep the message under ${CONTACT_LIMITS.messageMax} characters.`;
    }

    return Object.keys(errors).length === 0 ? { ok: true, value } : { ok: false, errors };
}
