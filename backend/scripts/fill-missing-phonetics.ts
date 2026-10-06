import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { AiVocabularyService } from '../src/vocabulary/ai-vocabulary.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomVocabulary } from '../src/vocabulary/custom-vocabulary.entity.js';
import { IsNull, In } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiService = app.get(AiVocabularyService);
  const repo = app.get(getRepositoryToken(CustomVocabulary));

  console.log('Fetching words with missing phonetics (IPA)...');
  // Find words where ipa is null and language is English
  const missingWords = await repo.find({
    where: [
      { ipa: IsNull(), language: 'en' },
      { ipa: '', language: 'en' }
    ],
  });

  console.log(`Found ${missingWords.length} words missing phonetics.`);

  // Group by word to avoid redundant API calls
  const uniqueWordsMap = new Map();
  for (const w of missingWords) {
    if (!uniqueWordsMap.has(w.word)) {
      uniqueWordsMap.set(w.word, []);
    }
    uniqueWordsMap.get(w.word).push(w);
  }

  const uniqueWords = Array.from(uniqueWordsMap.keys());
  console.log(`Unique words to enrich: ${uniqueWords.length}`);

  let updatedCount = 0;
  const batchSize = 10;

  for (let i = 0; i < uniqueWords.length; i += batchSize) {
    const batch = uniqueWords.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1}...`);
    
    const itemsToEnrich = batch.map(word => ({ word }));
    
    // Retry logic
    let retries = 3;
    let enriched: any[] = [];
    while (retries > 0) {
      try {
        enriched = await aiService.enrichBatch(itemsToEnrich, 'en');
        break;
      } catch (err) {
        retries--;
        console.error(`Batch failed, retrying... (${retries} left)`);
        if (retries === 0) console.error(err);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Update DB
    for (const res of enriched) {
      if (res.ipa) {
        const word = batch[res.index];
        const entities = uniqueWordsMap.get(word);
        for (const entity of entities) {
          entity.ipa = res.ipa;
          if (res.reading) entity.reading = res.reading;
          if (res.partOfSpeech && !entity.partOfSpeech) entity.partOfSpeech = res.partOfSpeech;
          await repo.save(entity);
          updatedCount++;
        }
      }
    }
  }

  console.log(`Finished processing. Successfully updated ${updatedCount} records.`);
  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
