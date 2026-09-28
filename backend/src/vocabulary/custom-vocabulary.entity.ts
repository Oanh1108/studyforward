import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, UpdateDateColumn } from 'typeorm';

@Entity('custom_vocabularies')
@Index(['userId', 'word'], { unique: true })
export class CustomVocabulary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ default: 'Danh sách của tôi' })
  listName: string;

  @Column()
  word: string;

  @Column({ nullable: true })
  meaning: string;

  @Column({ nullable: true })
  example: string;

  @Column({ type: 'int', default: 1 })
  stage: number;

  @Column({ type: 'int', default: 1 })
  intervalDays: number;

  @Column({ type: 'timestamp', nullable: true })
  lastReviewedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextReviewAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
