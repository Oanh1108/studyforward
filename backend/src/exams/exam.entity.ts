import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Question } from '../questions/question.entity.js';

export enum ExamLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ExamLevel, default: ExamLevel.INTERMEDIATE })
  level: ExamLevel;

  @Column({ default: 120 })
  duration: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Question, (q) => q.exam, { cascade: true })
  questions: Question[];

  @CreateDateColumn()
  createdAt: Date;
}
