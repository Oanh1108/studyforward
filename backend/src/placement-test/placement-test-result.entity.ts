import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity.js';

@Entity('placement_test_results')
export class PlacementTestResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  totalScore: number;

  @Column({ type: 'int' })
  maxScore: number;

  @Column({ type: 'int', default: 0 })
  vocabScore: number;

  @Column({ type: 'int', default: 0 })
  grammarScore: number;

  @Column({ type: 'int', default: 0 })
  readingScore: number;

  @Column({ type: 'varchar', length: 50 })
  estimatedLevel: string; // A1, A2, B1, B2, C1, C2

  @Column({ type: 'varchar', length: 255, nullable: true })
  recommendedAction: string;

  @CreateDateColumn()
  createdAt: Date;
}
