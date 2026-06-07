import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../lib/db/client';

async function main() {
  // 1. Public tables
  const t = await db.execute(
    sql`select table_name from information_schema.tables where table_schema='public' and table_name not like 'pg\\_%' and table_name not like '\_%' and table_name not in ('geography_columns','geometry_columns','spatial_ref_sys') order by table_name`,
  );
  const tRows = (t as unknown as { rows: Array<{ table_name: string }> }).rows;
  console.log('Domain tables:', tRows.length);
  for (const r of tRows) console.log('  -', r.table_name);

  // 2. Row counts
  const counts = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM cities) AS cities,
      (SELECT count(*)::int FROM categories) AS categories,
      (SELECT count(*)::int FROM businesses) AS businesses,
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM reviews) AS reviews
  `);
  console.log('Counts:', (counts as unknown as { rows: Record<string, number>[] }).rows[0]);

  // 3. Spot check business + geom
  const sample = await db.execute(sql`
    SELECT name, lat, lon, ST_AsText(geom) AS wkt
    FROM businesses LIMIT 1
  `);
  console.log(
    'Sample business:',
    (sample as unknown as { rows: Record<string, unknown>[] }).rows[0],
  );

  // 4. PostGIS works — use a point from the first business
  const pt = await db.execute<{ lon: number; lat: number }>(sql`
    SELECT lon, lat FROM businesses LIMIT 1
  `);
  const seed = (pt as unknown as { rows: Array<{ lon: number; lat: number }> }).rows[0]!;
  const r = await db.execute(sql`
    SELECT count(*)::int AS nearby
    FROM businesses
    WHERE ST_DWithin(geom, ST_MakePoint(${seed.lon}, ${seed.lat})::geography, 5000)
  `);
  console.log(
    `Businesses within 5km of first business (${seed.lat}, ${seed.lon}):`,
    (r as unknown as { rows: { nearby: number }[] }).rows[0].nearby,
  );
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
