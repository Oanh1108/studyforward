import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type LessonStatus = 'locked' | 'in_progress' | 'completed';

@Entity('user_lesson_progress')
@Index(['userId', 'lessonId'], { unique: true })
export class UserLessonProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 50 })
  lessonId: string;

  @Column({ type: 'varchar', length: 30, default: 'locked' })
  status: LessonStatus;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  stars: number;

  @Column({ type: 'int', default: 0 })
  progress: number; // 0 - 100

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
