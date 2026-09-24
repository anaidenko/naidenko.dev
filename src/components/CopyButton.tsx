'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons';

export function CopyButton({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked: the commands stay selectable on the page.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className={`rounded-md p-2 text-ink-faint transition hover:bg-canvas/60 hover:text-ink-strong focus-visible:text-ink-strong ${className}`}
    >
      {copied ? <CheckIcon className="size-4 text-accent" /> : <CopyIcon className="size-4" />}
    </button>
  );
}
