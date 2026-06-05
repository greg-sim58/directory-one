// Dev reset: truncates the domain tables in dependency order. Use this when
// iterating on the schema; the seed re-populates afterwards.
// Does NOT touch auth tables (users/accounts/sessions/verification_tokens)
// because the seed inserts the seed users with onConflictDoNothing.

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db/client';

async function main() {
  console.log('Resetting domain tables…');
  await db.execute(sql`
    TRUNCATE TABLE
      reviews,
      photos,
      saved_businesses,
      business_claims,
      report_queue,
      businesses,
      categories,
      cities
    RESTART IDENTITY CASCADE
  `);
  console.log('Reset complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
