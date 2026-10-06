import { Test, TestingModule } from '@nestjs/testing';
import { StudyBoardsService } from './study-boards.service.js';

describe('StudyBoardsService', () => {
  let service: StudyBoardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudyBoardsService],
    }).compile();

    service = module.get<StudyBoardsService>(StudyBoardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
