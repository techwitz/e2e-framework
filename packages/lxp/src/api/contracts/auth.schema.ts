import { z } from 'zod';

export const PublicIdentifierSchema = z
  .string()
  .regex(/^[A-Z]{2,4}-[A-Z0-9_-]+$/, 'Must be a business code with prefix (e.g. USR-*, CRS-*, LES-*, SKL-*)');

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const UserProfileSchema = z.object({
  userCode: PublicIdentifierSchema,
  email: z.string().email(),
  roles: z.array(z.string()),
  workspaceCode: z.string(),
  fullName: z.string().optional(),
});

export const LessonSchema = z.object({
  lessonCode: PublicIdentifierSchema,
  title: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  lessonType: z.enum(['VIDEO', 'DOCUMENT', 'QUIZ', 'SCORM']),
  resourceUrl: z.string().url().optional().nullable(),
});

export const CourseSchema = z.object({
  courseCode: PublicIdentifierSchema,
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']),
  durationMinutes: z.number().int().positive(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  lessons: z.array(LessonSchema).optional(),
});
