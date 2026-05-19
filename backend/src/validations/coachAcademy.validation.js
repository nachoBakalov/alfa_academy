const { z } = require('zod');

const coachIdParamsSchema = z.object({
  coachId: z.coerce.number().int().positive(),
});

const academyIdParamsSchema = z.object({
  academyId: z.coerce.number().int().positive(),
});

const coachAcademyParamsSchema = z.object({
  academyId: z.coerce.number().int().positive(),
  coachId: z.coerce.number().int().positive(),
});

const assignCoachAcademySchema = z.object({
  coachId: z.coerce.number().int().positive(),
  academyId: z.coerce.number().int().positive(),
});

module.exports = {
  coachIdParamsSchema,
  academyIdParamsSchema,
  coachAcademyParamsSchema,
  assignCoachAcademySchema,
};
