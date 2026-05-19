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

const booleanFromQuerySchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}, z.boolean().optional());

const dateSchema = z
  .string()
  .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
  .refine(isValidDateString, 'Invalid date');

const challengeStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
const resultDirectionSchema = z.enum(['higher_is_better', 'lower_is_better']);

const percentSchema = z.coerce.number().min(0).max(1);

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const challengeIdParamSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
});

const definitionIdParamSchema = z.object({
  definitionId: z.coerce.number().int().positive(),
});

const listDefinitionsQuerySchema = z.object({
  isActive: booleanFromQuerySchema,
});

const createDefinitionSchema = z.object({
  // Code is a machine identifier and remains Latin slug-only.
  code: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .transform((value) => value.toLowerCase())
    .refine((value) => /^[a-z0-9_]+$/.test(value), {
      message: 'Code can contain lowercase letters, numbers and underscores only',
    }),
  // Human-facing fields (name/description/unit) support Unicode, including Bulgarian Cyrillic.
  name: z.string().trim().min(1).max(150),
  description: z.string().max(5000).optional(),
  unit: z.string().trim().min(1).max(30),
  resultDirection: resultDirectionSchema,
  defaultTargetReductionPercent: percentSchema.default(0.1),
  defaultFailSafeThresholdPercent: percentSchema.default(0.5),
});

const updateDefinitionSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(5000).optional(),
    unit: z.string().trim().min(1).max(30).optional(),
    resultDirection: resultDirectionSchema.optional(),
    defaultTargetReductionPercent: percentSchema.optional(),
    defaultFailSafeThresholdPercent: percentSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const updateDefinitionStatusSchema = z.object({
  isActive: z.boolean(),
});

const listGroupChallengesQuerySchema = z.object({
  status: challengeStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createSportsChallengeSchema = z
  .object({
    definitionCode: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(150),
    description: z.string().max(5000).optional(),
    startsOn: dateSchema,
    endsOn: dateSchema,
    targetReductionPercent: percentSchema.optional(),
    failSafeThresholdPercent: percentSchema.optional(),
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    message: 'endsOn must be greater than or equal to startsOn',
    path: ['endsOn'],
  });

const updateSportsChallengeSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(5000).optional(),
    startsOn: dateSchema.optional(),
    endsOn: dateSchema.optional(),
    targetReductionPercent: percentSchema.optional(),
    failSafeThresholdPercent: percentSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .refine(
    (value) => {
      if (!value.startsOn || !value.endsOn) {
        return true;
      }

      return value.endsOn >= value.startsOn;
    },
    {
      message: 'endsOn must be greater than or equal to startsOn',
      path: ['endsOn'],
    }
  );

const updateSportsChallengeStatusSchema = z.object({
  status: challengeStatusSchema,
});

const challengeResultInputSchema = z.object({
  childId: z.coerce.number().int().positive(),
  baselineValue: z.coerce.number().min(0).optional(),
  finalValue: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

const saveSportsResultsSchema = z
  .object({
    results: z.array(challengeResultInputSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const seen = new Set();

    for (const [index, result] of value.results.entries()) {
      if (seen.has(result.childId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate child result in request',
          path: ['results'],
        });
        return;
      }

      seen.add(result.childId);

      if (result.baselineValue === undefined && result.finalValue === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one of baselineValue or finalValue is required',
          path: ['results', index],
        });
      }
    }
  });

module.exports = {
  groupIdParamSchema,
  challengeIdParamSchema,
  definitionIdParamSchema,
  listDefinitionsQuerySchema,
  createDefinitionSchema,
  updateDefinitionSchema,
  updateDefinitionStatusSchema,
  listGroupChallengesQuerySchema,
  createSportsChallengeSchema,
  updateSportsChallengeSchema,
  updateSportsChallengeStatusSchema,
  saveSportsResultsSchema,
};
