'use client';

import { sectionIds, sections } from '@/content/sections';
import { useActiveSection } from '@/lib/useActiveSection';

export function Nav() {
  const active = useActiveSection(sectionIds);
  return (
    <nav className="hidden lg:block" aria-label="In-page navigation">
      <ul className="mt-12 w-max">
        {sections.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <a href={`#${id}`} aria-current={isActive ? 'true' : undefined} className="group flex items-center py-2.5">
                <span
                  className={`mr-4 h-px transition-all motion-reduce:transition-none ${
                    isActive
                      ? 'w-16 bg-accent'
                      : 'w-8 bg-ink-faint group-hover:w-16 group-hover:bg-ink-strong group-focus-visible:w-16 group-focus-visible:bg-ink-strong'
                  }`}
                />
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${
                    isActive ? 'text-ink-strong' : 'text-ink-faint group-hover:text-ink-strong group-focus-visible:text-ink-strong'
                  }`}
                >
                  {label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
