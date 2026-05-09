require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./features/auth/auth.routes');
const usersRoutes = require('./features/users/users.routes');
const communitiesRoutes = require('./features/communities/communities.routes');
const postsRoutes = require('./features/posts/posts.routes');
const notificationsRoutes = require('./features/notifications/notifications.routes');
const messagesRoutes = require('./features/messages/messages.routes');
const commentsRoutes = require('./features/comments/comments.routes');
const searchRoutes = require('./features/search/search.routes');
const settingsRoutes = require('./features/settings/settings.routes');

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async () => {
      const Community = require('./features/communities/community.model');
      await Community.updateMany({ category: { $exists: false } }, { $set: { category: 'General' } });
      if (process.env.NODE_ENV !== 'production') {
        app.listen(process.env.PORT || 5000, () => {
          console.log(`Server running on port ${process.env.PORT || 5000}`);
        });
      }
    })
    .catch((err) => console.error('DB connection failed:', err));
}

module.exports = app;
