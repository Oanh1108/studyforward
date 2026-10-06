import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TodosService } from './todos.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('todos')
export class TodosController {
  constructor(private readonly service: TodosService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createTodo(@Request() req: any, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.createTodo(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getMyTodos(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getMyTodos(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  updateTodo(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.updateTodo(userId, Number(id), body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteTodo(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.deleteTodo(userId, Number(id));
  }
}
