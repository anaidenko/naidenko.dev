import { EmailIcon } from "@/components/ContactDirect";
import { site } from "@/content/site";

import { BriefcaseIcon, GitHubIcon, LinkedInIcon } from "./Icons";

const items = [
    { href: site.links.github, label: "GitHub", Icon: GitHubIcon, track: "github" },
    { href: site.links.linkedin, label: "LinkedIn", Icon: LinkedInIcon, track: "linkedin" },
    { href: site.links.toptalReferral, label: "Toptal profile", Icon: BriefcaseIcon, track: "toptal" }
] as const;

const LINK = "block text-ink-faint transition hover:text-ink-strong focus-visible:text-ink-strong";

export function Socials({ className = "" }: { className?: string }) {
    return (
        <ul className={`flex items-center gap-5 ${className}`} aria-label="Profiles and email">
            {items.map(({ href, label, Icon, track }) => (
                <li key={label}>
                    <a
                        href={href}
                        data-track="profile_click"
                        data-track-network={track}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${label} (opens in a new tab)`}
                        title={label}
                        className={LINK}
                    >
                        <Icon className="size-6" />
                    </a>
                </li>
            ))}
            <EmailIcon className={LINK} />
        </ul>
    );
}
