import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';

export enum CustomWordStatus {
  NEW = 'new',
  LEARNING = 'learning',
  MASTERED = 'mastered',
}

@Entity('custom_vocabularies')
@Index(['userId', 'folderId'])
@Index(['userId', 'word'])
@Index(['userId', 'language'])
export class CustomVocabulary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'int', nullable: true })
  folderId: number | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string; // en | th | ko | zh | ja

  @Column({ default: 'Danh sách của tôi' })
  listName: string;

  @Column()
  word: string;

  @Column({ type: 'text', nullable: true })
  meaning: string | null;

  // General reading/pronunciation accessor
  @Column({ type: 'varchar', length: 255, nullable: true })
  reading: string | null;

  // Language specific readings
  @Column({ type: 'varchar', length: 150, nullable: true })
  ipa: string | null; // English IPA

  @Column({ type: 'varchar', length: 150, nullable: true })
  pinyin: string | null; // Chinese Pinyin with tone marks

  @Column({ type: 'varchar', length: 150, nullable: true })
  kana: string | null; // Japanese Furigana/Kana

  @Column({ type: 'varchar', length: 150, nullable: true })
  romaji: string | null; // Japanese Romaji

  @Column({ type: 'varchar', length: 150, nullable: true })
  romaja: string | null; // Korean revised Romanization

  @Column({ type: 'varchar', length: 150, nullable: true })
  thaiReading: string | null; // Thai reading for Vietnamese learners

  @Column({ type: 'varchar', length: 60, nullable: true })
  partOfSpeech: string | null;

  @Column({ type: 'text', nullable: true })
  synonyms: string | null;

  @Column({ type: 'text', nullable: true })
  antonyms: string | null;

  @Column({ type: 'text', nullable: true })
  example: string | null;

  @Column({ type: 'text', nullable: true })
  exampleTranslation: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Legacy progress fields (still used alongside FSRS)
  @Column({ type: 'varchar', length: 20, default: 'new' })
  status: string; // 'new' | 'learning' | 'mastered'

  @Column({ type: 'int', default: 1 })
  stage: number; // 1-6 legacy stage

  @Column({ type: 'int', default: 1 })
  intervalDays: number; // days until next review

  // FSRS Specific Fields
  @Column({ type: 'int', default: 0 })
  fsrsState: number; // 0 = New, 1 = Learning, 2 = Review, 3 = Relearning

  @Column({ type: 'float', default: 0 })
  fsrsDifficulty: number;

  @Column({ type: 'float', default: 0 })
  fsrsStability: number;

  @Column({ type: 'int', default: 0 })
  fsrsReps: number;

  @Column({ type: 'int', default: 0 })
  fsrsLapses: number;

  @Column({ type: 'int', default: 0 })
  fsrsElapsedDays: number;

  @Column({ type: 'int', default: 0 })
  fsrsScheduledDays: number;

  @Column({ type: 'timestamp', nullable: true })
  lastReviewedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextReviewAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
