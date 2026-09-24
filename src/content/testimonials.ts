export interface Testimonial {
    quote: string;
    name: string;
    project?: string;
    hired: string;
    /** The client's Upwork rating for that contract. */
    rating: number;
}

/**
 * Upwork client reviews, verbatim, from the contract pages saved 2026-09-24. Chris Robichaud also
 * posted the same words as a LinkedIn recommendation (April 2019).
 */
export const testimonials = {
    heading: "What clients said",
    items: [
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
