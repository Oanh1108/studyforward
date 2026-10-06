import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { VocabularyModule } from './vocabulary/vocabulary.module.js';
import { AdminModule } from './admin/admin.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { SpeakingModule } from './speaking/speaking.module.js';
import { User } from './users/user.entity.js';
import { UserActivityLog } from './users/user-activity-log.entity.js';
import { Vocabulary } from './vocabulary/vocabulary.entity.js';
import { UserVocabulary } from './vocabulary/user-vocabulary.entity.js';
import { CustomVocabulary } from './vocabulary/custom-vocabulary.entity.js';
import { VocabularyFolder } from './vocabulary/vocabulary-folder.entity.js';
import { VocabularyStudySession } from './vocabulary/vocabulary-study-session.entity.js';
import { AdminLog } from './admin/admin-log.entity.js';
import { Lesson } from './courses/lesson.entity.js';
import { UserLessonProgress } from './courses/user-lesson-progress.entity.js';
import { SpeakingPrompt } from './speaking/speaking-prompt.entity.js';
import { SpeakingHistory } from './speaking/speaking-history.entity.js';
import { SpeakingSession } from './speaking/speaking-session.entity.js';
import { PasswordResetToken } from './auth/password-reset-token.entity.js';
import { PlacementTestModule } from './placement-test/placement-test.module.js';
import { PlacementTestResult } from './placement-test/placement-test-result.entity.js';
import { MediaModule } from './media/media.module.js';
import { UserVideoLesson } from './media/media.entity.js';
import { LearningPathsModule } from './learning-paths/learning-paths.module.js';
import { LearningPath, LearningPathSection, LearningPathItem, LearningPathProgress } from './learning-paths/learning-path.entity.js';
import { NotesModule } from './notes/notes.module.js';
import { StudyNote } from './notes/note.entity.js';
import { TodosModule } from './todos/todos.module.js';
import { TodoItem } from './todos/todo.entity.js';
import { FocusModule } from './focus/focus.module.js';
import { FocusSession } from './focus/focus.entity.js';

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
          entities: [
            User,
            UserActivityLog,
            Vocabulary,
            UserVocabulary,
            CustomVocabulary,
            VocabularyFolder,
            VocabularyStudySession,
            AdminLog,
            Lesson,
            UserLessonProgress,
            SpeakingPrompt,
            SpeakingHistory,
            SpeakingSession,
            PasswordResetToken,
            PlacementTestResult,
            UserVideoLesson,
            LearningPath,
            LearningPathSection,
            LearningPathItem,
            LearningPathProgress,
            StudyNote,
            TodoItem,
            FocusSession,
          ],
          synchronize: true,
          logging: false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    VocabularyModule,
    AdminModule,
    CoursesModule,
    SpeakingModule,
    PlacementTestModule,
    MediaModule,
    LearningPathsModule,
    NotesModule,
    TodosModule,
    FocusModule,
  ],
})
export class AppModule {}
