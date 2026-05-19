const { z } = require('zod');

const optionalPositiveIntFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return value;
}, z.coerce.number().int().positive().optional());

const optionalBooleanFromQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
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

const myGroupsQuerySchema = z.object({
  coachId: optionalPositiveIntFromQuerySchema,
  academyId: optionalPositiveIntFromQuerySchema,
  seasonId: optionalPositiveIntFromQuerySchema,
  isActive: optionalBooleanFromQuerySchema,
});

const academyChildrenQuerySchema = z.object({
  coachId: optionalPositiveIntFromQuerySchema,
  academyId: optionalPositiveIntFromQuerySchema,
  seasonId: optionalPositiveIntFromQuerySchema,
  search: optionalSearchSchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  myGroupsQuerySchema,
  academyChildrenQuerySchema,
};
