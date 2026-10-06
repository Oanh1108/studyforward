const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:1008@localhost:5432/toeic_db' });
client.connect().then(() => {
  return client.query("SELECT word, ipa, meaning FROM custom_vocabularies WHERE ipa IS NOT NULL LIMIT 2");
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
