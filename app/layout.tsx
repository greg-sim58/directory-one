import type { Metadata, Viewport } from 'next';
import { Geist, Fraunces } from 'next/font/google';
import { InlineScript } from '@/components/util/InlineScript';
import { LocationProvider } from '@/components/providers/LocationProvider';
import { getAllCities } from '@/lib/db/queries';
import './globals.css';

// The root layout reads the DB (to pass the city catalog to the auto-prompt
// in LocationProvider). force-dynamic keeps the build from trying to
// prerender without DATABASE_URL set. See AGENTS.md "DB module is a lazy
// Proxy" and the per-route force-dynamic notes.
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: {
    default: 'Directory — Find Local Services',
    template: '%s · Directory',
  },
  description:
    'Discover trusted local services in your city — from plumbers to restaurants. Verified reviews, rich profiles, and one-tap actions.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F2' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1816' },
  ],
};

// Inline theme script prevents dark-mode flash on first paint.
// Per PLAN.md §8: "inline theme script to prevent dark-mode flash".
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = stored ?? (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`.trim();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cities = await getAllCities();
  const cityList = cities.map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <LocationProvider cities={cityList}>{children}</LocationProvider>
      </body>
    </html>
  );
}
