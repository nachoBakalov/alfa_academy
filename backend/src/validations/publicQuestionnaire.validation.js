const { z } = require('zod');

const questionnaireTokenParamSchema = z.object({
  token: z.string().min(32).max(128).regex(/^[a-f0-9]+$/i),
});

module.exports = {
  questionnaireTokenParamSchema,
};
