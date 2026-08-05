import { pgTable, serial, text, boolean, timestamp, integer, bigint } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const downloads = pgTable('downloads', {
  id: serial('id').primaryKey(),
  jobId: text('job_id').notNull().unique(),
  url: text('url').notNull(),
  platform: text('platform').notNull(),
  withAudio: boolean('with_audio').notNull().default(true),
  quality: text('quality').notNull().default('1080p'),
  status: text('status').notNull().default('processing'), // processing | completed | failed
  title: text('title'),
  thumbnail: text('thumbnail'),
  uploader: text('uploader'),
  duration: integer('duration'),
  progress: integer('progress').notNull().default(0),
  fileName: text('file_name'),
  fileSize: bigint('file_size', { mode: 'number' }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp('completed_at'),
});
