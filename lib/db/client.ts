import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy singletons: defer the `neon()` constructor until the first DB call
// so that Next.js build-time page-data collection (which has no DATABASE_URL
// in CI) doesn't crash. Module evaluation in Node also avoids a top-level
// throw when the env is missing in dev before .env is loaded.

type Db = NeonHttpDatabase<typeof schema>;

let _sql: NeonQueryFunction<false, false> | null = null;
let _db: Db | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env (see .env.example) before any DB call.',
    );
  }
  _sql = neon(url);
  return _sql;
}

function getDb(): Db {
  if (_db) return _db;
  _db = drizzle(getSql(), { schema });
  return _db;
}

// Proxy so call sites can keep using `db.select()...` transparently.
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = Db;
export { schema };
