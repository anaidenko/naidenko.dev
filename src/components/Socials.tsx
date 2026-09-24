import { site } from '@/content/site';
import { BriefcaseIcon, GitHubIcon, LinkedInIcon, MailIcon } from './Icons';

const items = [
  { href: site.links.github, label: 'GitHub', Icon: GitHubIcon, external: true },
  { href: site.links.linkedin, label: 'LinkedIn', Icon: LinkedInIcon, external: true },
  { href: site.links.toptal, label: 'Toptal profile', Icon: BriefcaseIcon, external: true },
  { href: `mailto:${site.email}`, label: 'Email', Icon: MailIcon, external: false },
] as const;

export function Socials({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex items-center gap-5 ${className}`} aria-label="Profiles and email">
      {items.map(({ href, label, Icon, external }) => (
        <li key={label}>
          <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            aria-label={external ? `${label} (opens in a new tab)` : label}
            title={label}
            className="block text-ink-faint transition hover:text-ink-strong focus-visible:text-ink-strong"
          >
            <Icon className="size-6" />
          </a>
        </li>
      ))}
    </ul>
  );
}
