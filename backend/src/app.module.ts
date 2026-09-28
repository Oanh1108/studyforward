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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1008',
      database: 'toeic_db',
      entities: [User, Vocabulary, UserVocabulary, CustomVocabulary],
      synchronize: true,
      logging: false,
    }),
    UsersModule,
    AuthModule,
    VocabularyModule,
  ],
})
export class AppModule {}
