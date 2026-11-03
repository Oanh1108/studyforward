import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DictationProgress } from './dictation-progress.entity.js';

export interface ProgressValue {
  best: number;
  last: number;
  attempts: number;
  updatedAt: number;
}

const MAX_IMPORT = 2000;
const clampScore = (n: unknown) => {
  const v = Number(n);
  if (!Number.isFinite(v)) throw new BadRequestException('Điểm không hợp lệ');
  return Math.max(0, Math.min(100, Math.round(v)));
};
const cleanKey = (k: unknown) => {
  if (typeof k !== 'string' || !k.trim() || k.length > 200) throw new BadRequestException('Mã mục không hợp lệ');
  return k.trim();
};

@Injectable()
export class DictationService {
  constructor(
    @InjectRepository(DictationProgress)
    private readonly repo: Repository<DictationProgress>,
  ) {}

  async getMine(userId: number): Promise<Record<string, ProgressValue>> {
    const rows = await this.repo.find({ where: { userId } });
    return Object.fromEntries(
      rows.map((r) => [r.itemKey, { best: r.best, last: r.last, attempts: r.attempts, updatedAt: r.updatedAt }]),
    );
  }

  /** One finished attempt: keeps the best score, remembers the last, and counts the attempt. */
  async record(userId: number, itemKey: unknown, score: unknown): Promise<ProgressValue> {
    const key = cleanKey(itemKey);
    const value = clampScore(score);
    const now = Date.now();
    const existing = await this.repo.findOne({ where: { userId, itemKey: key } });
    const row = existing ?? this.repo.create({ userId, itemKey: key, best: value, last: value, attempts: 0, updatedAt: now });
    row.best = Math.max(row.best, value);
    row.last = value;
    row.attempts += 1;
    row.updatedAt = now;
    await this.repo.save(row);
    return { best: row.best, last: row.last, attempts: row.attempts, updatedAt: row.updatedAt };
  }

  /** Merges progress that so far only lived in the browser: highest best, most recent last, highest attempt count. */
  async importMany(userId: number, items: unknown): Promise<Record<string, ProgressValue>> {
    if (!items || typeof items !== 'object' || Array.isArray(items)) throw new BadRequestException('Dữ liệu không hợp lệ');
    const entries = Object.entries(items as Record<string, Partial<ProgressValue>>);
    if (entries.length > MAX_IMPORT) throw new BadRequestException('Quá nhiều mục');

    const current = await this.repo.find({ where: { userId } });
    const byKey = new Map(current.map((r) => [r.itemKey, r]));

    const toSave: DictationProgress[] = [];
    for (const [rawKey, v] of entries) {
      const key = cleanKey(rawKey);
      const best = clampScore(v?.best);
      const last = clampScore(v?.last ?? v?.best);
      const attempts = Math.max(1, Math.round(Number(v?.attempts) || 1));
      const updatedAt = Number.isFinite(Number(v?.updatedAt)) ? Number(v?.updatedAt) : Date.now();

      const row = byKey.get(key);
      if (!row) {
        toSave.push(this.repo.create({ userId, itemKey: key, best, last, attempts, updatedAt }));
        continue;
      }
      row.best = Math.max(row.best, best);
      row.attempts = Math.max(row.attempts, attempts);
      if (updatedAt > row.updatedAt) {
        row.last = last;
        row.updatedAt = updatedAt;
      }
      toSave.push(row);
    }
    if (toSave.length) await this.repo.save(toSave);
    return this.getMine(userId);
  }
}
