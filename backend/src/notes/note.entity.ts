import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('study_notes')
export class StudyNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  targetType: string; // 'vocab', 'lesson', 'video', 'general'

  @Column({ nullable: true })
  targetId: string;

  @Column({ nullable: true })
  targetName: string; // Keep as fallback so it's readable if target is deleted

  @Column({ type: 'int', nullable: true })
  timestamp: number; // For video timestamp in seconds

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
