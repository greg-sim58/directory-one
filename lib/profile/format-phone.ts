export type PhoneParts = { href: string; display: string };

// Convert "+1-512-555-1234" (or any 10/11-digit string) into a tap-to-call
// href and a pretty US display format. Non-US numbers pass through.
export function toTelHref(raw: string | null | undefined): PhoneParts | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const href = `tel:+${digits}`;
  if (digits.length === 10) {
    const a = digits.slice(0, 3);
    const b = digits.slice(3, 6);
    const c = digits.slice(6);
    return { href, display: `(${a}) ${b}-${c}` };
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const a = digits.slice(1, 4);
    const b = digits.slice(4, 7);
    const c = digits.slice(7);
    return { href, display: `+1 (${a}) ${b}-${c}` };
  }
  return { href, display: trimmed };
}
