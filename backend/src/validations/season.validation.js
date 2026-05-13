const { z } = require('zod');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

const listSeasonsQuerySchema = z.object({
  academyId: z.coerce.number().int().positive().optional(),
  isActive: booleanFromQuerySchema,
  search: z.string().trim().max(150).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const seasonIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createSeasonSchema = z
  .object({
    academyId: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(150),
    startsOn: dateSchema,
    endsOn: dateSchema,
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    message: 'endsOn must be greater than or equal to startsOn',
    path: ['endsOn'],
  });

const updateSeasonSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
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

const updateSeasonStatusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = {
  listSeasonsQuerySchema,
  seasonIdParamSchema,
  createSeasonSchema,
  updateSeasonSchema,
  updateSeasonStatusSchema,
};
