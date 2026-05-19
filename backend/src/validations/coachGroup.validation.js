const { z } = require('zod');

const groupIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const groupCoachParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  coachId: z.coerce.number().int().positive(),
});

const assignCoachSchema = z.object({
  coachId: z.coerce.number().int().positive(),
  isPrimary: z.boolean().default(false),
});

const updateCoachAssignmentSchema = z.object({
  isPrimary: z.boolean(),
});

const listCoachDirectoryQuerySchema = z.object({
  search: z.string().trim().min(1).max(255).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  groupIdParamSchema,
  groupCoachParamsSchema,
  assignCoachSchema,
  updateCoachAssignmentSchema,
  listCoachDirectoryQuerySchema,
};
