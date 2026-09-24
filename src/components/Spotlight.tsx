'use client';

import { useEffect, useRef } from 'react';

/** A soft light that follows the pointer. Mouse and trackpad only; hidden below the lg breakpoint. */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--spot-x', `${event.clientX}px`);
        element.style.setProperty('--spot-y', `${event.clientY}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="spotlight pointer-events-none fixed inset-0 z-30 hidden lg:block" />;
}
