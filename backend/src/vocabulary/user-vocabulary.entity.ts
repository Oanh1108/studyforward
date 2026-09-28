import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity.js';
import { Vocabulary } from './vocabulary.entity.js';

export enum LearningStatus {
  NEW = 'new',
  LEARNING = 'learning',
  REVIEW = 'review',
  MASTERED = 'mastered',
}

@Entity('user_vocabularies')
export class UserVocabulary {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Vocabulary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vocabularyId' })
  vocabulary: Vocabulary;

  @Column()
  vocabularyId: number;

  @Column({ type: 'enum', enum: LearningStatus, default: LearningStatus.NEW })
  status: LearningStatus;

  @Column({ default: 0 })
  correctCount: number;

  @Column({ default: 0 })
  incorrectCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextReviewAt: Date; // SRS next review date

  @UpdateDateColumn()
  updatedAt: Date;
}
