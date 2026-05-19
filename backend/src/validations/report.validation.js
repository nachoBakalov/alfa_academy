const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

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

const optionalPositiveIntFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

const dateSchema = z
  .string()
  .regex(dateRegex, 'Date must be in YYYY-MM-DD format')
  .refine(isValidDateString, 'Invalid date');

const optionalSearchSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(150).optional());

const dashboardQuerySchema = z.object({
  academyId: optionalPositiveIntFromQuerySchema,
  seasonId: optionalPositiveIntFromQuerySchema,
  groupId: optionalPositiveIntFromQuerySchema,
  weekStartDate: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value;
  }, dateSchema.optional()),
});

const groupIdParamSchema = z.object({
  groupId: z.coerce.number().int().positive(),
});

const groupDashboardQuerySchema = z.object({
  weekStartDate: z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value;
  }, dateSchema.optional()),
});

const childrenOverviewQuerySchema = z.object({
  search: optionalSearchSchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  dashboardQuerySchema,
  groupIdParamSchema,
  groupDashboardQuerySchema,
  childrenOverviewQuerySchema,
};
