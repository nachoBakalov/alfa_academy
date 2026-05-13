const { z } = require('zod');

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

const listGroupsQuerySchema = z.object({
  seasonId: z.coerce.number().int().positive().optional(),
  academyId: z.coerce.number().int().positive().optional(),
  isActive: booleanFromQuerySchema,
  search: z.string().trim().max(150).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const groupIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createGroupSchema = z
  .object({
    seasonId: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(150),
    description: z.string().max(5000).optional(),
    ageMin: z.coerce.number().int().min(0).optional(),
    ageMax: z.coerce.number().int().min(0).optional(),
    capacity: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (value) => {
      if (value.ageMin === undefined || value.ageMax === undefined) {
        return true;
      }

      return value.ageMax >= value.ageMin;
    },
    {
      message: 'ageMax must be greater than or equal to ageMin',
      path: ['ageMax'],
    }
  );

const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(5000).optional(),
    ageMin: z.coerce.number().int().min(0).optional(),
    ageMax: z.coerce.number().int().min(0).optional(),
    capacity: z.coerce.number().int().positive().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .refine(
    (value) => {
      if (value.ageMin === undefined || value.ageMax === undefined) {
        return true;
      }

      return value.ageMax >= value.ageMin;
    },
    {
      message: 'ageMax must be greater than or equal to ageMin',
      path: ['ageMax'],
    }
  );

const updateGroupStatusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = {
  listGroupsQuerySchema,
  groupIdParamSchema,
  createGroupSchema,
  updateGroupSchema,
  updateGroupStatusSchema,
};
