const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:1008@localhost:5432/toeic_db' });
client.connect().then(() => {
  return client.query("UPDATE custom_vocabularies SET ipa = '/ˈhænd.bæɡ/', reading = '/ˈhænd.bæɡ/' WHERE word = 'handbag'");
}).then(() => client.end());
