import {
  Wrench,
  Zap,
  UtensilsCrossed,
  Coffee,
  Stethoscope,
  Car,
  Scissors,
  Dumbbell,
  Heart,
  Trees,
  type LucideIcon,
} from 'lucide-react';

// Maps a category slug to a Lucide icon. Phase 1 schema seeds have no icon
// value, so this map is the single source of truth for now. Phase 9 polish
// can move this into the DB (categories.icon) once we have art direction.
export const categoryIconMap: Record<string, LucideIcon> = {
  plumbers: Wrench,
  electricians: Zap,
  restaurants: UtensilsCrossed,
  cafes: Coffee,
  dentists: Stethoscope,
  'auto-repair': Car,
  'hair-salons': Scissors,
  gyms: Dumbbell,
  veterinarians: Heart,
  landscaping: Trees,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return categoryIconMap[slug] ?? Wrench;
}

// Stable module-level fallback so consumers that destructure icons
// outside of getCategoryIcon (e.g. RSC cards) never store an
// `undefined` reference.
export const WrenchFallback = Wrench;
