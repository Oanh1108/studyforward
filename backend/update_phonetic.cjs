const { Client } = require("pg");
(async () => {
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "1008",
    database: "toeic_db"
  });
  await client.connect();
  let res = await client.query("SELECT id, word, ipa FROM custom_vocabularies WHERE word = \$1", ["stairs"]);
  console.log("Before (custom_vocabularies):", res.rows);
  if (res.rows.length > 0) {
    await client.query("UPDATE custom_vocabularies SET ipa = \$1 WHERE word = \$2", ["/sterz/", "stairs"]);
    res = await client.query("SELECT id, word, ipa FROM custom_vocabularies WHERE word = \$1", ["stairs"]);
    console.log("After:", res.rows);
  }
  
  res = await client.query("SELECT id, word, ipa FROM vocabularies WHERE word = \$1", ["stairs"]);
  console.log("Before (vocabularies):", res.rows);
  if (res.rows.length > 0) {
    await client.query("UPDATE vocabularies SET ipa = \$1 WHERE word = \$2", ["/sterz/", "stairs"]);
    res = await client.query("SELECT id, word, ipa FROM vocabularies WHERE word = \$1", ["stairs"]);
    console.log("After:", res.rows);
  }
  
  await client.end();
})();
