"use client";

import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { contact } from "@/content/contact";
import { site } from "@/content/site";
import { track } from "@/lib/analytics";
import { CONTACT_LIMITS, type ContactErrors, type ContactField, validateContact } from "@/lib/contact";
import { createTurnstile } from "@/lib/turnstile-client";

type Status = "idle" | "sending" | "sent" | "failed" | "limited";

const FIELD_ORDER: readonly ContactField[] = ["name", "email", "company", "message"];

export function ContactForm() {
    const [status, setStatus] = useState<Status>("idle");
    const [errors, setErrors] = useState<ContactErrors>({});
    const [sentTo, setSentTo] = useState("");
    const [checking, setChecking] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const statusRef = useRef<HTMLParagraphElement>(null);
    const widgetRef = useRef<HTMLDivElement>(null);
    const turnstileRef = useRef<ReturnType<typeof createTurnstile> | null>(null);
    const inFlight = useRef(false);
    const focusNext = useRef<ContactField | null>(null);
    // False in the static HTML and during hydration: without JavaScript the browser would submit
    // the form as a GET, losing the message and putting it in the URL. So it stays hidden until then.
    const hydrated = useSyncExternalStore(
        subscribeNever,
        () => true,
        () => false
    );

    useEffect(() => () => turnstileRef.current?.remove(), []);

    // After the render, so the field already carries its error as its description when it is focused.
    useEffect(() => {
        const field = focusNext.current;
        focusNext.current = null;
        if (field) (formRef.current?.elements.namedItem(field) as HTMLElement | null)?.focus();
    }, [errors]);

    // The form, with the focused button, is gone once sent: focus moves to the confirmation.
    useEffect(() => {
        if (status === "sent") statusRef.current?.focus();
    }, [status]);

    function turnstile() {
        if (!turnstileRef.current && widgetRef.current)
            turnstileRef.current = createTurnstile(widgetRef.current, { onInteractive: setChecking });
        return turnstileRef.current;
    }

    function showErrors(found: ContactErrors) {
        focusNext.current = FIELD_ORDER.find(field => found[field]) ?? null;
        setErrors(found);
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (inFlight.current) return;
        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
        const result = validateContact(data);
        if (!result.ok) {
            showErrors(result.errors);
            return;
        }
        inFlight.current = true;
        let sent = false;
        setErrors({});
        setStatus("sending");
        try {
            const session = turnstile();
            if (!session) throw new Error("The form is not mounted");
            const turnstileToken = await session.token();
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, turnstileToken })
            });
            if (response.status === 422) {
                const body = (await response.json()) as { fields?: ContactErrors };
                showErrors(body.fields ?? {});
                setStatus("idle");
                return;
            }
            if (response.status === 429) {
                setStatus("limited");
                track("form_error", { form: "contact", reason: "rate_limit" });
                return;
            }
            if (!response.ok) throw new Error(`Contact endpoint answered ${response.status}`);
            setSentTo(result.value.email);
            track("generate_lead", { form: "contact" });
            setStatus("sent");
            sent = true;
        } catch {
            setStatus("failed");
            track("form_error", { form: "contact" });
        } finally {
            inFlight.current = false;
            if (sent) {
                turnstileRef.current?.remove();
                turnstileRef.current = null;
            } else {
                turnstileRef.current?.reset();
            }
        }
    }

    // Both live regions are on the page from the start: a region inserted already holding its text
    // is often not read out.
    return (
        <>
            {status === "sent" ? null : (
                <form
                    ref={formRef}
                    hidden={!hydrated}
                    noValidate
                    onSubmit={onSubmit}
                    onFocus={() =>
                        void turnstile()
                            ?.prime()
                            .catch(() => undefined)
                    }
                    className="relative mt-8 space-y-5"
                >
                    <Field
                        name="name"
                        label={contact.fields.name}
                        autoComplete="name"
                        maxLength={CONTACT_LIMITS.name}
                        error={errors.name}
                    />
                    <Field
                        name="email"
                        label={contact.fields.email}
                        type="email"
                        autoComplete="email"
                        maxLength={CONTACT_LIMITS.email}
                        error={errors.email}
                    />
                    <Field
                        name="company"
                        label={contact.fields.company}
                        optional
                        autoComplete="organization"
                        maxLength={CONTACT_LIMITS.company}
                        error={errors.company}
                    />
                    <Field
                        name="message"
                        label={contact.fields.message}
                        multiline
                        maxLength={CONTACT_LIMITS.messageMax}
                        error={errors.message}
                    />
                    <div className="absolute top-0 -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
                        <label htmlFor="website_url">Leave this field empty</label>
                        <input id="website_url" name="website_url" type="text" tabIndex={-1} autoComplete="off" />
                    </div>
                    <div ref={widgetRef} />
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                        <button
                            type="submit"
                            aria-disabled={status === "sending" ? true : undefined}
                            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-canvas transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:cursor-wait aria-disabled:opacity-60"
                        >
                            {status === "sending" ? contact.sending : contact.send}
                        </button>
                        <p className="text-xs text-ink-faint">
                            {contact.privacyLine}{" "}
                            <a href="/privacy" className="underline underline-offset-2 hover:text-ink-strong">
                                {contact.privacyLink}
                            </a>
                            .
                        </p>
                    </div>
                </form>
            )}
            <p role="alert" className="mt-5 text-sm text-ink-strong empty:mt-0">
                {status === "failed" || status === "limited" ? (
                    <>
                        {status === "limited" ? contact.limited : contact.failed}{" "}
                        <a
                            className="font-medium underline underline-offset-4 hover:text-accent"
                            href={`mailto:${site.email}`}
                            data-track="email_click"
                            data-track-placement="form_error"
                        >
                            {site.email}
                        </a>{" "}
                        {contact.instead}
                    </>
                ) : null}
            </p>
            <p
                ref={statusRef}
                role="status"
                tabIndex={-1}
                className={status === "sent" ? "mt-8 rounded-lg border border-accent/40 bg-accent/10 p-5 text-ink-strong" : "sr-only"}
            >
                {status === "sent" ? (
                    <>
                        {contact.sent} <span className="font-medium">{sentTo}</span>.
                    </>
                ) : checking ? (
                    contact.check
                ) : null}
            </p>
        </>
    );
}

function subscribeNever() {
    return () => {};
}

interface FieldProps {
    name: ContactField;
    label: string;
    maxLength: number;
    error?: string;
    type?: string;
    autoComplete?: string;
    optional?: boolean;
    multiline?: boolean;
}

function Field({ name, label, maxLength, error, type = "text", autoComplete, optional, multiline }: FieldProps) {
    const id = `contact-${name}`;
    const errorId = `${id}-error`;
    const shared = {
        id,
        name,
        maxLength,
        autoComplete,
        "required": !optional,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
        "className":
            "mt-2 block w-full rounded-lg border border-ink-faint/30 bg-surface px-4 py-2.5 text-ink-strong transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent aria-invalid:border-red-400"
    };
    return (
        <div>
            <label htmlFor={id} className="text-sm font-medium text-ink-strong">
                {label}
                {optional ? <span className="font-normal text-ink-faint"> {contact.fields.optional}</span> : null}
            </label>
            {multiline ? <textarea rows={5} {...shared} /> : <input type={type} {...shared} />}
            {error ? (
                <p id={errorId} className="mt-1.5 text-sm text-red-300">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
