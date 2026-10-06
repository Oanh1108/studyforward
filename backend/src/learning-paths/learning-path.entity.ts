import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('learning_paths')
export class LearningPath {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  goal: string;

  @Column({ nullable: true })
  expectedLevel: string;

  @Column({ default: true })
  isPrivate: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('learning_path_sections')
export class LearningPathSection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pathId: number;

  @Column()
  title: string;

  @Column({ default: 0 })
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('learning_path_items')
export class LearningPathItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sectionId: number;

  @Column()
  title: string;

  @Column()
  type: string; // 'youtube', 'vocab', 'dictation', 'shadowing'

  @Column({ nullable: true })
  referenceId: string; // ID of the referenced content

  @Column({ default: 0 })
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('learning_path_progress')
export class LearningPathProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  itemId: number;

  @Column({ default: 'completed' })
  status: string;

  @CreateDateColumn()
  completedAt: Date;
}
