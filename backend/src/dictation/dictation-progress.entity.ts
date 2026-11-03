import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** Best/last accuracy of one dictation item (a TOEIC question, a sample lesson...) for one user. */
@Entity('dictation_progress')
@Unique(['userId', 'itemKey'])
export class DictationProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  /** Stable id of the item, e.g. "toeic-2026-test-01/p1-q1". */
  @Column({ length: 200 })
  itemKey: string;

  /** Best accuracy so far, 0-100. */
  @Column({ type: 'int' })
  best: number;

  @Column({ type: 'int' })
  last: number;

  @Column({ type: 'int', default: 1 })
  attempts: number;

  /** Epoch milliseconds of the latest attempt; kept as given by the client so merging stays deterministic. */
  @Column({
    type: 'bigint',
    transformer: { to: (v: number) => v, from: (v: string | number) => Number(v) },
  })
  updatedAt: number;
}
