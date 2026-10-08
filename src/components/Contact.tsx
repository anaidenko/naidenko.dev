import { ContactDirect } from "@/components/ContactDirect";
import { contact } from "@/content/contact";
import { TOPTAL_SITE } from "@/lib/variant";

import { Section } from "./Section";
import { ToptalBadge } from "./ToptalBadge";

/** The last section: the form, the email and the badge; on the Toptal build, "Hire" with the badge alone. */
export function Contact() {
    return (
        <Section id={TOPTAL_SITE ? "hire" : "contact"}>
            <ContactDirect />
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
                <ToptalBadge />
                <div>
                    <h3 className="font-medium text-ink-strong">{TOPTAL_SITE ? contact.hireHeading : contact.toptalHeading}</h3>
                    <p className="mt-2 text-sm leading-normal">{contact.toptalText}</p>
                </div>
            </div>
        </Section>
    );
}
