import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Spotlight } from '@/components/Spotlight';
import { site } from '@/content/site';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const instrumentSerif = Instrument_Serif({ subsets: ['latin'], weight: '400', variable: '--font-instrument-serif' });
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono' });

const title = `${site.name} · ${site.role}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title,
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: { type: 'profile', url: site.url, siteName: site.domain, title, description: site.description },
};

export const viewport: Viewport = { themeColor: '#0b0c0e', colorScheme: 'dark' };

const beaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const fonts = [geist, geistMono, instrumentSerif, plexSans, plexMono].map((font) => font.variable).join(' ');
  return (
    <html lang="en" data-palette={site.palette} className={fonts}>
      <body className="bg-canvas font-sans leading-relaxed text-ink antialiased selection:bg-accent selection:text-canvas">
        <Spotlight />
        {children}
        {beaconToken ? (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: beaconToken })}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
