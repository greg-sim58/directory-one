import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

const url = process.env.DATABASE_URL!;
const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected via pg.');

  const sp = await client.query('SHOW search_path');
  console.log('search_path:', sp.rows);

  // Ensure extension
  await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
  console.log('PostGIS ensured.');

  // Migrations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _custom_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows: appliedRows } = await client.query<{ name: string }>(
    'SELECT name FROM _custom_migrations ORDER BY id',
  );
  const applied = new Set(appliedRows.map((r) => r.name));

  const all = await readdir(MIGRATIONS_DIR);
  const files = all.filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  = ${file} (already applied)`);
      continue;
    }
    console.log(`  > ${file}`);
    const content = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    const statements = content
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
      } catch (e) {
        const err = e as Error & { code?: string; position?: string };
        console.error(
          `    Statement ${i} FAILED (len=${stmt.length}, code=${err.code}, pos=${err.position}): ${err.message}`,
        );
        console.error('    Snippet:', stmt.slice(0, 200).replace(/\n/g, ' '));
        // Show what's in pg_extension right now
        const ext = await client.query('SELECT extname, extversion FROM pg_extension');
        console.error('    pg_extension:', ext.rows);
        await client.end();
        process.exit(1);
      }
    }
    await client.query('INSERT INTO _custom_migrations (name) VALUES ($1)', [file]);
  }

  await client.end();
  console.log('All migrations applied.');
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
