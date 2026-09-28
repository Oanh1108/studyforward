import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum CourseType {
  TOEIC = 'toeic',
  IELTS = 'ielts',
}

@Entity('vocabularies')
export class Vocabulary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: CourseType })
  course: CourseType; // toeic | ielts

  @Column()
  topic: string; // Business, Marketing, Environment...

  @Column()
  word: string;

  @Column()
  phonetic: string; // /ˈbɪznəs/

  @Column()
  partOfSpeech: string; // noun, verb, adj...

  @Column()
  meaning: string; // Vietnamese meaning

  @Column({ type: 'text' })
  example: string; // example sentence

  @Column({ nullable: true })
  exampleTranslation: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 0 })
  frequency: number; // how common in exam (1-5)
}
