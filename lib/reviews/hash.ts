import { createHash } from 'node:crypto';

// Phase 7: stable, lowercase, SHA-256 hex of the email. Used for dedup
// (unique index on (business_id, author_email_hash)) and rate-limit
// keying without ever storing the raw email as an index value.
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}
