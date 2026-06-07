'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PhotoRef } from '@/lib/profile/schema';

type Props = {
  photos: PhotoRef[];
  name: string;
};

// Phase 6 photo gallery. Renders a 1–3 photo layout:
//   1 photo:  full-bleed
//   2 photos: 1 large left, 1 thumb right
//   3 photos: 1 large left, 2 thumbs stacked right
//   >3 photos: same as 3, with a "View all N" overlay on the last thumb
//             that opens the lightbox at the rest of the photos.
// Clicking the hero (or any thumb) opens the lightbox at that index.
export function Gallery({ photos, name }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const close = useCallback(() => setLightboxIndex(null), []);

  if (photos.length === 0) {
    return (
      <div className="bg-muted/40 text-muted-foreground grid aspect-[4/3] w-full place-items-center rounded-xl text-sm">
        No photos yet
      </div>
    );
  }

  const hero = photos[0]!;
  const thumbs = photos.slice(1, 3);
  const overflow = Math.max(0, photos.length - 3);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'grid gap-2',
          thumbs.length === 0 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[2fr_1fr]',
        )}
      >
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="bg-muted focus-visible:ring-foreground/40 relative aspect-[4/3] overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 sm:aspect-[16/10]"
        >
          <Image
            src={hero.url}
            alt={`${name} — main photo`}
            fill
            sizes="(min-width: 640px) 60vw, 100vw"
            priority
            className="object-cover transition-transform hover:scale-[1.02]"
          />
        </button>
        {thumbs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            {thumbs.map((p, i) => {
              const idx = i + 1;
              const isLastWithOverflow = i === thumbs.length - 1 && overflow > 0;
              return (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  className="bg-muted focus-visible:ring-foreground/40 relative aspect-square overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2"
                >
                  <Image
                    src={p.url}
                    alt={`${name} — photo ${idx + 1}`}
                    fill
                    sizes="(min-width: 640px) 30vw, 50vw"
                    className="object-cover transition-transform hover:scale-[1.02]"
                  />
                  {isLastWithOverflow ? (
                    <span className="bg-foreground/70 text-background absolute inset-0 grid place-items-center text-sm font-medium">
                      +{overflow} more
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent
          className="bg-background max-w-5xl p-0 sm:rounded-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Photo gallery</DialogTitle>
          {lightboxIndex !== null ? (
            <Lightbox
              photos={photos}
              name={name}
              index={lightboxIndex}
              onIndexChange={setLightboxIndex}
              onClose={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type LightboxProps = {
  photos: PhotoRef[];
  name: string;
  index: number;
  onIndexChange: (n: number) => void;
  onClose: () => void;
};

function Lightbox({ photos, name, index, onIndexChange, onClose }: LightboxProps) {
  const total = photos.length;
  const next = useCallback(() => onIndexChange((index + 1) % total), [index, total, onIndexChange]);
  const prev = useCallback(
    () => onIndexChange((index - 1 + total) % total),
    [index, total, onIndexChange],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  const current = photos[index]!;

  return (
    <div className="relative">
      <div className="bg-muted relative aspect-[4/3] sm:aspect-[16/10]">
        <Image
          key={current.url}
          src={current.url}
          alt={`${name} — photo ${index + 1}`}
          fill
          sizes="(min-width: 1024px) 80vw, 100vw"
          className="object-contain"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={prev}
            aria-label="Previous photo"
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={next}
            aria-label="Next photo"
          >
            <ChevronRight />
          </Button>
        </div>
        <span className="text-foreground/70 text-xs tabular-nums">
          {index + 1} / {total}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close gallery"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
