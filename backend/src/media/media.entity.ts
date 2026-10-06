import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_video_lessons')
export class UserVideoLesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  youtubeVideoId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  transcriptData: string; // JSON string containing segments: [{ id, startTime, endTime, text, translation }]

  @Column({ type: 'int', default: 0 })
  scoreCorrect: number;

  @Column({ type: 'int', default: 0 })
  scoreTotal: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
