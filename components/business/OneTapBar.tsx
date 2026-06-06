'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, MapPin, Phone, Share2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toTelHref } from '@/lib/profile/format-phone';
import type { BusinessDetail } from '@/lib/profile/schema';

type Props = {
  business: BusinessDetail;
};

// Sticky on mobile (fixed bottom bar), inline on desktop. The
// IntersectionObserver on a sentinel near the top of the page hides
// the bar when the user has scrolled past the NAPW section, so the
// bar doesn't fight for space while reading the description.
export function OneTapBar({ business }: Props) {
  const [visible, setVisible] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? true),
      { rootMargin: '0px 0px -80% 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const phone = toTelHref(business.phone);
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lon}`;

  const onShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: business.name, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard blocked; the user can copy from the URL bar
    }
  }, [business.name]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {/* Mobile sticky bar */}
      <div
        className={
          'bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-20 border-t p-2 backdrop-blur transition-transform duration-200 md:hidden ' +
          (visible ? 'translate-y-0' : 'translate-y-full')
        }
      >
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <Button
            size="default"
            className="flex-1"
            disabled={!phone}
            title={!phone ? 'Phone not listed' : `Call ${phone.display}`}
            nativeButton={phone ? false : undefined}
            render={phone ? <a href={phone.href} /> : <span aria-disabled />}
          >
            <Phone />
            Call
          </Button>
          <Button
            size="default"
            variant="outline"
            className="flex-1"
            nativeButton={false}
            render={<a href={directionsHref} target="_blank" rel="noreferrer noopener" />}
          >
            <MapPin />
            Directions
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onShare}
            aria-label="Share this business"
          >
            <Share2 />
          </Button>
        </div>
      </div>

      {/* Desktop inline actions */}
      <Card className="hidden md:block">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <Button
            disabled={!phone}
            title={!phone ? 'Phone not listed' : `Call ${phone.display}`}
            nativeButton={phone ? false : undefined}
            render={phone ? <a href={phone.href} /> : <span aria-disabled />}
          >
            <Phone />
            {phone ? phone.display : 'Call'}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={directionsHref} target="_blank" rel="noreferrer noopener" />}
          >
            <MapPin />
            Directions
          </Button>
          <Button type="button" variant="outline" onClick={onShare}>
            <Share2 />
            Share
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled
            title="Sign in to save (coming soon)"
          >
            <Bookmark />
            Save
          </Button>
        </div>
      </Card>
    </>
  );
}
