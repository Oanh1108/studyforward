import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyService } from './vocabulary.service.js';
import { Repository } from 'typeorm';
import { Vocabulary } from './vocabulary.entity.js';
import { UserVocabulary } from './user-vocabulary.entity.js';
import { CustomVocabulary } from './custom-vocabulary.entity.js';

describe('VocabularyService - Custom Vocabulary Bulk', () => {
  let service: VocabularyService;
  let customVocabRepo: Partial<Record<keyof Repository<CustomVocabulary>, any>>;

  beforeEach(() => {
    customVocabRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      create: vi.fn((data) => data as any),
      remove: vi.fn(() => Promise.resolve()),
    };

    service = new VocabularyService(
      {} as Repository<Vocabulary>,
      {} as Repository<UserVocabulary>,
      customVocabRepo as Repository<CustomVocabulary>,
      {
        findOne: vi.fn().mockResolvedValue({ id: 1, name: 'Test' }),
        save: vi.fn(),
      } as unknown as Repository<any>,
      {} as Repository<any>, // studySessionRepo
      { awardXp: vi.fn() } as any, // usersService
      { getVietnameseMeanings: vi.fn(), standardizePos: vi.fn(s => s) } as any, // aiService
    );
  });

  it('should add multiple custom words successfully', async () => {
    (customVocabRepo.findOne as any).mockResolvedValue(null);

    const items = [
      { word: 'apple', meaning: 'quả táo', example: 'I like apple.' },
      { word: 'banana', meaning: 'quả chuối', example: 'Bananas are yellow.' },
    ];

    const result = await service.addCustomWordsBulk(1, 'Trái cây', items);

    expect(result.added).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.success).toBe(true);
    expect(customVocabRepo.save).toHaveBeenCalledTimes(2);
  });

  it('should update existing word if already present', async () => {
    (customVocabRepo.findOne as any).mockResolvedValueOnce({
      id: 10,
      userId: 1,
      word: 'apple',
      listName: 'Old List',
      meaning: 'old meaning',
    });

    const items = [
      { word: 'apple', meaning: 'táo mới', example: 'Fresh apple' },
    ];

    const result = await service.addCustomWordsBulk(1, 'Danh sách mới', items);

    expect(result.added).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.success).toBe(true);
  });

  it('should delete custom word if owned by user', async () => {
    (customVocabRepo.findOne as any).mockResolvedValueOnce({
      id: 5,
      userId: 1,
      word: 'test',
    });

    const result = await service.deleteCustomWord(1, 5);
    expect(result.success).toBe(true);
    expect(customVocabRepo.remove).toHaveBeenCalled();
  });
});
