import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacementTestResult } from './placement-test-result.entity.js';
import { PlacementTestService } from './placement-test.service.js';
import { PlacementTestController } from './placement-test.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PlacementTestResult])],
  controllers: [PlacementTestController],
  providers: [PlacementTestService],
  exports: [PlacementTestService],
})
export class PlacementTestModule {}
