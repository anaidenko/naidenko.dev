import { site } from "@/content/site";

/** Renders "{email}" in the copy as a link to the contact address; a placement counts its clicks as email_click. */
export function WithEmail({ text, placement }: { text: string; placement?: string }) {
    const [before, after] = text.split("{email}");
    if (after === undefined) return <>{text}</>;
    return (
        <>
            {before}
            <a
                className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent"
                href={`mailto:${site.email}`}
                data-track={placement ? "email_click" : undefined}
                data-track-placement={placement}
            >
                {site.email}
            </a>
            {after}
        </>
    );
}
