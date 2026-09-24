import { experience, fullResume } from '@/content/experience';
import { Chips } from './Chips';
import { ArrowUpRightIcon } from './Icons';
import { Section } from './Section';

export function Experience() {
  return (
    <Section id="experience">
      <ol className="group/list space-y-12">
        {experience.map((entry) => (
          <li key={entry.company}>
            <article className="group relative grid gap-2 transition motion-reduce:transition-none sm:grid-cols-8 sm:gap-6 lg:group-hover/list:opacity-50 lg:hover:opacity-100!">
              <div
                aria-hidden="true"
                className="absolute -inset-4 z-0 hidden rounded-xl border-l-2 border-transparent transition motion-reduce:transition-none lg:-inset-x-6 lg:block lg:group-hover:border-accent lg:group-hover:bg-surface/70"
              />
              <p className="z-10 mt-1 text-xs font-semibold uppercase tracking-wide text-ink-faint sm:col-span-2">{entry.period}</p>
              <div className="z-10 sm:col-span-6">
                <h3 className="leading-snug text-ink-strong">
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link font-medium hover:text-accent focus-visible:text-accent"
                  >
                    <span aria-hidden="true" className="absolute -inset-x-4 -inset-y-3 hidden rounded lg:-inset-x-6 lg:-inset-y-4 lg:block" />
                    {entry.role} · {entry.company}
                    <ArrowUpRightIcon className="ml-1 inline-block size-3.5 translate-y-px transition-transform group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 motion-reduce:transition-none" />
                  </a>
                </h3>
                <p className="mt-2 text-sm leading-normal">{entry.summary}</p>
                {entry.links ? (
                  <ul className="relative z-20 mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-label={`${entry.company} in the app stores`}>
                    {entry.links.map((link) => (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm font-medium text-ink-strong hover:text-accent focus-visible:text-accent"
                        >
                          {link.label}
                          <ArrowUpRightIcon className="ml-1 size-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Chips items={entry.chips} label={`Technologies at ${entry.company}`} />
              </div>
            </article>
          </li>
        ))}
      </ol>
      <p className="mt-12">
        <a
          href={fullResume.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center font-semibold text-ink-strong hover:text-accent focus-visible:text-accent"
        >
          {fullResume.label}
          <ArrowUpRightIcon className="ml-1 size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
      </p>
    </Section>
  );
}
