import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16 renamed middleware to proxy. The runtime is nodejs (edge is not supported).
// Reference: node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md

// PLAN.md §3 location strategy: IP/header fallback when client geolocation is denied.
// Reads Vercel-provided geo headers and forwards them as request headers so RSCs
// can resolve city without a separate lookup.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  const vercelIpCity = request.headers.get('x-vercel-ip-city');
  const vercelIpCountry = request.headers.get('x-vercel-ip-country');
  const vercelIpRegion = request.headers.get('x-vercel-ip-country-region');
  const vercelIpLatitude = request.headers.get('x-vercel-ip-latitude');
  const vercelIpLongitude = request.headers.get('x-vercel-ip-longitude');

  if (vercelIpCity) requestHeaders.set('x-geo-city', decodeURIComponent(vercelIpCity));
  if (vercelIpCountry) requestHeaders.set('x-geo-country', vercelIpCountry);
  if (vercelIpRegion) requestHeaders.set('x-geo-region', vercelIpRegion);
  if (vercelIpLatitude) requestHeaders.set('x-geo-lat', vercelIpLatitude);
  if (vercelIpLongitude) requestHeaders.set('x-geo-lon', vercelIpLongitude);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    // Run on everything except static assets, image optimizer, and favicon.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)).*)',
  ],
};
