import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exam } from '../exams/exam.entity.js';

export enum QuestionPart {
  PART1 = 1, PART2 = 2, PART3 = 3, PART4 = 4,
  PART5 = 5, PART6 = 6, PART7 = 7,
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Exam, (e) => e.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column()
  examId: number;

  @Column({ type: 'int' })
  part: number; // 1-7

  @Column()
  orderIndex: number; // question number within exam

  @Column({ nullable: true })
  audioUrl: string; // for listening parts

  @Column({ nullable: true })
  imageUrl: string; // for part 1

  @Column({ type: 'text', nullable: true })
  passage: string; // for part 6, 7

  @Column({ type: 'text', nullable: true })
  text: string; // question text

  @Column({ type: 'json' })
  options: string[]; // ['A. ...', 'B. ...', 'C. ...', 'D. ...']

  @Column({ length: 1 })
  answer: string; // 'A' | 'B' | 'C' | 'D'

  @Column({ type: 'text', nullable: true })
  explanation: string;
}
