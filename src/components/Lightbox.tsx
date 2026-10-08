"use client";

import Image from "next/image";
import { type KeyboardEvent, type TouchEvent, useEffect, useRef, useState } from "react";

import { ChevronDownIcon, CloseIcon } from "@/components/Icons";
import { ui } from "@/content/ui";

export type Shot = { src: string; alt: string; width: number; height: number };

/** How far a finger travels sideways before it counts as a swipe, in CSS pixels. */
const SWIPE = 50;

const BUTTON =
    "absolute rounded-full border border-ink-faint/30 bg-surface p-2.5 text-ink-strong transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none";

/**
 * The page's screenshots at full size in a modal dialog, leafed through with the arrows, the arrow
 * keys or a swipe. A link to a screenshot opens it here when marked data-lightbox="<its index in
 * shots>"; without JavaScript, or with a modifier key, the same link opens the image itself.
 */
export function Lightbox({ shots }: { shots: Shot[] }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const touch = useRef<{ x: number; y: number } | null>(null);
    const [index, setIndex] = useState<number | null>(null);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const link = event.target instanceof Element ? event.target.closest("a[data-lightbox]") : null;
            const opened = Number(link?.getAttribute("data-lightbox"));
            if (!link || !(opened in shots)) return;
            event.preventDefault();
            setIndex(opened);
            dialog.current?.showModal();
        };
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [shots]);

    const leaf = (step: number) => setIndex(current => (current === null ? null : (current + step + shots.length) % shots.length));

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") leaf(1);
        else if (event.key === "ArrowLeft") leaf(-1);
    };

    const onTouchStart = (event: TouchEvent) => {
        const finger = event.touches[0];
        touch.current = event.touches.length === 1 ? { x: finger.clientX, y: finger.clientY } : null;
    };

    const onTouchEnd = (event: TouchEvent) => {
        const start = touch.current;
        touch.current = null;
        const finger = event.changedTouches[0];
        if (!start || !finger) return;
        const dx = finger.clientX - start.x;
        if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(finger.clientY - start.y)) leaf(dx < 0 ? 1 : -1);
    };

    const shot = index === null ? null : shots[index];
    return (
        // The dialog fills the screen, so a click on it rather than on what it holds is a click beside the screenshot.
        <dialog
            ref={dialog}
            aria-label={shot?.alt}
            onClose={() => setIndex(null)}
            onClick={event => event.target === event.currentTarget && event.currentTarget.close()}
            onKeyDown={onKeyDown}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="m-0 size-full max-h-none max-w-none flex-col items-center justify-center bg-transparent px-3 pt-16 pb-24 text-ink transition-opacity backdrop:bg-canvas/95 backdrop:backdrop-blur-sm open:flex motion-reduce:transition-none sm:px-20 sm:py-6 starting:open:opacity-0"
        >
            {shot && index !== null ? (
                <>
                    <figure className="flex min-h-0 max-w-full flex-col items-center">
                        <Image
                            src={shot.src}
                            alt={shot.alt}
                            width={shot.width}
                            height={shot.height}
                            className="h-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-lg border border-ink-faint/20 sm:max-h-[calc(100dvh-5.5rem)]"
                        />
                        <figcaption className="mt-3 max-w-2xl text-center text-sm text-ink-faint">
                            {shots.length > 1 ? (
                                <span className="mr-3 text-ink tabular-nums">
                                    {index + 1} / {shots.length}
                                </span>
                            ) : null}
                            {shot.alt}
                        </figcaption>
                    </figure>
                    {shots.length > 1 ? (
                        <>
                            <button
                                type="button"
                                aria-label={ui.previousShot}
                                onClick={() => leaf(-1)}
                                className={`bottom-6 left-4 sm:top-1/2 sm:bottom-auto sm:left-5 sm:-translate-y-1/2 ${BUTTON}`}
                            >
                                <ChevronDownIcon className="size-6 rotate-90" />
                            </button>
                            <button
                                type="button"
                                aria-label={ui.nextShot}
                                onClick={() => leaf(1)}
                                className={`right-4 bottom-6 sm:top-1/2 sm:right-5 sm:bottom-auto sm:-translate-y-1/2 ${BUTTON}`}
                            >
                                <ChevronDownIcon className="size-6 -rotate-90" />
                            </button>
                        </>
                    ) : null}
                    <button
                        type="button"
                        autoFocus
                        aria-label={ui.close}
                        onClick={() => dialog.current?.close()}
                        className={`top-3 right-4 sm:top-5 sm:right-5 ${BUTTON}`}
                    >
                        <CloseIcon className="size-6" />
                    </button>
                </>
            ) : null}
        </dialog>
    );
}
