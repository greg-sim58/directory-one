// Phase 7: lightweight, deterministic, no-external-lib spam heuristic.
// Auto-publish path: any failure here returns a reason that the form
// shows inline. False-positive tolerance is deliberately low for MVP
// — relax rules (e.g. allow up to 2 links) only if real users report
// being blocked on legitimate reviews.

const URL_RE = /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|co|biz|info|me|us|uk)\b)/i;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'getnada.com',
  'maildrop.cc',
  'sharklasers.com',
  'guerrillamailblock.com',
]);

const MIN_TEXT = 10;
const MAX_TEXT = 2000;
const MAX_NAME = 80;
const MAX_EMAIL = 120;
const ALL_CAPS_MIN_LETTERS = 20;

export type SpamReason =
  | 'text_too_short'
  | 'text_too_long'
  | 'text_has_url'
  | 'text_all_caps'
  | 'name_too_long'
  | 'name_invalid'
  | 'email_too_long'
  | 'email_disposable';

export type SpamCheck = { ok: true } | { ok: false; reason: SpamReason };

export function checkSpam(input: { name: string; email: string; text: string }): SpamCheck {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const text = input.text.trim();

  if (name.length === 0 || name.length > MAX_NAME) {
    return { ok: false, reason: 'name_too_long' };
  }
  if (!/[A-Za-zÀ-ÿ]/.test(name)) {
    return { ok: false, reason: 'name_invalid' };
  }

  if (email.length > MAX_EMAIL) {
    return { ok: false, reason: 'email_too_long' };
  }
  const at = email.lastIndexOf('@');
  const domain = at >= 0 ? email.slice(at + 1) : '';
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'email_disposable' };
  }

  if (text.length < MIN_TEXT) return { ok: false, reason: 'text_too_short' };
  if (text.length > MAX_TEXT) return { ok: false, reason: 'text_too_long' };
  if (URL_RE.test(text)) return { ok: false, reason: 'text_has_url' };

  const letters = text.replace(/[^A-Za-z]/g, '').length;
  // Caps-lock heuristic: text contains at least 20 letters, every letter
  // is uppercase, and a normal sentence would naturally have some
  // lowercase letters. (Ratio of letters/total is unreliable because
  // well-spaced ALL-CAPS text is mostly spaces.)
  const isAllCaps =
    letters > ALL_CAPS_MIN_LETTERS && text === text.toUpperCase() && /[a-z]/.test(text) === false;
  if (isAllCaps) return { ok: false, reason: 'text_all_caps' };

  return { ok: true };
}

export const SPAM_MESSAGES: Record<SpamReason, string> = {
  text_too_short: 'Please write at least 10 characters.',
  text_too_long: 'Reviews are limited to 2,000 characters.',
  text_has_url: "Links aren't allowed in reviews.",
  text_all_caps: 'Please write your review in normal sentence case.',
  name_too_long: 'Please use a name under 80 characters.',
  name_invalid: 'Please enter a real name.',
  email_too_long: 'Email is too long.',
  email_disposable: 'Please use a permanent email address.',
};

export type SpamField = 'name' | 'email' | 'text' | 'form';

export function spamReasonToField(reason: SpamReason): SpamField {
  if (reason === 'name_too_long' || reason === 'name_invalid') return 'name';
  if (reason === 'email_too_long' || reason === 'email_disposable') return 'email';
  return 'text';
}
