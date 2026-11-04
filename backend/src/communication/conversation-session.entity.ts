import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity.js';

@Entity('conversation_sessions')
export class ConversationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Topic id (free / daily) or scenario id (roleplay). */
  @Column({ type: 'varchar', length: 60 })
  topic: string;

  @Column({ type: 'varchar', length: 20 })
  mode: string;

  @Column({ type: 'varchar', length: 4 })
  level: string;

  @Column({ type: 'varchar', length: 20, default: 'gentle' })
  correctionMode: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string; // 'active' | 'completed'

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  /** AI-written recap, produced from the real conversation when the session is completed. */
  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, unknown> | null;
}
