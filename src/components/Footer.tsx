import Link from "next/link";

import { site } from "@/content/site";
import { ui } from "@/content/ui";

import { CurrentYear } from "./CurrentYear";

export function Footer() {
    return (
        <footer className="max-w-md pb-16 text-sm text-ink-faint sm:pb-0">
            <p>
                © <CurrentYear builtIn={new Date().getFullYear()} /> {site.name} ·{" "}
                <Link href="/privacy" className="font-medium text-ink hover:text-accent focus-visible:text-accent">
                    {ui.privacy}
                </Link>
            </p>
        </footer>
    );
}
