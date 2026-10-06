import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('speaking_prompts')
export class SpeakingPrompt {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string; // e.g. 'sp-1', 'sp-2'

  @Column({ type: 'varchar', length: 100 })
  topic: string;

  @Column({ type: 'varchar', length: 20, default: 'B1' })
  level: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'text' })
  sentence: string;

  @Column({ type: 'text', default: '' })
  ipa: string;

  @Column({ type: 'text', default: '' })
  meaningVi: string;

  @Column({ type: 'text', default: '' })
  hint: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  audioKey: string;

  @Column({ type: 'int', default: 1 })
  orderIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
