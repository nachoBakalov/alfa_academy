const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { env } = require('./config/env');
const { helmetOptions, buildCorsOptions } = require('./config/security');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const academyRoutes = require('./routes/academy.routes');
const seasonRoutes = require('./routes/season.routes');
const groupRoutes = require('./routes/group.routes');
const childRoutes = require('./routes/child.routes');
const questionnaireRoutes = require('./routes/questionnaire.routes');
const publicQuestionnaireRoutes = require('./routes/publicQuestionnaire.routes');
const socialBehaviorRoutes = require('./routes/socialBehavior.routes');
const sportsChallengeRoutes = require('./routes/sportsChallenge.routes');
const creativeChallengeRoutes = require('./routes/creativeChallenge.routes');
const reportRoutes = require('./routes/report.routes');
const coachAcademyRoutes = require('./routes/coachAcademy.routes');
const coachSeasonRoutes = require('./routes/coachSeason.routes');
const coachWorkspaceRoutes = require('./routes/coachWorkspace.routes');
const authenticate = require('./middlewares/authenticate');
const requestId = require('./middlewares/requestId');
const {
  globalApiLimiter,
  authLimiter,
  publicQuestionnaireLimiter,
} = require('./middlewares/rateLimiters');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(requestId);

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(helmet(helmetOptions));
app.use(cors(buildCorsOptions()));

app.use('/api', healthRoutes);
app.use('/api', globalApiLimiter);

app.use(
  express.json({
    limit: env.JSON_BODY_LIMIT,
    type: ['application/json', 'application/*+json'],
  })
);

app.use('/api/auth/login', authLimiter);
app.use('/api/public/questionnaires', publicQuestionnaireLimiter, publicQuestionnaireRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/academies', authenticate, academyRoutes);
app.use('/api/seasons', authenticate, seasonRoutes);
app.use('/api/groups', authenticate, groupRoutes);
app.use('/api/children', authenticate, childRoutes);
app.use('/api/questionnaires', authenticate, questionnaireRoutes);
app.use('/api/social', authenticate, socialBehaviorRoutes);
app.use('/api/sports', authenticate, sportsChallengeRoutes);
app.use('/api/creativity', authenticate, creativeChallengeRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/coach-academies', authenticate, coachAcademyRoutes);
app.use('/api/coach-seasons', authenticate, coachSeasonRoutes);
app.use('/api/coach-workspace', authenticate, coachWorkspaceRoutes);

app.use((req, res) => {
  const response = {
    message: 'Not Found',
    path: req.originalUrl,
  };

  if (req.id) {
    response.requestId = req.id;
  }

  res.status(404).json(response);
});

app.use(errorHandler);

module.exports = app;
