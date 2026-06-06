import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_CLASS = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

export function Stars({ value, className, size = 'md' }: Props) {
  const clamped = Math.max(0, Math.min(5, value));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5;
  const label = `${clamped.toFixed(1)} out of 5 stars`;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('text-foreground inline-flex items-center gap-0.5', className)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const isFull = i < full;
        const isHalf = !isFull && i === full && half;
        return (
          <Star
            key={i}
            className={cn(
              SIZE_CLASS[size],
              isFull || isHalf ? 'fill-current' : 'fill-transparent',
              'text-foreground/30',
              isFull && 'text-foreground',
            )}
            strokeWidth={1.5}
            aria-hidden
          />
        );
      })}
    </span>
  );
}
