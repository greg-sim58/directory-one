// Phase 7: public display of a reviewer's name. We keep the first name
// and a single initial for the surname so the social proof reads
// "John D." rather than "John Michael Doe". Single-name authors get
// just their name; non-letter leading characters in the last token are
// dropped (e.g. "X Æ A-12" -> "X Æ A.").

const NON_LETTER = /[^A-Za-zÀ-ÿ]/;

export function formatAuthorName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonymous';
  if (parts.length === 1) return parts[0]!;
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  const ch = last[0]!;
  const initial = ch.toUpperCase() + (NON_LETTER.test(ch) ? '' : '.');
  return `${first} ${initial}`;
}
