"use client";

import type { AnchorHTMLAttributes } from "react";

/** Scrolls to the order note and opens it; without JavaScript it only scrolls there. */
export function OrderLink({ note, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { note: string }) {
    return (
        <a
            href={`#${note}`}
            onClick={() => {
                const details = document.getElementById(note);
                if (details instanceof HTMLDetailsElement) details.open = true;
            }}
            {...props}
        />
    );
}
