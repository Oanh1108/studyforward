import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TodoItem } from './todo.entity.js';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(TodoItem)
    private todosRepo: Repository<TodoItem>,
  ) {}

  async createTodo(userId: number, data: Partial<TodoItem>) {
    const todo = this.todosRepo.create({ ...data, userId });
    return this.todosRepo.save(todo);
  }

  async getMyTodos(userId: number) {
    return this.todosRepo.find({
      where: { userId },
      order: { isCompleted: 'ASC', dueDate: 'ASC', createdAt: 'DESC' }
    });
  }

  async updateTodo(userId: number, id: number, data: Partial<TodoItem>) {
    const todo = await this.todosRepo.findOne({ where: { id, userId } });
    if (!todo) throw new NotFoundException('Công việc không tồn tại');
    Object.assign(todo, data);
    return this.todosRepo.save(todo);
  }

  async deleteTodo(userId: number, id: number) {
    const todo = await this.todosRepo.findOne({ where: { id, userId } });
    if (!todo) throw new NotFoundException('Công việc không tồn tại');
    await this.todosRepo.remove(todo);
    return { success: true };
  }
}
