import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(name: string, email: string, password: string, goal = 600): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const hashed = await bcrypt.hash(password, 10);
    const user = this.repo.create({ name, email, password: hashed, goal });
    return this.repo.save(user);
  }
}
