import { site } from '@/content/site';
import { ContactForm } from './ContactForm';
import { Section } from './Section';
import { ToptalBadge } from './ToptalBadge';

export function Contact() {
  return (
    <Section id="contact">
      <p>Tell me what you’re building and where it stands. I’ll reply by email.</p>
      <ContactForm />
      <noscript>
        <p className="mt-6 text-sm text-ink-strong">The form needs JavaScript. Email works without it:</p>
      </noscript>
      <p className="mt-8 text-sm">
        Prefer email? Write to{' '}
        <a className="font-medium text-ink-strong underline decoration-ink-faint/50 underline-offset-4 hover:text-accent" href={`mailto:${site.email}`}>
          {site.email}
        </a>
        .
      </p>
      <div className="mt-12 flex flex-col items-start gap-6 border-t border-ink-faint/20 pt-10 sm:flex-row sm:items-center sm:gap-8">
        <ToptalBadge />
        <div>
          <h3 className="font-medium text-ink-strong">Prefer to hire through Toptal?</h3>
          <p className="mt-2 text-sm leading-normal">
            I’m a Toptal Verified Expert in Engineering. The badge takes you to my Toptal profile to start there.
          </p>
        </div>
      </div>
    </Section>
  );
}
