import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FocusSession } from './focus.entity.js';

@Injectable()
export class FocusService {
  constructor(
    @InjectRepository(FocusSession)
    private repo: Repository<FocusSession>,
  ) {}

  async createSession(userId: number, data: Partial<FocusSession>) {
    const session = this.repo.create({ ...data, userId });
    return this.repo.save(session);
  }

  async getHistory(userId: number) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }
}
