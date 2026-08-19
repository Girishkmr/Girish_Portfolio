import type { Metadata } from 'next';
import { Instrument_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { identity, socials } from '@/content/resume';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { SiteFooter } from '@/components/ui/SiteFooter';
import './globals.css';

/**
 * Three faces, three jobs (REQUIREMENTS.html §10).
 * next/font downloads these at build time and serves them from our own
 * origin — there is no runtime request to a font CDN, which is what §10
 * actually asks for.
 */
/** High-contrast editorial serif. The name and section heads only, never body. */
const display = Instrument_Serif({
  variable: '--font-display-face',
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
});

/** Drawn for technical documentation — the subject's own provenance. */
const body = IBM_Plex_Sans({
  variable: '--font-body-face',
  subsets: ['latin'],
  display: 'swap',
  /* 400 and 500 only. Every extra weight is another font file preloaded and
     another few hundred milliseconds of contention on a throttled connection,
     and nothing on the site sets a semibold. */
  weight: ['400', '500'],
});

const mono = IBM_Plex_Mono({
  variable: '--font-mono-face',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${identity.name} — ${identity.role}`,
    template: `%s · ${identity.name}`,
  },
  description: identity.tagline,
  openGraph: {
    type: 'website',
    title: `${identity.name} — ${identity.role}`,
    description: identity.tagline,
    url: siteUrl,
    siteName: identity.name,
  },
  robots: { index: true, follow: true },
};

/**
 * Runs before first paint so a stored theme choice does not flash the wrong
 * palette. Kept deliberately tiny and dependency-free.
 */
const themeBoot = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: identity.name,
    jobTitle: identity.role,
    worksFor: { '@type': 'Organization', name: identity.employer },
    url: siteUrl,
    sameAs: socials.map((s) => s.href),
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
