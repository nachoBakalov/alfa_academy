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

const listAcademiesQuerySchema = z.object({
  isActive: booleanFromQuerySchema,
  search: z.string().trim().max(150).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const academyIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const academyChildrenQuerySchema = z.object({
  groupId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(150).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createAcademySchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(5000).optional(),
});

const updateAcademySchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().max(5000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const updateAcademyStatusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = {
  listAcademiesQuerySchema,
  academyIdParamSchema,
  academyChildrenQuerySchema,
  createAcademySchema,
  updateAcademySchema,
  updateAcademyStatusSchema,
};
