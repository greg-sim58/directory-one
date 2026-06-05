import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('Dropping PostGIS extension…');
  try {
    await sql.query('DROP EXTENSION IF EXISTS postgis CASCADE');
  } catch {
    // ignore
  }
  console.log('Nuking public schema…');
  await sql.query('DROP SCHEMA IF EXISTS public CASCADE');
  await sql.query('CREATE SCHEMA public');
  await sql.query('GRANT ALL ON SCHEMA public TO public');
  console.log('Schema reset.');
}

main().catch((e) => {
  console.error('Reset failed:', e);
  process.exit(1);
});
