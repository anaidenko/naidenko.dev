import { About } from '@/components/About';
import { Contact } from '@/components/Contact';
import { Experience } from '@/components/Experience';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OpenSource } from '@/components/OpenSource';
import { Services } from '@/components/Services';
import { site } from '@/content/site';

const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: site.name,
  jobTitle: site.role,
  url: site.url,
  email: `mailto:${site.email}`,
  address: { '@type': 'PostalAddress', addressLocality: 'Athens', addressCountry: 'GR' },
  sameAs: [site.links.github, site.links.linkedin, site.links.toptal],
};

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:px-20 lg:py-0">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canvas"
      >
        Skip to content
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />
      <div className="lg:flex lg:justify-between lg:gap-12">
        <Header />
        <main id="content" tabIndex={-1} className="pt-12 outline-none lg:w-[56%] lg:py-20">
          <About />
          <Experience />
          <OpenSource />
          <Services />
          <Contact />
          <Footer />
        </main>
      </div>
    </div>
  );
}
