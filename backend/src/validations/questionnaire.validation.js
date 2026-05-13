const { z } = require('zod');

const questionnaireTokenParamSchema = z.object({
  token: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i),
});

const submitQuestionnaireSchema = z
  .object({
    submittedByName: z.string().max(150).optional(),
    submittedByRelation: z.enum(['parent', 'guardian', 'other']),
    answers: z
      .array(
        z.object({
          questionCode: z.string().min(1).max(100),
          scoreValue: z.number().int().min(1).max(10).optional(),
          textValue: z.string().max(1000).optional(),
          note: z.string().max(2000).optional(),
        })
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    const codes = new Set();

    value.answers.forEach((answer, index) => {
      const normalizedCode = answer.questionCode.trim().toLowerCase();

      if (codes.has(normalizedCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate questionCode is not allowed',
          path: ['answers', index, 'questionCode'],
        });
      }

      codes.add(normalizedCode);
    });
  });

const childIdParamSchema = z.object({
  childId: z.coerce.number().int().positive(),
});

module.exports = {
  questionnaireTokenParamSchema,
  submitQuestionnaireSchema,
  childIdParamSchema,
};
