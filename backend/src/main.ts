import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { DataSource } from 'typeorm';
import { seedDefaultAdmin, seedVocabulary } from './database/seed.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  // Seed data on startup
  const dataSource = app.get(DataSource);
  await seedVocabulary(dataSource);
  await seedDefaultAdmin(dataSource);

  const port = process.env.PORT ?? 3002;
  await app.listen(port, '0.0.0.0');
  console.log(`PassEnglish API running on http://localhost:${port}/api`);
}
await bootstrap();
