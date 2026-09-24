import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: `Privacy · ${site.domain}`,
  description: `What the contact form on ${site.domain} collects, why, and for how long.`,
  alternates: { canonical: '/privacy' },
};

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-medium text-ink-strong">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

const mail = (
  <a className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent" href={`mailto:${site.email}`}>
    {site.email}
  </a>
);

export default function Privacy() {
  return (
    <main id="content" className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <p>
        <Link href="/" className="text-sm font-semibold text-ink-strong hover:text-accent">
          ← {site.name}
        </Link>
      </p>
      <h1 className="display-name mt-8 text-4xl text-ink-strong">Privacy</h1>
      <div className="mt-8 space-y-8">
        <Part title="Who is responsible">
          <p>This site belongs to {site.name}, a software developer based in Athens, Greece. For anything about your data, write to {mail}.</p>
        </Part>
        <Part title="What the contact form collects">
          <p>Your name, your email address, your company or website if you give it, and your message.</p>
          <p>To keep out spam, Cloudflare Turnstile checks your browser when you use the form. Cloudflare processes your IP address and browser signals for that check.</p>
        </Part>
        <Part title="Why">
          <p>Only to read your message, reply to it and discuss the project you describe. The legal basis is your own request: steps you asked for before a possible contract (GDPR Article 6(1)(b)).</p>
        </Part>
        <Part title="How long it is kept">
          <p>Your message stays in my mailbox for up to twelve months after our last exchange. If we start working together, it is kept for as long as the work and its records require.</p>
        </Part>
        <Part title="Who else handles it">
          <p>Cloudflare hosts the site, runs Turnstile and delivers the form’s email to my inbox, where my email provider stores it. The Toptal badge on the page loads a typeface from Adobe Fonts (use.typekit.net), which receives your IP address. Nothing is sold or shared for advertising.</p>
        </Part>
        <Part title="Cookies and analytics">
          <p>The site sets no cookies of its own. Page views are counted with Cloudflare Web Analytics, which does not use cookies.</p>
        </Part>
        <Part title="Your rights">
          <p>You can ask for a copy of your data, a correction or its deletion at {mail}. You can also complain to the Hellenic Data Protection Authority (dpa.gr).</p>
        </Part>
        <p className="text-sm text-ink-faint">Updated September 2026.</p>
      </div>
    </main>
  );
}
