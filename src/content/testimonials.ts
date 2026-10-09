export interface Testimonial {
    /** Paragraphs are separated by a blank line. */
    quote: string;
    name: string;
    project?: string;
    hired: string;
    /** The client's Upwork rating for that contract; a LinkedIn recommendation has none. */
    rating?: number;
}

/**
 * Verbatim. Nick Murphy's LinkedIn recommendation of 2026-10-09 (Andrii's screenshot of 2026-10-10
 * in the resume repository's `permissions/`), then Upwork client reviews from the contract pages
 * saved 2026-09-24. Chris Robichaud also posted the same words as a LinkedIn recommendation (April
 * 2019).
 */
export const testimonials = {
    heading: "What clients said",
    items: [
        {
            quote: "Andrii is one of the easiest people I’ve worked with. He is reliable, communicates clearly, and raises problems early instead of letting them surprise you later. When something is unclear, his question comes with a proposed answer, which makes every decision faster. I never have to chase him for status or wonder where things stand.\n\nHe has been a main contributor to our mobile app at Buddy Punch, covering new features, hotfixes and releases, and he takes care with all of it. I’d recommend Andrii to any team looking for a strong mobile developer who is genuinely good to work with.",
            name: "Nick Murphy",
            project: "Co-Founder, Buddy Punch",
            hired: "Client through Toptal since 2019 · LinkedIn recommendation"
        },
        {
            quote: "Andrii has been one of our best, most reliable developers on many projects. He works efficiently, communicates effectively, and cares about his quality of work. We will definitely work with him again.",
            name: "Bruce van Zyl",
            project: "OnCue Technology",
            hired: "Hired me six times on Upwork, 2015–2021",
            rating: 5
        },
        {
            quote: "Andrii is a fantastic full stack developer. He is organized, honest, and fast at completing development tasks with the highest quality. He communicates well to manage expectations from multiple parties, and creates well-functioning products that are complex in nature. I will definitely use Andrii again for future development work.",
            name: "Chris Robichaud",
            project: "BitRights",
            hired: "Hired me three times on Upwork, 2018–2019",
            rating: 5
        },
        {
            quote: "Andrii is a very skilled developer, great with communication and had no problem “hitting the ground running” even with a project which was badly documented. I would be happy to work with him again.",
            name: "Alex Harper",
            hired: "Hired me three times on Upwork, 2014–2015",
            rating: 5
        }
    ] satisfies Testimonial[]
} as const;
