import Link from "next/link";

import { consent } from "@/content/consent";
import type { Consent } from "@/lib/analytics";

const button =
    "rounded-full border border-ink-faint/40 bg-canvas/60 px-5 py-2 font-semibold text-ink-strong transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Asks once; both answers carry the same weight, as EU guidance expects. */
export function ConsentBanner({ onChoose }: { onChoose: (choice: Consent) => void }) {
    return (
        <section
            aria-label={consent.label}
            className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl border border-ink-faint/30 bg-surface/95 p-5 text-sm shadow-2xl backdrop-blur sm:right-auto sm:bottom-6 sm:left-6"
        >
            <p className="font-medium text-ink-strong">{consent.question}</p>
            <p className="mt-2 leading-normal">
                {consent.explanation}{" "}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-ink-strong">
                    {consent.privacyLink}
                </Link>
            </p>
            <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => onChoose("granted")} className={button}>
                    {consent.allow}
                </button>
                <button type="button" onClick={() => onChoose("denied")} className={button}>
                    {consent.decline}
                </button>
            </div>
        </section>
    );
}
