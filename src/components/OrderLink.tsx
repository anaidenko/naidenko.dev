"use client";

import { type AnchorHTMLAttributes, useEffect } from "react";

const open = (id: string) => {
    const details = document.getElementById(id);
    if (details instanceof HTMLDetailsElement) details.open = true;
};

/**
 * Scrolls to the order note and opens it, on a click or when the page loads with its fragment
 * (browsers do not open a <details> that is itself the target); without JavaScript it only scrolls.
 */
export function OrderLink({ note, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { note: string }) {
    useEffect(() => {
        if (window.location.hash === `#${note}`) open(note);
    }, [note]);
    return <a href={`#${note}`} onClick={() => open(note)} {...props} />;
}
