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

module.exports = {
  groupIdParamSchema,
  groupCoachParamsSchema,
  assignCoachSchema,
  updateCoachAssignmentSchema,
};
