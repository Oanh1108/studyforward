import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vocabulary_study_sessions')
@Index(['userId', 'sessionId'], { unique: true })
@Index(['userId', 'createdAt'])
export class VocabularyStudySession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 120 })
  sessionId: string;

  @Column({ type: 'varchar', length: 30 })
  mode: string; // flashcard | quiz | typing | listening

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  folderIds: string | null;

  @Column({ type: 'int', default: 0 })
  totalWords: number;

  @Column({ type: 'int', default: 0 })
  correctCount: number;

  @Column({ type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ type: 'int', default: 0 })
  xpEarned: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'text', nullable: true })
  details: string | null; // JSON string of [{ wordId, rating, isCorrect, userAnswer }]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
