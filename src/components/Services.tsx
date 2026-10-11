import Link from "next/link";

import { type Service, services } from "@/content/services";
import { ui } from "@/content/ui";

import { ArrowRightIcon } from "./Icons";
import { Section } from "./Section";

function ServiceTitle({ service }: { service: Service }) {
    if (!service.url) return <h3 className="font-medium text-ink-strong">{service.title}</h3>;
    return (
        <h3 className="text-ink-strong">
            <Link
                href={service.url}
                data-track="service_click"
                data-track-service={service.title}
                className="group/link font-medium group-target/item:text-accent hover:text-accent focus-visible:text-accent"
            >
                <span aria-hidden="true" className="absolute -inset-x-4 -inset-y-3 hidden rounded lg:-inset-x-6 lg:-inset-y-4 lg:block" />
                {service.title}
                <ArrowRightIcon className="ml-1 inline-block size-3.5 translate-y-px transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
        </h3>
    );
}

export function Services() {
    return (
        <Section id="services">
            <ul className="space-y-10">
                {services.map(service => (
                    <li key={service.title} id={service.id} className="group/item scroll-mt-16 lg:scroll-mt-24">
                        <article className="group relative">
                            {service.url ? (
                                <div
                                    aria-hidden="true"
                                    className="absolute -inset-4 z-0 hidden rounded-xl border-l-2 border-transparent transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-target/item:border-accent lg:group-target/item:bg-surface/70 lg:group-hover:border-accent lg:group-hover:bg-surface/70"
                                />
                            ) : null}
                            <div className="relative z-10">
                                <ServiceTitle service={service} />
                                <p className="mt-2 text-sm leading-normal">{service.text}</p>
                                <p className="mt-2 text-xs font-semibold tracking-wide text-ink-faint uppercase">
                                    {ui.proof}: {service.proof}
                                </p>
                            </div>
                        </article>
                    </li>
                ))}
            </ul>
        </Section>
    );
}
