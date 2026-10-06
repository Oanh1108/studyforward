import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningPath, LearningPathSection, LearningPathItem, LearningPathProgress } from './learning-path.entity.js';

@Injectable()
export class LearningPathsService {
  constructor(
    @InjectRepository(LearningPath) private pathsRepo: Repository<LearningPath>,
    @InjectRepository(LearningPathSection) private sectionsRepo: Repository<LearningPathSection>,
    @InjectRepository(LearningPathItem) private itemsRepo: Repository<LearningPathItem>,
    @InjectRepository(LearningPathProgress) private progressRepo: Repository<LearningPathProgress>,
  ) {}

  async createPath(userId: number, data: Partial<LearningPath>) {
    const path = this.pathsRepo.create({ ...data, userId });
    return this.pathsRepo.save(path);
  }

  async getMyPaths(userId: number) {
    return this.pathsRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getPath(id: number, userId: number) {
    const path = await this.pathsRepo.findOne({ where: { id } });
    if (!path) throw new NotFoundException('Path not found');
    if (path.isPrivate && path.userId !== userId) throw new ForbiddenException('Access denied');

    const sections = await this.sectionsRepo.find({ where: { pathId: id }, order: { orderIndex: 'ASC' } });
    const items = await this.itemsRepo.find({
      where: sections.map(s => ({ sectionId: s.id })),
      order: { orderIndex: 'ASC' }
    });

    const progress = await this.progressRepo.find({ where: { userId } });
    const completedItems = new Set(progress.map(p => p.itemId));

    const enrichedSections = sections.map(s => ({
      ...s,
      items: items.filter(i => i.sectionId === s.id).map(i => ({
        ...i,
        completed: completedItems.has(i.id)
      }))
    }));

    return { ...path, sections: enrichedSections };
  }

  async updatePath(id: number, userId: number, data: Partial<LearningPath>) {
    const path = await this.pathsRepo.findOne({ where: { id, userId } });
    if (!path) throw new NotFoundException('Path not found');
    Object.assign(path, data);
    return this.pathsRepo.save(path);
  }

  async deletePath(id: number, userId: number) {
    const path = await this.pathsRepo.findOne({ where: { id, userId } });
    if (!path) throw new NotFoundException();
    await this.pathsRepo.remove(path);
    return { success: true };
  }

  async createSection(pathId: number, userId: number, title: string) {
    const path = await this.pathsRepo.findOne({ where: { id: pathId, userId } });
    if (!path) throw new ForbiddenException();
    
    const count = await this.sectionsRepo.count({ where: { pathId } });
    const section = this.sectionsRepo.create({ pathId, title, orderIndex: count });
    return this.sectionsRepo.save(section);
  }

  async updateSection(sectionId: number, userId: number, data: Partial<LearningPathSection>) {
    const section = await this.sectionsRepo.findOne({ where: { id: sectionId } });
    if (!section) throw new NotFoundException();
    const path = await this.pathsRepo.findOne({ where: { id: section.pathId, userId } });
    if (!path) throw new ForbiddenException();
    
    Object.assign(section, data);
    return this.sectionsRepo.save(section);
  }

  async deleteSection(sectionId: number, userId: number) {
    const section = await this.sectionsRepo.findOne({ where: { id: sectionId } });
    if (!section) throw new NotFoundException();
    const path = await this.pathsRepo.findOne({ where: { id: section.pathId, userId } });
    if (!path) throw new ForbiddenException();
    
    await this.sectionsRepo.remove(section);
    return { success: true };
  }

  async createItem(sectionId: number, userId: number, data: Partial<LearningPathItem>) {
    const section = await this.sectionsRepo.findOne({ where: { id: sectionId } });
    if (!section) throw new NotFoundException();
    const path = await this.pathsRepo.findOne({ where: { id: section.pathId, userId } });
    if (!path) throw new ForbiddenException();

    const count = await this.itemsRepo.count({ where: { sectionId } });
    const item = this.itemsRepo.create({ ...data, sectionId, orderIndex: count });
    return this.itemsRepo.save(item);
  }

  async updateItem(itemId: number, userId: number, data: Partial<LearningPathItem>) {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException();
    
    const section = await this.sectionsRepo.findOne({ where: { id: item.sectionId } });
    const path = await this.pathsRepo.findOne({ where: { id: section?.pathId, userId } });
    if (!path) throw new ForbiddenException();

    Object.assign(item, data);
    return this.itemsRepo.save(item);
  }

  async deleteItem(itemId: number, userId: number) {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException();
    
    const section = await this.sectionsRepo.findOne({ where: { id: item.sectionId } });
    const path = await this.pathsRepo.findOne({ where: { id: section?.pathId, userId } });
    if (!path) throw new ForbiddenException();

    await this.itemsRepo.remove(item);
    return { success: true };
  }

  async reorderItems(sectionId: number, userId: number, itemIds: number[]) {
    const section = await this.sectionsRepo.findOne({ where: { id: sectionId } });
    const path = await this.pathsRepo.findOne({ where: { id: section?.pathId, userId } });
    if (!path) throw new ForbiddenException();

    for (let i = 0; i < itemIds.length; i++) {
      await this.itemsRepo.update({ id: itemIds[i], sectionId }, { orderIndex: i });
    }
    return { success: true };
  }

  async markItemCompleted(itemId: number, userId: number) {
    const existing = await this.progressRepo.findOne({ where: { itemId, userId } });
    if (!existing) {
      const progress = this.progressRepo.create({ itemId, userId });
      await this.progressRepo.save(progress);
    }
    return { success: true };
  }

  async unmarkItemCompleted(itemId: number, userId: number) {
    await this.progressRepo.delete({ itemId, userId });
    return { success: true };
  }
}
