import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgresql://postgres:1008@localhost:5432/toeic_db' });

async function check() {
  const synCount = await pool.query("SELECT count(*) FROM custom_vocabularies WHERE synonyms IS NOT NULL AND TRIM(synonyms) != ''");
  const antCount = await pool.query("SELECT count(*) FROM custom_vocabularies WHERE antonyms IS NOT NULL AND TRIM(antonyms) != ''");
  const total = await pool.query("SELECT count(*) FROM custom_vocabularies");
  console.log("Total words:", total.rows[0].count);
  console.log("Words with synonyms:", synCount.rows[0].count);
  console.log("Words with antonyms:", antCount.rows[0].count);

  const samples = await pool.query('SELECT id, word, meaning, "partOfSpeech", synonyms, antonyms FROM custom_vocabularies WHERE synonyms IS NOT NULL AND TRIM(synonyms) != \'\' LIMIT 10');
  console.log("Samples with synonyms:", JSON.stringify(samples.rows, null, 2));

  const antSamples = await pool.query('SELECT id, word, meaning, "partOfSpeech", synonyms, antonyms FROM custom_vocabularies WHERE antonyms IS NOT NULL AND TRIM(antonyms) != \'\' LIMIT 10');
  console.log("Samples with antonyms:", JSON.stringify(antSamples.rows, null, 2));

  await pool.end();
}

check().catch(console.error);
