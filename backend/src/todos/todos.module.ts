import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodoItem } from './todo.entity.js';
import { TodosService } from './todos.service.js';
import { TodosController } from './todos.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([TodoItem])],
  providers: [TodosService],
  controllers: [TodosController],
  exports: [TodosService],
})
export class TodosModule {}
