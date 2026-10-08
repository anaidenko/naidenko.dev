"use client";

import { useSyncExternalStore } from "react";

import { markedTag } from "./toptal";

/**
 * Whether this visit came through Toptal, or null in the static HTML and during hydration. What
 * renders only for other visits (the form, the email) so stays out of the HTML a crawler reads.
 */
export function useToptalVisit(): boolean | null {
    return useSyncExternalStore(
        subscribeNever,
        () => markedTag(document.documentElement) !== null,
        () => null
    );
}

function subscribeNever() {
    return () => {};
}
