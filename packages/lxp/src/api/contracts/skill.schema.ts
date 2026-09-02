import { z } from 'zod';
import { PublicIdentifierSchema } from './auth.schema.js';

export const SkillSchema = z.object({
  skillCode: PublicIdentifierSchema,
  name: z.string(),
  category: z.string(),
  level: z.string(),
});

export const SkillGapItemSchema = z.object({
  skillCode: PublicIdentifierSchema,
  skillName: z.string(),
  currentLevel: z.number().min(0).max(5),
  requiredLevel: z.number().min(0).max(5),
  gap: z.number(),
});

export const WorkflowTaskSchema = z.object({
  taskCode: PublicIdentifierSchema,
  workflowCode: PublicIdentifierSchema,
  title: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  requesterUserCode: PublicIdentifierSchema,
  assignedToRole: z.string(),
  createdAt: z.string(),
});
