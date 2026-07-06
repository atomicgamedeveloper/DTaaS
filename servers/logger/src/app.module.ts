import { Module } from '@nestjs/common';
import AppController from './app.controller.js';
import LogEventValidationPipe from './log-event-validation.pipe.js';
import LoggerAuthGuard from './logger-auth.guard.js';
import LogsModule from './logs/logs.module.js';

@Module({
  imports: [LogsModule],
  controllers: [AppController],
  providers: [LogEventValidationPipe, LoggerAuthGuard],
})
export default class AppModule {}
