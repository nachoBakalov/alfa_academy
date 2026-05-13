const express = require('express');
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
const authenticate = require('./middlewares/authenticate');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/academies', authenticate, academyRoutes);
app.use('/api/seasons', authenticate, seasonRoutes);
app.use('/api/groups', authenticate, groupRoutes);
app.use('/api/children', authenticate, childRoutes);
app.use('/api/questionnaires', authenticate, questionnaireRoutes);
app.use('/api/social', authenticate, socialBehaviorRoutes);
app.use('/api/public/questionnaires', publicQuestionnaireRoutes);
app.use('/api', healthRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use(errorHandler);

module.exports = app;
