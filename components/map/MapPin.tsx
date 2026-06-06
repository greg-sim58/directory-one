'use client';

import { MapPin } from 'lucide-react';
import { memo } from 'react';

import { cn } from '@/lib/utils';

// Visual marker used inside react-map-gl's <Marker>.
// We render the lucide `MapPin` as the icon — the surrounding click
// target is an invisible button the same size, so keyboard users can
// focus and Enter to navigate. The highlight variant enlarges + tints
// when this pin is the currently-selected one (hover/focus from the
// matching ResultCard, or vice versa).

type Props = {
  selected: boolean;
  onActivate: () => void;
  onHoverChange?: (hovering: boolean) => void;
  name: string;
  href: string;
};

function MapPinImpl({ selected, onActivate, onHoverChange, name, href }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
      // Anchor semantics without being a real <a>: react-map-gl stops
      // event propagation on the Marker, so a nested <Link> doesn't
      // get a clean navigation. We use programmatic navigation in
      // MapView.onActivate instead.
      aria-label={`${name} (opens business page)`}
      title={name}
      data-href={href}
      className={cn(
        'group relative -translate-x-1/2 -translate-y-full cursor-pointer rounded-full',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected
          ? 'z-10 h-9 w-9 bg-foreground text-background shadow-lg ring-2 ring-background focus-visible:ring-foreground'
          : 'h-7 w-7 bg-card text-foreground shadow-md ring-1 ring-foreground/20 hover:bg-foreground hover:text-background focus-visible:ring-foreground',
        'transition-[transform,background-color,color,box-shadow] duration-150',
        selected && 'scale-125',
      )}
    >
      <MapPin
        className="absolute inset-0 m-auto"
        size={selected ? 18 : 14}
        strokeWidth={selected ? 2.25 : 2}
        aria-hidden
      />
    </button>
  );
}

export const MapPinMarker = memo(MapPinImpl);
