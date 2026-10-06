import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SkillType = 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';
export type CourseLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'Business';

@Entity('lessons')
export class Lesson {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g. 'les-1', 'les-2'

  @Column({ type: 'int', default: 1 })
  unit: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  subtitle: string;

  @Column({ type: 'int', default: 10 })
  durationMin: number;

  @Column({ type: 'int', default: 30 })
  xpReward: number;

  @Column({ type: 'varchar', length: 30, default: 'speaking' })
  skill: SkillType;

  @Column({ type: 'varchar', length: 30, default: 'B1' })
  level: CourseLevel;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'int', default: 1 })
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
