"use client";

import { type AnchorHTMLAttributes, useEffect, useRef } from "react";

import { withRef } from "@/lib/analytics";
import { markedTag } from "@/lib/toptal";

/**
 * A plain link (a full page load, so the next page counts its own visit) that carries this page's
 * ?ref= tag once JavaScript runs: a move inside the site otherwise drops it (startVisit). A visit
 * through Toptal keeps its tag even after a move within the site, so the next page stays without
 * the form and the email.
 */
export function RefLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    const link = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        const target = withRef(href, window.location.search, markedTag(document.documentElement) ?? "");
        if (target !== href && link.current) link.current.setAttribute("href", target);
    }, [href]);
    return <a ref={link} href={href} {...props} />;
}
