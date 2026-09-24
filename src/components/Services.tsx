import { services } from "@/content/services";

import { Section } from "./Section";

export function Services() {
    return (
        <Section id="services">
            <ul className="space-y-10">
                {services.map(service => (
                    <li key={service.title}>
                        <h3 className="font-medium text-ink-strong">{service.title}</h3>
                        <p className="mt-2 text-sm leading-normal">{service.text}</p>
                        <p className="mt-2 text-xs font-semibold tracking-wide text-ink-faint uppercase">Proof: {service.proof}</p>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
