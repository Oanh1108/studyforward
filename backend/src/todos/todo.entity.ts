import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('todos')
export class TodoItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  dueDate: string; // ISO string

  @Column({ default: 'medium' })
  priority: string; // 'low', 'medium', 'high'

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  linkedType: string; // 'lesson', 'path', etc.

  @Column({ nullable: true })
  linkedId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
