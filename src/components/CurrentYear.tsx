"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/** The build year in the static HTML, then the visitor's current year once the page hydrates. */
export function CurrentYear({ builtIn }: { builtIn: number }) {
    const year = useSyncExternalStore(
        subscribeNever,
        () => new Date().getFullYear(),
        () => builtIn
    );
    return <>{year}</>;
}
