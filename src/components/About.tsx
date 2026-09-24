import { aboutParagraphs, numbers } from '@/content/about';
import { Section } from './Section';

export function About() {
  return (
    <Section id="about">
      <div className="space-y-4">
        {aboutParagraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </div>
      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
        {numbers.map(({ value, label }) => (
          <div key={label} className="flex flex-col-reverse justify-end">
            <dt className="mt-1 text-sm leading-snug text-ink-faint">{label}</dt>
            <dd className="display-name text-3xl text-ink-strong">{value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
