const { z } = require('zod');

const coachIdParamsSchema = z.object({
  coachId: z.coerce.number().int().positive(),
});

const seasonIdParamsSchema = z.object({
  seasonId: z.coerce.number().int().positive(),
});

const coachSeasonParamsSchema = z.object({
  seasonId: z.coerce.number().int().positive(),
  coachId: z.coerce.number().int().positive(),
});

const assignCoachSeasonSchema = z.object({
  coachId: z.coerce.number().int().positive(),
  seasonId: z.coerce.number().int().positive(),
});

module.exports = {
  coachIdParamsSchema,
  seasonIdParamsSchema,
  coachSeasonParamsSchema,
  assignCoachSeasonSchema,
};
