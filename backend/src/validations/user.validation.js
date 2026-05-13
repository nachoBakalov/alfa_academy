const { z } = require('zod');

const roleSchema = z.enum(['admin', 'coach', 'manager']);

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

const listUsersQuerySchema = z.object({
  role: roleSchema.optional(),
  isActive: booleanFromQuerySchema,
  search: z.string().trim().min(1).max(255).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().max(50).optional(),
  role: roleSchema,
});

const updateUserSchema = z
  .object({
    email: z.string().trim().email().optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().max(50).optional(),
    role: roleSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

module.exports = {
  listUsersQuerySchema,
  userIdParamSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  updateUserStatusSchema,
};
