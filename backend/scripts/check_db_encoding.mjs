import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/toeic_db',
  });
  await client.connect();

  const res1 = await client.query("SELECT id, word, meaning FROM custom_vocabularies WHERE meaning LIKE '%\uFFFD%' LIMIT 20;");
  console.log('custom_vocabularies with replacement char \uFFFD count:', res1.rows.length);
  if (res1.rows.length > 0) console.log(res1.rows);

  const res2 = await client.query("SELECT id, word, meaning FROM vocabularies WHERE meaning LIKE '%\uFFFD%' LIMIT 20;");
  console.log('vocabularies with replacement char \uFFFD count:', res2.rows.length);
  if (res2.rows.length > 0) console.log(res2.rows);

  await client.end();
}

check().catch(err => {
  console.error('DB check error:', err.message);
});
