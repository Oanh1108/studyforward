import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum CourseType {
  TOEIC = 'toeic',
  IELTS = 'ielts',
}

@Entity('vocabularies')
export class Vocabulary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string; // en | th | ko | zh | ja

  @Column({ type: 'enum', enum: CourseType, default: CourseType.TOEIC })
  course: CourseType; // toeic | ielts

  @Column()
  topic: string; // Business, Marketing, Environment...

  @Column()
  word: string;

  @Column({ type: 'varchar', nullable: true })
  phonetic: string | null; // /ˈbɪznəs/

  @Column({ type: 'varchar', nullable: true })
  reading: string | null; // General reading

  @Column({ type: 'varchar', nullable: true })
  pinyin: string | null; // Pinyin

  @Column({ type: 'varchar', nullable: true })
  kana: string | null; // Kana

  @Column({ type: 'varchar', nullable: true })
  romaji: string | null; // Romaji

  @Column({ type: 'varchar', nullable: true })
  romaja: string | null; // Romaja

  @Column({ type: 'varchar', nullable: true })
  thaiReading: string | null; // Thai reading

  @Column()
  partOfSpeech: string; // noun, verb, adj...

  @Column()
  meaning: string; // Vietnamese meaning

  @Column({ type: 'text' })
  example: string; // example sentence

  @Column({ type: 'text', nullable: true })
  exampleTranslation: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ default: 0 })
  frequency: number; // how common in exam (1-5)
}
