import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ unique: true, nullable: true })
  googleId?: string;

  @Column({ default: 600 })
  goal: number;

  @Column({ type: 'varchar', default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  currentLanguage: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  avatar: string;

  @Column({ type: 'varchar', nullable: true, default: '' })
  coverImage: string;

  @Column({ type: 'varchar', length: 30, default: 'B1 - Intermediate' })
  currentLevel: string;

  @Column({ type: 'int', default: 0 })
  streakDays: number;

  @Column({ type: 'int', default: 0 })
  todayMinutes: number;

  @Column({ type: 'int', default: 25 })
  dailyGoalMinutes: number;

  @Column({ type: 'float', default: 0 })
  totalHours: number;

  @Column({ type: 'int', default: 0 })
  xpPoints: number;

  @Column({ type: 'boolean', default: true })
  reminderEnabled: boolean;

  @Column({ type: 'varchar', length: 10, default: '20:30' })
  reminderTime: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: '' })
  lastActiveDate: string;

  @Column({ type: 'text', nullable: true, default: '' })
  vocabVisibilityConfig: string;

  @Column({ type: 'int', default: 7 })
  weeklyTargetDays: number;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'communication' })
  studyPurpose: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
