import { Test, TestingModule } from '@nestjs/testing';
import { StudyBoardsController } from './study-boards.controller.js';

describe('StudyBoardsController', () => {
  let controller: StudyBoardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyBoardsController],
    }).compile();

    controller = module.get<StudyBoardsController>(StudyBoardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
