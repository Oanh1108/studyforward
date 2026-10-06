import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AdminAction {
  LOCK_USER = 'LOCK_USER',
  UNLOCK_USER = 'UNLOCK_USER',
  CHANGE_ROLE = 'CHANGE_ROLE',
  CREATE_SHARED_VOCAB = 'CREATE_SHARED_VOCAB',
  UPDATE_SHARED_VOCAB = 'UPDATE_SHARED_VOCAB',
  DELETE_SHARED_VOCAB = 'DELETE_SHARED_VOCAB',
}

@Entity('admin_logs')
@Index(['adminId'])
@Index(['createdAt'])
export class AdminLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number;

  @Column()
  adminEmail: string;

  @Column()
  adminName: string;

  @Column({ type: 'varchar', length: 60 })
  action: string;

  @Column({ type: 'varchar', length: 50 })
  targetType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetId: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
