import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { StudyNote } from './note.entity.js';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(StudyNote)
    private notesRepo: Repository<StudyNote>,
  ) {}

  async createNote(userId: number, data: Partial<StudyNote>) {
    const note = this.notesRepo.create({ ...data, userId });
    return this.notesRepo.save(note);
  }

  async getMyNotes(userId: number, search?: string) {
    if (search) {
      return this.notesRepo.find({
        where: [
          { userId, content: Like(`%${search}%`) },
          { userId, targetName: Like(`%${search}%`) }
        ],
        order: { createdAt: 'DESC' }
      });
    }
    return this.notesRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async updateNote(userId: number, id: number, content: string) {
    const note = await this.notesRepo.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('Ghi chú không tồn tại');
    note.content = content;
    return this.notesRepo.save(note);
  }

  async deleteNote(userId: number, id: number) {
    const note = await this.notesRepo.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('Ghi chú không tồn tại');
    await this.notesRepo.remove(note);
    return { success: true };
  }
}
