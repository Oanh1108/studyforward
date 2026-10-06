import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity.js';

@Entity('speaking_sessions')
export class SpeakingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  topic: string;

  @Column({ type: 'varchar', length: 20 })
  level: string;

  @Column({ type: 'varchar', length: 20 })
  mode: string; // 'read' or 'translate'

  @Column({ type: 'int', default: 5 })
  totalSentences: number;

  @Column({ type: 'int', default: 0 })
  currentIndex: number;

  @Column({ type: 'jsonb', default: [] })
  promptIds: string[]; // List of speaking_prompts ids to study in this session

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
