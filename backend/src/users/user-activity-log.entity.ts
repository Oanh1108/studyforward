import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_activity_logs')
@Index(['userId', 'date'], { unique: true })
export class UserActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 10 })
  date: string; // YYYY-MM-DD

  @Column({ type: 'int', default: 0 })
  minutes: number;

  @Column({ type: 'int', default: 0 })
  xpEarned: number;

  @Column({ type: 'int', default: 0 })
  wordsLearned: number;

  @CreateDateColumn()
  createdAt: Date;
}
