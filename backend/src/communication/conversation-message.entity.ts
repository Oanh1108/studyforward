import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ConversationSession } from './conversation-session.entity.js';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => ConversationSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: ConversationSession;

  @Column({ type: 'varchar', length: 12 })
  role: string; // 'user' | 'assistant'

  @Column({ type: 'text' })
  content: string;

  /** How the user produced the message: typed or recognised from speech. */
  @Column({ type: 'varchar', length: 10, default: 'text' })
  inputType: string;

  /** Assistant messages only: suggested replies, useful vocabulary and phrases shown in the UI. */
  @Column({ type: 'jsonb', nullable: true })
  meta: { suggestions?: string[]; vocabulary?: { term: string; meaning: string }[]; phrases?: string[] } | null;

  @CreateDateColumn()
  createdAt: Date;
}
