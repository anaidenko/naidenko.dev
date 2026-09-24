import Image from 'next/image';
import { site } from '@/content/site';
import { Nav } from './Nav';
import { Socials } from './Socials';

export function Header() {
  return (
    <header className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:w-[44%] lg:flex-col lg:justify-between lg:py-20">
      <div>
        <Image
          src={site.photo.src}
          alt={site.photo.alt}
          width={72}
          height={72}
          loading="eager"
          className="size-18 rounded-full ring-1 ring-ink-faint/30"
        />
        <h1 className="display-name mt-6 text-4xl text-ink-strong sm:text-5xl">{site.name}</h1>
        <p className="mt-3 text-lg font-medium tracking-tight text-ink-strong sm:text-xl">{site.role}</p>
        <p className="mt-4 max-w-xs leading-normal">{site.tagline}</p>
        <p className="mt-3 max-w-sm text-sm text-ink-faint">{site.meta}</p>
        <Nav />
        <a
          href="#contact"
          className="mt-8 inline-flex items-center rounded-full border border-accent/60 px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accent hover:text-canvas focus-visible:bg-accent focus-visible:text-canvas lg:mt-10"
        >
          Start a project
        </a>
      </div>
      <Socials className="mt-8 lg:mt-0" />
    </header>
  );
}
