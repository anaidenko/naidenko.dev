import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Experience } from "@/components/Experience";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Projects } from "@/components/Projects";
import { Services } from "@/components/Services";
import { site } from "@/content/site";
import { ui } from "@/content/ui";

const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Person",
            "@id": `${site.url}/#person`,
            "name": site.name,
            "jobTitle": site.role,
            "description": site.description,
            "url": site.url,
            "image": `${site.url}${site.photo.src}`,
            "email": `mailto:${site.email}`,
            "address": { "@type": "PostalAddress", "addressLocality": "Athens", "addressCountry": "GR" },
            "knowsAbout": ["Angular", "Ionic", "Capacitor", "iOS", "Android", "Node.js", "TypeScript", "React", "Claude Code"],
            "sameAs": [site.links.github, site.links.linkedin, site.links.toptal]
        },
        {
            "@type": "WebSite",
            "@id": `${site.url}/#website`,
            "name": site.domain,
            "url": site.url,
            "inLanguage": "en",
            "publisher": { "@id": `${site.url}/#person` }
        }
    ]
};

export default function Home() {
    return (
        <div className="mx-auto min-h-screen max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:px-20 lg:py-0">
            <a
                href="#content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canvas"
            >
                {ui.skipToContent}
            </a>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
            <div className="lg:flex lg:justify-between lg:gap-12">
                <Header />
                <main id="content" tabIndex={-1} className="pt-12 outline-none lg:w-[56%] lg:py-20 lg:short:py-12">
                    <About />
                    <Experience />
                    <Projects />
                    <Services />
                    <Contact />
                    <Footer />
                </main>
            </div>
        </div>
    );
}
