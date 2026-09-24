import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">404</p>
      <h1 className="display-name mt-3 text-4xl text-ink-strong">This page doesn’t exist.</h1>
      <p className="mt-4">
        <Link href="/" className="font-medium text-ink-strong underline underline-offset-4 hover:text-accent">
          Back to the home page
        </Link>
      </p>
    </main>
  );
}
