"use client";

import { type AnchorHTMLAttributes, useEffect, useRef } from "react";

import { withRef } from "@/lib/analytics";

/**
 * A plain link (a full page load, so the next page counts its own visit) that carries this page's
 * ?ref= tag once JavaScript runs: a move inside the site otherwise drops it (startVisit).
 */
export function RefLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    const link = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        const target = withRef(href, window.location.search);
        if (target !== href && link.current) link.current.setAttribute("href", target);
    }, [href]);
    return <a ref={link} href={href} {...props} />;
}
