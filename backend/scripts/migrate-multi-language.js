import pg from 'pg';
const { Client } = pg;

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '1008',
    database: process.env.DB_NAME || 'toeic_db',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL for multi-language migration.');

    // 1. Users table: currentLanguage
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "currentLanguage" varchar(10) DEFAULT 'en';
      UPDATE users SET "currentLanguage" = 'en' WHERE "currentLanguage" IS NULL;
    `);
    console.log('Migrated users table (currentLanguage).');

    // 2. Vocabulary folders: language
    await client.query(`
      ALTER TABLE vocabulary_folders 
      ADD COLUMN IF NOT EXISTS "language" varchar(10) DEFAULT 'en';
      UPDATE vocabulary_folders SET "language" = 'en' WHERE "language" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_vocab_folders_user_lang" ON vocabulary_folders ("userId", "language");
    `);
    console.log('Migrated vocabulary_folders table (language).');

    // 3. Custom vocabularies: language and readings
    await client.query(`
      ALTER TABLE custom_vocabularies 
      ADD COLUMN IF NOT EXISTS "language" varchar(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS "reading" varchar(255),
      ADD COLUMN IF NOT EXISTS "pinyin" varchar(150),
      ADD COLUMN IF NOT EXISTS "kana" varchar(150),
      ADD COLUMN IF NOT EXISTS "romaji" varchar(150),
      ADD COLUMN IF NOT EXISTS "romaja" varchar(150),
      ADD COLUMN IF NOT EXISTS "thaiReading" varchar(150),
      ADD COLUMN IF NOT EXISTS "exampleTranslation" text;

      UPDATE custom_vocabularies SET "language" = 'en' WHERE "language" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_custom_vocab_user_lang" ON custom_vocabularies ("userId", "language");
    `);
    console.log('Migrated custom_vocabularies table (language and reading fields).');

    // 4. Vocabularies (Curriculum): language and readings
    await client.query(`
      ALTER TABLE vocabularies 
      ADD COLUMN IF NOT EXISTS "language" varchar(10) DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS "reading" varchar(255),
      ADD COLUMN IF NOT EXISTS "pinyin" varchar(150),
      ADD COLUMN IF NOT EXISTS "kana" varchar(150),
      ADD COLUMN IF NOT EXISTS "romaji" varchar(150),
      ADD COLUMN IF NOT EXISTS "romaja" varchar(150),
      ADD COLUMN IF NOT EXISTS "thaiReading" varchar(150);

      UPDATE vocabularies SET "language" = 'en' WHERE "language" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_curriculum_vocab_lang" ON vocabularies ("language");
    `);
    console.log('Migrated vocabularies table (curriculum).');

    console.log('\nMigration completed successfully! All existing data preserved as English (en).');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
