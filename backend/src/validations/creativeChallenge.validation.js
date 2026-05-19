const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const CREATIVE_ACTIVITY_TYPES = [
  'Танци',
  'Обща рисунка',
  'Бит и техника',
  'Театър',
  'Музика',
  'Друго',
];

function isValidDateString(value) {
  if (!dateRegex.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

const dateSchema = z
  .string()
  .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
  .refine(isValidDateString, 'Invalid date');

const optionalPositiveIntFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

const challengeStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
const activityTypeSchema = z.enum(CREATIVE_ACTIVITY_TYPES);

const listCreativeChallengesQuerySchema = z.object({
  academyId: optionalPositiveIntFromQuerySchema,
  groupId: optionalPositiveIntFromQuerySchema,
  status: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value;
  }, challengeStatusSchema.optional()),
  weekStartDate: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value;
  }, dateSchema.optional()),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const challengeIdParamSchema = z.object({
  challengeId: z.coerce.number().int().positive(),
});

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const createCreativeChallengeSchema = z
  .object({
    academyId: z.coerce.number().int().positive(),
    title: z.string().trim().min(1).max(150),
    activityType: activityTypeSchema,
    description: z.string().max(5000).optional(),
    startsOn: dateSchema,
    endsOn: dateSchema,
    status: challengeStatusSchema.default('active'),
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    message: 'endsOn must be greater than or equal to startsOn',
    path: ['endsOn'],
  });

const updateCreativeChallengeSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    activityType: activityTypeSchema.optional(),
    description: z.string().max(5000).optional(),
    startsOn: dateSchema.optional(),
    endsOn: dateSchema.optional(),
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

const updateCreativeChallengeStatusSchema = z.object({
  status: challengeStatusSchema,
});

const upsertCreativeChallengeGroupResultSchema = z.object({
  alphaBalls: z.coerce.number().int().min(0).max(10),
  resultNote: z.string().max(2000).optional(),
});

module.exports = {
  CREATIVE_ACTIVITY_TYPES,
  challengeStatusSchema,
  listCreativeChallengesQuerySchema,
  challengeIdParamSchema,
  groupIdParamSchema,
  createCreativeChallengeSchema,
  updateCreativeChallengeSchema,
  updateCreativeChallengeStatusSchema,
  upsertCreativeChallengeGroupResultSchema,
};
