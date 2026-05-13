const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value) {
  if (!dateRegex.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

const dateSchema = z
  .string()
  .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
  .refine(isValidDateString, 'Invalid date');

const socialColorSchema = z.enum(['green', 'orange', 'red']);

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const dailyQuerySchema = z.object({
  date: dateSchema,
});

const activeDaySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  isActive: z.boolean(),
});

const updateActiveDaysSchema = z
  .object({
    activeDays: z.array(activeDaySchema).length(7),
  })
  .superRefine((value, ctx) => {
    const seen = new Set();

    for (const day of value.activeDays) {
      if (seen.has(day.dayOfWeek)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate dayOfWeek in activeDays',
          path: ['activeDays'],
        });
        return;
      }

      seen.add(day.dayOfWeek);
    }
  });

const dailyEvaluationInputSchema = z.object({
  childId: z.coerce.number().int().positive(),
  coachRelationColor: socialColorSchema,
  childrenRelationColor: socialColorSchema,
  rulesColor: socialColorSchema,
  optionalComment: z.string().max(2000).optional(),
});

const saveDailyEvaluationsSchema = z
  .object({
    date: dateSchema,
    evaluations: z.array(dailyEvaluationInputSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const seen = new Set();

    for (const evaluation of value.evaluations) {
      if (seen.has(evaluation.childId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate child evaluation in request',
          path: ['evaluations'],
        });
        return;
      }

      seen.add(evaluation.childId);
    }
  });

module.exports = {
  groupIdParamSchema,
  dailyQuerySchema,
  updateActiveDaysSchema,
  saveDailyEvaluationsSchema,
};
