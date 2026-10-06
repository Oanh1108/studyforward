import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FocusSession } from './focus.entity.js';
import { FocusService } from './focus.service.js';
import { FocusController } from './focus.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([FocusSession])],
  providers: [FocusService],
  controllers: [FocusController],
  exports: [FocusService],
})
export class FocusModule {}
