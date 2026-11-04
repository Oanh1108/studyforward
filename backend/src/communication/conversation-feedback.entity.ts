import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** Teacher feedback on one user message. */
@Entity('conversation_feedback')
export class ConversationFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  messageId: string;

  @Column({ type: 'text' })
  originalText: string;

  @Column({ type: 'text' })
  correctedText: string;

  @Column({ type: 'text', default: '' })
  explanation: string;

  @Column({ type: 'jsonb', default: [] })
  vocabulary: { term: string; meaning: string }[];

  @CreateDateColumn()
  createdAt: Date;
}
