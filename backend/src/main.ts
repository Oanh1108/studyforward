import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { AppModule } from './app.module.js';
import { DataSource } from 'typeorm';
import { seedDefaultAdmin, seedVocabulary } from './database/seed.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  // Serve uploaded files as static assets
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Seed data on startup
  const dataSource = app.get(DataSource);
  await seedVocabulary(dataSource);
  await seedDefaultAdmin(dataSource);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`PassEnglish API running on http://localhost:${port}/api`);
}
await bootstrap();
