require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./features/auth/auth.routes');
const usersRoutes = require('./features/users/users.routes');
const communitiesRoutes = require('./features/communities/communities.routes');
const postsRoutes = require('./features/posts/posts.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/posts', postsRoutes);

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  });
}

module.exports = app;
