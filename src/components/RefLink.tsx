"use client";

import { type AnchorHTMLAttributes, useEffect, useRef } from "react";

import { refOf } from "@/lib/analytics";

/**
 * A plain link (a full page load, so the next page counts its own visit) that carries this page's
 * ?ref= tag once JavaScript runs: a move inside the site otherwise drops it (startVisit).
 */
export function RefLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    const link = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        const tag = refOf(window.location.search);
        if (tag && link.current) link.current.href = `${href}${href.includes("?") ? "&" : "?"}ref=${encodeURIComponent(tag)}`;
    }, [href]);
    return <a ref={link} href={href} {...props} />;
}
