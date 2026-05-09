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

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
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
  connectDB().then(async () => {
    const Community = require('./features/communities/community.model');
    await Community.updateMany({ category: { $exists: false } }, { $set: { category: 'General' } });
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  });
}

module.exports = app;
