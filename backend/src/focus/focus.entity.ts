import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('focus_sessions')
export class FocusSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  departure: string;

  @Column()
  destination: string;

  @Column()
  targetMinutes: number;

  @Column()
  actualMinutes: number;

  @Column()
  status: string; // 'completed', 'aborted'

  @CreateDateColumn()
  createdAt: Date;
}
