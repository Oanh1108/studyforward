const { Client } = require('pg');
const https = require('https');

const client = new Client({ connectionString: 'postgresql://postgres:1008@localhost:5432/toeic_db' });

function fetchPhonetic(word) {
  return new Promise((resolve) => {
    https.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (parsed && parsed.length > 0) {
              const phonetic = parsed[0].phonetic || (parsed[0].phonetics && parsed[0].phonetics.find(p => p.text)?.text);
              resolve(phonetic);
              return;
            }
          } catch (e) {}
        }
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  await client.connect();
  console.log('Connected to DB. Fetching missing phonetics...');
  
  const res = await client.query("SELECT id, word FROM custom_vocabularies WHERE (ipa IS NULL OR ipa = '') AND language = 'en'");
  const rows = res.rows;
  console.log(`Found ${rows.length} words missing phonetics.`);

  // Group by word
  const wordMap = new Map();
  for (const row of rows) {
    if (!wordMap.has(row.word)) {
      wordMap.set(row.word, []);
    }
    wordMap.get(row.word).push(row.id);
  }

  let updatedCount = 0;
  for (const [word, ids] of wordMap.entries()) {
    const ipa = await fetchPhonetic(word);
    if (ipa) {
      console.log(`Found IPA for ${word}: ${ipa}`);
      await client.query("UPDATE custom_vocabularies SET ipa = $1, reading = $1 WHERE id = ANY($2::int[])", [ipa, ids]);
      updatedCount += ids.length;
    } else {
      console.log(`Could not find IPA for ${word}`);
    }
    await new Promise(r => setTimeout(r, 200)); // Rate limit
  }

  console.log(`Successfully updated ${updatedCount} records.`);
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
