import { site } from "@/content/site";

/** Renders "{email}" in the copy as a link to the contact address. */
export function WithEmail({ text }: { text: string }) {
    const [before, after] = text.split("{email}");
    if (after === undefined) return <>{text}</>;
    return (
        <>
            {before}
            <a className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent" href={`mailto:${site.email}`}>
                {site.email}
            </a>
            {after}
        </>
    );
}
