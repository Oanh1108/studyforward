import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { VocabularyModule } from './vocabulary/vocabulary.module.js';
import { User } from './users/user.entity.js';
import { Vocabulary } from './vocabulary/vocabulary.entity.js';
import { UserVocabulary } from './vocabulary/user-vocabulary.entity.js';
import { CustomVocabulary } from './vocabulary/custom-vocabulary.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;
        return {
          type: 'postgres',
          ...(process.env.DATABASE_URL
            ? {
                url: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false },
              }
            : {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432', 10),
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASS || '1008',
                database: process.env.DB_NAME || 'toeic_db',
                ssl: isProduction ? { rejectUnauthorized: false } : false,
              }),
          entities: [User, Vocabulary, UserVocabulary, CustomVocabulary],
          synchronize: true,
          logging: false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    VocabularyModule,
  ],
})
export class AppModule {}
