import Link from "next/link";

import { ui } from "@/content/ui";

export default function NotFound() {
    return (
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
            <p className="text-sm font-semibold tracking-widest text-accent uppercase">404</p>
            <h1 className="mt-3 text-4xl display-name text-ink-strong">{ui.notFoundTitle}</h1>
            <p className="mt-4">
                <Link href="/" className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent">
                    {ui.notFoundLink}
                </Link>
            </p>
        </main>
    );
}
