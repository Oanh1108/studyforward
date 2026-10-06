import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyBoard } from './study-board.entity.js';

@Injectable()
export class StudyBoardsService {
  constructor(
    @InjectRepository(StudyBoard)
    private studyBoardRepository: Repository<StudyBoard>,
  ) {}

  async findAllByUser(userId: string): Promise<StudyBoard[]> {
    return this.studyBoardRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: ['id', 'name', 'updatedAt', 'createdAt']
    });
  }

  async findOne(id: string, userId: string): Promise<StudyBoard> {
    const board = await this.studyBoardRepository.findOne({ where: { id, userId } });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async create(userId: string, name: string): Promise<StudyBoard> {
    const board = this.studyBoardRepository.create({
      userId,
      name,
      data: {}
    });
    return this.studyBoardRepository.save(board);
  }

  async updateData(id: string, userId: string, data: any, version: number): Promise<StudyBoard> {
    const board = await this.findOne(id, userId);
    
    if (version && board.version !== version) {
      throw new Error('VERSION_CONFLICT');
    }
    
    board.data = data;
    return this.studyBoardRepository.save(board);
  }
  
  async updateName(id: string, userId: string, name: string): Promise<StudyBoard> {
    const board = await this.findOne(id, userId);
    board.name = name;
    return this.studyBoardRepository.save(board);
  }

  async remove(id: string, userId: string): Promise<void> {
    const board = await this.findOne(id, userId);
    await this.studyBoardRepository.remove(board);
  }
}
