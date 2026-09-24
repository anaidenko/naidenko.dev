import Image from "next/image";

import { site } from "@/content/site";
import { ui } from "@/content/ui";

import { CheckBadgeIcon } from "./Icons";
import { Nav } from "./Nav";
import { Socials } from "./Socials";

export function Header() {
    return (
        <header className="lg:sticky lg:top-0 lg:max-h-screen lg:w-[44%] lg:[scrollbar-width:none] lg:overflow-y-auto lg:py-20 lg:short:py-12">
            <Image
                src={site.photo.src}
                alt=""
                width={160}
                height={160}
                loading="eager"
                className="size-32 rounded-full ring-1 ring-ink-faint/30 sm:size-40 lg:shorter:size-32"
            />
            <h1 className="mt-6 text-4xl display-name text-ink-strong sm:text-5xl">{site.name}</h1>
            <p className="mt-3 text-lg font-medium tracking-tight text-ink-strong sm:text-xl">{site.role}</p>
            <p className="mt-2 flex items-start gap-1.5">
                <CheckBadgeIcon className="mt-0.5 size-5 shrink-0 text-verified" />
                <span>
                    <a
                        href={site.links.toptalReferral}
                        data-track="toptal_profile_click"
                        data-track-placement="header"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-verified underline-offset-4 hover:underline focus-visible:underline"
                    >
                        <strong className="font-semibold">{site.verified.lead}</strong> {site.verified.rest}
                    </a>
                    <span className="text-ink-faint"> · {site.location}</span>
                </span>
            </p>
            <p className="mt-4 max-w-xs leading-normal">{site.tagline}</p>
            <Nav />
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-10 lg:short:mt-8">
                <a
                    href="#contact"
                    data-track="contact_click"
                    className="inline-flex items-center rounded-full border border-accent/60 px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-canvas focus-visible:bg-accent focus-visible:text-canvas"
                >
                    {ui.contactMe}
                </a>
                <Socials />
            </div>
        </header>
    );
}
