import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('speaking_history')
@Index(['userId', 'language'])
export class SpeakingHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  promptId: string | null;

  @Column({ type: 'text' })
  sentence: string;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  fluency: number;

  @Column({ type: 'int', default: 0 })
  pronunciation: number;

  @Column({ type: 'text', default: '' })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;
}
