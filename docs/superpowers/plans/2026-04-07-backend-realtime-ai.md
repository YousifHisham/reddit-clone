# Backend Realtime & AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time chat via Socket.io, push notifications via Firebase FCM, in-app notifications via Socket.io, and AI post summarization via Grok.

**Architecture:** Socket.io runs on the same HTTP server as Express. Chat rooms are keyed by sorted user ID pairs. Notifications are created in DB and pushed via both Socket.io (in-app) and Firebase FCM (off-app). Grok uses the OpenAI-compatible API.

**Tech Stack:** Socket.io, firebase-admin, openai (xAI base URL), Mongoose, Jest

**Prerequisite:** All previous backend plans complete.

---

## File Structure

```
backend/src/
├── config/
│   ├── socket.js               # Socket.io server setup + JWT auth middleware
│   └── firebase.js             # firebase-admin initialization
├── features/
│   ├── chat/
│   │   ├── message.model.js    # Message Mongoose model
│   │   ├── chat.socket.js      # Socket.io event handlers for chat
│   │   ├── chat.controller.js  # getConversations, getMessages REST endpoints
│   │   ├── chat.routes.js
│   │   └── __tests__/
│   │       └── chat.test.js
│   ├── notifications/
│   │   ├── notification.model.js
│   │   ├── notifications.controller.js  # getNotifications, markRead
│   │   ├── notifications.routes.js
│   │   ├── notifications.service.js     # createNotification (used by posts/comments controllers)
│   │   └── __tests__/
│   │       └── notifications.test.js
│   └── ai/
│       ├── ai.controller.js    # summarizePost
│       ├── ai.routes.js
│       └── __tests__/
│           └── ai.test.js
```

---

### Task 1: Socket.io Server Setup

**Files:**
- Create: `backend/src/config/socket.js`
- Modify: `backend/src/server.js`

- [ ] **Step 1: Install dependencies**

```bash
cd backend && npm install socket.io firebase-admin openai
```

- [ ] **Step 2: Create socket.js**

```javascript
// backend/src/config/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal notification room
    socket.join(`notifications_${socket.userId}`);

    // Chat handlers attached separately
    require('../features/chat/chat.socket')(socket, io);

    socket.on('disconnect', () => {});
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIo };
```

- [ ] **Step 3: Update server.js to use HTTP server + Socket.io**

Replace app.listen in `backend/src/server.js`:
```javascript
const http = require('http');
const { initSocket } = require('./config/socket');

// Replace the existing listen block with:
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    const httpServer = http.createServer(app);
    initSocket(httpServer);
    httpServer.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  });
}

module.exports = app;
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/socket.js backend/src/server.js
git commit -m "feat: add Socket.io server with JWT auth middleware"
```

---

### Task 2: Chat Message Model

**Files:**
- Create: `backend/src/features/chat/message.model.js`

- [ ] **Step 1: Write failing test**

```javascript
// backend/src/features/chat/__tests__/chat.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Message = require('../message.model');

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
afterEach(async () => { await Message.deleteMany({}); });

describe('Message Model', () => {
  it('creates a message with read: false by default', async () => {
    const msg = await Message.create({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: 'Hello!',
    });
    expect(msg.read).toBe(false);
    expect(msg.content).toBe('Hello!');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=chat.test.js -t "Message Model"
```
Expected: FAIL

- [ ] **Step 3: Create message.model.js**

```javascript
// backend/src/features/chat/message.model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=chat.test.js -t "Message Model"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/chat/message.model.js backend/src/features/chat/__tests__/chat.test.js
git commit -m "feat: add Message model for chat"
```

---

### Task 3: Chat Socket Handlers & REST Endpoints

**Files:**
- Create: `backend/src/features/chat/chat.socket.js`
- Create: `backend/src/features/chat/chat.controller.js`
- Create: `backend/src/features/chat/chat.routes.js`

- [ ] **Step 1: Create chat.socket.js**

```javascript
// backend/src/features/chat/chat.socket.js
const Message = require('./message.model');

const getChatRoomId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

module.exports = (socket, io) => {
  socket.on('join_chat', ({ otherUserId }) => {
    const roomId = getChatRoomId(socket.userId, otherUserId);
    socket.join(roomId);
  });

  socket.on('send_message', async ({ receiverId, content }) => {
    try {
      const message = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        content,
      });
      await message.populate('sender', 'username profilePicture');
      const roomId = getChatRoomId(socket.userId, receiverId);
      io.to(roomId).emit('receive_message', message);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ receiverId, isTyping }) => {
    const roomId = getChatRoomId(socket.userId, receiverId);
    socket.to(roomId).emit('typing', { userId: socket.userId, isTyping });
  });

  socket.on('message_read', async ({ messageId }) => {
    await Message.findByIdAndUpdate(messageId, { read: true });
    socket.broadcast.emit('message_read', { messageId });
  });
};
```

- [ ] **Step 2: Write failing REST test**

Add to `backend/src/features/chat/__tests__/chat.test.js`:
```javascript
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const { createToken } = require('../../auth/auth.utils');

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRES_IN = '7d';

afterEach(async () => {
  await User.deleteMany({});
  await Message.deleteMany({});
});

describe('GET /api/chat/conversations', () => {
  it('returns list of users the current user has chatted with', async () => {
    const user1 = await User.create({ email: 'u1@test.com', username: 'user1', verified: true });
    const user2 = await User.create({ email: 'u2@test.com', username: 'user2' });
    await Message.create({ sender: user1._id, receiver: user2._id, content: 'Hi' });
    const token = createToken(user1._id);
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
  });
});

describe('GET /api/chat/messages/:userId', () => {
  it('returns messages between current user and another user', async () => {
    const user1 = await User.create({ email: 'u3@test.com', username: 'user3', verified: true });
    const user2 = await User.create({ email: 'u4@test.com', username: 'user4' });
    await Message.create({ sender: user1._id, receiver: user2._id, content: 'Hello' });
    await Message.create({ sender: user2._id, receiver: user1._id, content: 'Hi back' });
    const token = createToken(user1._id);
    const res = await request(app)
      .get(`/api/chat/messages/${user2._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=chat.test.js -t "GET /api/chat"
```
Expected: FAIL

- [ ] **Step 4: Create chat.controller.js**

```javascript
// backend/src/features/chat/chat.controller.js
const Message = require('./message.model');
const mongoose = require('mongoose');

const getConversations = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', userId] }, '$receiver', '$sender'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] }, 1, 0] } },
        },
      },
    ]);
    const User = require('../auth/auth.model');
    const populated = await Promise.all(conversations.map(async (c) => {
      const user = await User.findById(c._id).select('username profilePicture');
      return { user, lastMessage: c.lastMessage, unreadCount: c.unreadCount };
    }));
    res.json({ success: true, conversations: populated });
  } catch (err) { next(err); }
};

const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    }).sort({ createdAt: 1 }).populate('sender', 'username profilePicture');
    // Mark received messages as read
    await Message.updateMany({ sender: userId, receiver: req.user.id, read: false }, { read: true });
    res.json({ success: true, messages });
  } catch (err) { next(err); }
};

module.exports = { getConversations, getMessages };
```

- [ ] **Step 5: Create chat.routes.js**

```javascript
// backend/src/features/chat/chat.routes.js
const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { getConversations, getMessages } = require('./chat.controller');

const router = express.Router();
router.get('/conversations', verifyToken, getConversations);
router.get('/messages/:userId', verifyToken, getMessages);

module.exports = router;
```

- [ ] **Step 6: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const chatRoutes = require('./features/chat/chat.routes');
app.use('/api/chat', chatRoutes);
```

- [ ] **Step 7: Run all chat tests**

```bash
cd backend && npx jest --testPathPattern=chat.test.js
```
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/features/chat/
git commit -m "feat: add Socket.io chat handlers and REST conversation/messages endpoints"
```

---

### Task 4: Notification Model & Service

**Files:**
- Create: `backend/src/features/notifications/notification.model.js`
- Create: `backend/src/features/notifications/notifications.service.js`
- Create: `backend/src/config/firebase.js`

- [ ] **Step 1: Add Firebase credentials to .env.example**

Add to `backend/.env.example`:
```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key"
```

- [ ] **Step 2: Create firebase.js**

```javascript
// backend/src/config/firebase.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;
  try {
    await admin.messaging().send({ token: fcmToken, notification: { title, body }, data });
  } catch (err) {
    console.error('FCM error:', err.message);
  }
};

module.exports = { sendPushNotification };
```

- [ ] **Step 3: Write failing test**

```javascript
// backend/src/features/notifications/__tests__/notifications.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Notification = require('../notification.model');

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
afterEach(async () => { await Notification.deleteMany({}); });

describe('Notification Model', () => {
  it('creates notification with read: false', async () => {
    const notif = await Notification.create({
      user: new mongoose.Types.ObjectId(),
      type: 'comment',
      post: new mongoose.Types.ObjectId(),
      triggeredBy: new mongoose.Types.ObjectId(),
    });
    expect(notif.read).toBe(false);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=notifications.test.js -t "Notification Model"
```
Expected: FAIL

- [ ] **Step 5: Create notification.model.js**

```javascript
// backend/src/features/notifications/notification.model.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['upvote', 'comment', 'reply'], required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
```

- [ ] **Step 6: Create notifications.service.js**

```javascript
// backend/src/features/notifications/notifications.service.js
const Notification = require('./notification.model');
const User = require('../auth/auth.model');
const { sendPushNotification } = require('../../config/firebase');

const typeMessages = {
  upvote: (triggererName) => ({ title: 'New upvote', body: `${triggererName} upvoted your post` }),
  comment: (triggererName) => ({ title: 'New comment', body: `${triggererName} commented on your post` }),
  reply: (triggererName) => ({ title: 'New reply', body: `${triggererName} replied to your comment` }),
};

const createNotification = async ({ userId, type, postId, triggeredById }) => {
  try {
    // Don't notify yourself
    if (userId.toString() === triggeredById.toString()) return;

    const notification = await Notification.create({
      user: userId, type, post: postId, triggeredBy: triggeredById,
    });

    const [recipient, triggerer] = await Promise.all([
      User.findById(userId).select('fcmToken'),
      User.findById(triggeredById).select('username'),
    ]);

    // In-app: emit via Socket.io
    try {
      const { getIo } = require('../../config/socket');
      const io = getIo();
      io.to(`notifications_${userId}`).emit('new_notification', notification);
    } catch {}

    // Off-app: Firebase FCM
    if (recipient?.fcmToken) {
      const { title, body } = typeMessages[type](triggerer?.username || 'Someone');
      await sendPushNotification(recipient.fcmToken, title, body);
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { createNotification };
```

- [ ] **Step 7: Run test to verify model passes**

```bash
cd backend && npx jest --testPathPattern=notifications.test.js -t "Notification Model"
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/features/notifications/ backend/src/config/firebase.js backend/.env.example
git commit -m "feat: add Notification model, service with Socket.io + FCM push delivery"
```

---

### Task 5: Notification REST Endpoints

**Files:**
- Create: `backend/src/features/notifications/notifications.controller.js`
- Create: `backend/src/features/notifications/notifications.routes.js`

- [ ] **Step 1: Write failing tests**

Add to `backend/src/features/notifications/__tests__/notifications.test.js`:
```javascript
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const { createToken } = require('../../auth/auth.utils');

process.env.JWT_SECRET = 'testsecret';
process.env.JWT_EXPIRES_IN = '7d';

afterEach(async () => {
  await User.deleteMany({});
  await Notification.deleteMany({});
});

describe('GET /api/notifications', () => {
  it('returns notifications for current user', async () => {
    const user = await User.create({ email: 'n@test.com', username: 'notifuser', verified: true });
    const other = await User.create({ email: 'o@test.com', username: 'other' });
    await Notification.create({ user: user._id, type: 'comment', triggeredBy: other._id });
    const token = createToken(user._id);
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
  });
});

describe('PUT /api/notifications/:id/read', () => {
  it('marks notification as read', async () => {
    const user = await User.create({ email: 'nr@test.com', username: 'nruser', verified: true });
    const other = await User.create({ email: 'or@test.com', username: 'oruser' });
    const notif = await Notification.create({ user: user._id, type: 'upvote', triggeredBy: other._id });
    const token = createToken(user._id);
    const res = await request(app)
      .put(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const updated = await Notification.findById(notif._id);
    expect(updated.read).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=notifications.test.js -t "GET /api/notifications"
```
Expected: FAIL

- [ ] **Step 3: Create notifications.controller.js**

```javascript
// backend/src/features/notifications/notifications.controller.js
const Notification = require('./notification.model');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('triggeredBy', 'username profilePicture')
      .populate('post', 'title')
      .limit(50);
    res.json({ success: true, notifications });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markRead, markAllRead };
```

- [ ] **Step 4: Create notifications.routes.js**

```javascript
// backend/src/features/notifications/notifications.routes.js
const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { getNotifications, markRead, markAllRead } = require('./notifications.controller');

const router = express.Router();
router.get('/', verifyToken, getNotifications);
router.put('/read-all', verifyToken, markAllRead);
router.put('/:id/read', verifyToken, markRead);

module.exports = router;
```

- [ ] **Step 5: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const notificationsRoutes = require('./features/notifications/notifications.routes');
app.use('/api/notifications', notificationsRoutes);
```

- [ ] **Step 6: Wire notifications into posts and comments controllers**

In `backend/src/features/posts/posts.controller.js`, add after saving an upvote:
```javascript
const { createNotification } = require('../notifications/notifications.service');
// Inside upvotePost, after post.save(), when NOT removing upvote:
if (!alreadyUpvoted) {
  await createNotification({ userId: post.author, type: 'upvote', postId: post._id, triggeredById: req.user.id });
}
```

In `backend/src/features/comments/comments.controller.js`, add after creating comment:
```javascript
const { createNotification } = require('../notifications/notifications.service');
// After comment is created, notify post author:
await createNotification({ userId: post.author, type: 'comment', postId: post._id, triggeredById: req.user.id });
// If reply, also notify parent comment author:
if (parentComment) {
  const parent = await Comment.findById(parentComment);
  if (parent) {
    await createNotification({ userId: parent.author, type: 'reply', postId: postId, triggeredById: req.user.id });
  }
}
```

- [ ] **Step 7: Run all notification tests**

```bash
cd backend && npx jest --testPathPattern=notifications.test.js
```
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/features/notifications/ backend/src/features/posts/posts.controller.js backend/src/features/comments/comments.controller.js
git commit -m "feat: add notification REST endpoints and wire upvote/comment triggers"
```

---

### Task 6: Grok AI Summarization

**Files:**
- Create: `backend/src/features/ai/ai.controller.js`
- Create: `backend/src/features/ai/ai.routes.js`

- [ ] **Step 1: Add Grok API key to .env.example**

Add to `backend/.env.example`:
```
XAI_API_KEY=your_xai_api_key
```

- [ ] **Step 2: Write failing test**

```javascript
// backend/src/features/ai/__tests__/ai.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const Post = require('../../posts/post.model');
const Community = require('../../communities/community.model');
const { createToken } = require('../../auth/auth.utils');

// Mock OpenAI to avoid real API calls in tests
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'This is a test summary.' } }],
        }),
      },
    },
  }));
});

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.XAI_API_KEY = 'test-key';
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });

describe('POST /api/ai/summarize/:postId', () => {
  it('returns a summary for a post', async () => {
    const user = await User.create({ email: 'ai@test.com', username: 'aiuser', verified: true });
    const community = await Community.create({ name: 'aicomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'AI test post', content: 'This is the post content.', author: user._id, community: community._id });
    const token = createToken(user._id);
    const res = await request(app)
      .post(`/api/ai/summarize/${post._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBe('This is a test summary.');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=ai.test.js
```
Expected: FAIL — route not found

- [ ] **Step 4: Create ai.controller.js**

```javascript
// backend/src/features/ai/ai.controller.js
const OpenAI = require('openai');
const Post = require('../posts/post.model');
const Comment = require('../comments/comment.model');

// Simple in-memory rate limit: userId_postId -> timestamp
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

const summarizePost = async (req, res, next) => {
  try {
    const key = `${req.user.id}_${req.params.postId}`;
    const lastRequest = rateLimitMap.get(key);
    if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_MS) {
      const waitSeconds = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastRequest)) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${waitSeconds}s before summarizing again`, code: 'RATE_LIMITED' });
    }

    const post = await Post.findById(req.params.postId).populate('author', 'username');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });

    const topComments = await Comment.find({ post: post._id, parentComment: null })
      .sort({ upvotes: -1 })
      .limit(10)
      .populate('author', 'username');

    const commentsText = topComments.map(c => `${c.author.username}: ${c.content}`).join('\n');
    const prompt = `Summarize this Reddit post and its top comments in 3-5 sentences.\n\nPost Title: ${post.title}\nPost Content: ${post.content}\n\nTop Comments:\n${commentsText || 'No comments yet.'}`;

    const client = new OpenAI({ baseURL: 'https://api.x.ai/v1', apiKey: process.env.XAI_API_KEY });
    const response = await client.chat.completions.create({
      model: 'grok-3',
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = response.choices[0].message.content;
    rateLimitMap.set(key, Date.now());
    res.json({ success: true, summary });
  } catch (err) { next(err); }
};

module.exports = { summarizePost };
```

- [ ] **Step 5: Create ai.routes.js**

```javascript
// backend/src/features/ai/ai.routes.js
const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { summarizePost } = require('./ai.controller');

const router = express.Router();
router.post('/summarize/:postId', verifyToken, summarizePost);

module.exports = router;
```

- [ ] **Step 6: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const aiRoutes = require('./features/ai/ai.routes');
app.use('/api/ai', aiRoutes);
```

- [ ] **Step 7: Run all AI tests**

```bash
cd backend && npx jest --testPathPattern=ai.test.js
```
Expected: PASS

- [ ] **Step 8: Run full backend test suite**

```bash
cd backend && npx jest --forceExit
```
Expected: All suites PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/features/ai/ backend/src/server.js backend/.env.example
git commit -m "feat: add Grok AI post summarization with per-user rate limiting"
```
