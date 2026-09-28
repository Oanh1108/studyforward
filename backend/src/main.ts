import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { DataSource } from 'typeorm';
import { seedDefaultAdmin, seedVocabulary } from './database/seed.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  // Seed data on startup
  const dataSource = app.get(DataSource);
  await seedVocabulary(dataSource);
  await seedDefaultAdmin(dataSource);

  await app.listen(process.env.PORT ?? 3002);
  console.log(`PassEnglish API running on http://localhost:${process.env.PORT ?? 3002}/api`);
}
await bootstrap();
