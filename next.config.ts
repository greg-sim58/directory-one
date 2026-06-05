import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Per Next.js 16: `domains` is deprecated; use `remotePatterns`.
    // (See node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md)
    remotePatterns: [
      { protocol: 'https', hostname: '*.mapbox.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // CSS variables are wired in app/globals.css.
  // cacheComponents is opt-in (Next.js 16) — deferred to Phase 4+ when we
  // need finer control over per-route caching for the search results page.
};

export default nextConfig;
