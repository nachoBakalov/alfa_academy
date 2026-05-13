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

const listChildrenQuerySchema = z.object({
  groupId: z.coerce.number().int().positive().optional(),
  isActive: booleanFromQuerySchema,
  search: z.string().trim().max(150).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const childIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createChildSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  birthDate: dateSchema.optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  parentName: z.string().max(150).optional(),
  parentEmail: z.string().email().optional(),
  parentPhone: z.string().max(50).optional(),
  medicalNotes: z.string().max(5000).optional(),
  generalNotes: z.string().max(5000).optional(),
  groupId: z.coerce.number().int().positive(),
  startsOn: dateSchema.optional(),
});

const updateChildSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    birthDate: dateSchema.optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    parentName: z.string().max(150).optional(),
    parentEmail: z.string().email().optional(),
    parentPhone: z.string().max(50).optional(),
    medicalNotes: z.string().max(5000).optional(),
    generalNotes: z.string().max(5000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const updateChildStatusSchema = z.object({
  isActive: z.boolean(),
});

const generateQuestionnaireTokenSchema = z.object({
  forceRegenerate: z.boolean().default(false),
});

module.exports = {
  listChildrenQuerySchema,
  childIdParamSchema,
  createChildSchema,
  updateChildSchema,
  updateChildStatusSchema,
  generateQuestionnaireTokenSchema,
};
