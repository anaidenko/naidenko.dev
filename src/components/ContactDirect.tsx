"use client";

import { useEffect } from "react";

import { contact } from "@/content/contact";
import { email } from "@/content/email";
import { useToptalVisit } from "@/lib/useToptalVisit";

import { ContactForm } from "./ContactForm";
import { MailIcon } from "./Icons";

/** The form and the email: rendered in the browser, and never on a visit through Toptal. */
export function ContactDirect() {
    const toptal = useToptalVisit();
    // The browser scrolls to #contact before this block exists, and the page then ends short of
    // the form by the block's height: a link from another page (/audit's order links) stops there.
    useEffect(() => {
        if (toptal === false && location.hash === "#contact") document.getElementById("contact")?.scrollIntoView({ behavior: "instant" });
    }, [toptal]);
    if (toptal !== false) return null;
    return (
        <div className="mb-10 border-b border-ink-faint/20 pb-12">
            <p>{contact.intro}</p>
            <ContactForm />
            <p className="mt-8 text-sm">
                {contact.emailPrompt}{" "}
                <a
                    className="font-medium text-ink-strong underline decoration-ink-faint/50 underline-offset-4 hover:text-accent"
                    href={`mailto:${email}`}
                    data-track="email_click"
                    data-track-placement="contact"
                >
                    {email}
                </a>
                .
            </p>
        </div>
    );
}

/** The header's email icon, on the same terms as ContactDirect. */
export function EmailIcon({ className }: { className: string }) {
    const toptal = useToptalVisit();
    if (toptal !== false) return null;
    return (
        <li>
            <a
                href={`mailto:${email}`}
                data-track="email_click"
                data-track-placement="header"
                aria-label="Email"
                title="Email"
                className={className}
            >
                <MailIcon className="size-6" />
            </a>
        </li>
    );
}
