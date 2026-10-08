import { contact } from "@/content/contact";

import { ContactDirect } from "./ContactDirect";
import { Section } from "./Section";
import { ToptalBadge } from "./ToptalBadge";

export function Contact() {
    return (
        <Section id="contact">
            <ContactDirect />
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
                <ToptalBadge />
                <div>
                    <h3 className="font-medium text-ink-strong">{contact.toptalHeading}</h3>
                    <p className="mt-2 text-sm leading-normal">{contact.toptalText}</p>
                </div>
            </div>
        </Section>
    );
}
