import Link from "next/link";

import { site } from "@/content/site";

import { CookieSettingsButton } from "./CookieSettingsButton";

export function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="max-w-md pb-16 text-sm text-ink-faint sm:pb-0">
            <p>
                © {year} {site.name} ·{" "}
                <Link href="/privacy" className="font-medium text-ink hover:text-accent focus-visible:text-accent">
                    Privacy
                </Link>
                <CookieSettingsButton />
            </p>
        </footer>
    );
}
