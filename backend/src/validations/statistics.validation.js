const { z } = require('zod');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_PRESETS = ['current_week', 'previous_week', 'current_month', 'all', 'custom'];

function isValidDateString(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

const optionalPositiveIntFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

const optionalDateSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
},
z
  .string()
  .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format')
  .refine(isValidDateString, 'Invalid date')
  .optional());

const presetSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}, z.enum(PERIOD_PRESETS).default('current_week'));

function validateCustomPreset(value, context) {
  if (value.preset === 'custom' && (!value.startDate || !value.endDate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate and endDate are required when preset is custom',
      path: ['startDate'],
    });
  }
}

const baseQuerySchema = z.object({
  academyId: optionalPositiveIntFromQuerySchema,
  preset: presetSchema,
  startDate: optionalDateSchema,
  endDate: optionalDateSchema,
});

const groupOverviewQuerySchema = baseQuerySchema
  .extend({
    groupId: optionalPositiveIntFromQuerySchema,
  })
  .superRefine(validateCustomPreset);

const groupLeaderboardQuerySchema = baseQuerySchema.superRefine(validateCustomPreset);

module.exports = {
  PERIOD_PRESETS,
  groupOverviewQuerySchema,
  groupLeaderboardQuerySchema,
};
