import { DataSource } from 'typeorm';
import { SpeakingPrompt } from './src/speaking/speaking-prompt.entity';

const ds = new DataSource({
  type: 'better-sqlite3',
  database: 'database.sqlite',
  entities: [SpeakingPrompt],
});

const prompts = [];
for (let i = 1; i <= 20; i++) {
  prompts.push({
    id: `seed-intro-a1-${i}`,
    topic: 'Giới thiệu bản thân',
    level: 'A1',
    language: 'en',
    sentence: `Hello, my name is Alex and I am ${20 + i} years old. I like reading books and playing sports.`,
    ipa: `/hɛˈloʊ, maɪ neɪm ɪz ˈælɪks ənd aɪ æm ${20 + i} jɪrz oʊld. aɪ laɪk ˈridɪŋ bʊks ənd ˈpleɪɪŋ spɔrts/`,
    meaningVi: `Xin chào, tên tôi là Alex và tôi ${20 + i} tuổi. Tôi thích đọc sách và chơi thể thao.`,
    hint: 'Nhấn mạnh vào tên, số tuổi, sở thích và nối âm "I am".',
    orderIndex: i
  });
}

ds.initialize().then(async () => {
  await ds.getRepository(SpeakingPrompt).save(prompts);
  console.log('Successfully seeded 20 sentences for Giới thiệu bản thân - A1');
  process.exit(0);
});
