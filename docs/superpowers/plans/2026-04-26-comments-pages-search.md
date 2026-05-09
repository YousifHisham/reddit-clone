# Comments, Pages & Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nested comments, four missing frontend pages (PostDetail, Community, Profile, Search), and a unified search endpoint to complete the Reddit clone's core requirements.

**Architecture:** Adjacency-list comments with nullable `parent` ObjectId — backend returns flat array, client builds tree in one pass with a `buildTree()` helper. New backend features each get their own feature folder following the existing pattern. Frontend pages follow the single-file style of `HomePage.jsx` with a shared `Layout` component extracted for navbar reuse.

**Tech Stack:** Node/Express/Mongoose (backend), Jest + supertest + MongoMemoryServer (backend tests), React 18 + React Router v6 (frontend, no frontend tests)

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `backend/src/features/comments/comment.model.js` | Comment Mongoose schema |
| `backend/src/features/comments/comments.controller.js` | createComment, getComments, deleteComment, upvoteComment, downvoteComment |
| `backend/src/features/comments/comments.routes.js` | POST /, DELETE /:id, POST /:id/upvote, POST /:id/downvote |
| `backend/src/features/comments/__tests__/comments.test.js` | Comment endpoint tests |
| `backend/src/features/search/search.controller.js` | Unified search across posts, communities, users |
| `backend/src/features/search/search.routes.js` | GET / |
| `backend/src/features/search/__tests__/search.test.js` | Search endpoint tests |
| `frontend/src/api/comments.js` | Frontend comment API calls |
| `frontend/src/api/search.js` | Frontend search API call |
| `frontend/src/components/Layout.jsx` | Shared navbar wrapper for all pages |
| `frontend/src/pages/PostDetailPage.jsx` | Post + nested comments |
| `frontend/src/pages/CommunityPage.jsx` | Community info + posts |
| `frontend/src/pages/ProfilePage.jsx` | User profile + posts/comments tabs |
| `frontend/src/pages/SearchPage.jsx` | Tabbed search results |

### Modified files
| File | Change |
|------|--------|
| `backend/src/server.js` | Register `/api/comments` and `/api/search` routes |
| `backend/src/features/posts/posts.routes.js` | Add `GET /:id/comments` |
| `backend/src/features/communities/communities.controller.js` | Add `getCommunityByName` |
| `backend/src/features/communities/communities.routes.js` | Add `GET /name/:name` before `/:id` |
| `backend/src/features/users/users.controller.js` | Add `getUserByUsername`, `getUserPosts`, `getUserComments` |
| `backend/src/features/users/users.routes.js` | Add `GET /username/:username`, `GET /:username/posts`, `GET /:username/comments` before `GET /:id` |
| `frontend/src/api/communities.js` | Add `getCommunityByName`, `getCommunityPosts` |
| `frontend/src/api/users.js` | Add `getUserByUsername`, `getUserPosts`, `getUserComments` |
| `frontend/src/api/posts.js` | Add `getPost` |
| `frontend/src/App.jsx` | Add 4 routes wrapped in Layout, wire PostCard nav links |

---

## Task 1: Write failing comment tests

**Files:**
- Create: `backend/src/features/comments/__tests__/comments.test.js`
- Create: `backend/src/features/comments/comment.model.js` (stub only)

- [ ] **Step 1: Create a stub model so the test file can import it without crashing**

Create `backend/src/features/comments/comment.model.js`:
```js
const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({});
module.exports = mongoose.model('Comment', commentSchema);
```

- [ ] **Step 2: Write the test file**

Create `backend/src/features/comments/__tests__/comments.test.js`:
```js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const Comment = require('../comment.model');
const Post = require('../../posts/post.model');
const User = require('../../auth/auth.model');
const Community = require('../../communities/community.model');
const { createToken } = require('../../auth/auth.utils');

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRES_IN = '7d';
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
afterEach(async () => {
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await User.deleteMany({});
  await Community.deleteMany({});
});

async function seed() {
  const user = await User.create({ email: 'c@test.com', username: 'commenter', verified: true });
  const community = await Community.create({ name: 'testcomm', description: 'test', creator: user._id, members: [user._id] });
  const post = await Post.create({ title: 'Post', content: 'content', author: user._id, community: community._id });
  const token = createToken(user._id);
  return { user, community, post, token };
}

describe('Comment Model', () => {
  it('defaults depth to 0 and parent to null', async () => {
    const c = await Comment.create({
      content: 'hi',
      author: new mongoose.Types.ObjectId(),
      post: new mongoose.Types.ObjectId(),
    });
    expect(c.depth).toBe(0);
    expect(c.upvotes).toBe(0);
    expect(c.parent).toBeNull();
  });
});

describe('POST /api/comments', () => {
  it('creates top-level comment and increments post.commentCount', async () => {
    const { post, token } = await seed();
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'First comment', postId: post._id });
    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe('First comment');
    expect(res.body.comment.depth).toBe(0);
    const updated = await Post.findById(post._id);
    expect(updated.commentCount).toBe(1);
  });

  it('creates nested reply with depth = parent.depth + 1', async () => {
    const { user, post, token } = await seed();
    const parent = await Comment.create({
      content: 'Parent', author: user._id, post: post._id, depth: 0,
    });
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Reply', postId: post._id, parentId: parent._id });
    expect(res.status).toBe(201);
    expect(res.body.comment.depth).toBe(1);
  });

  it('returns 401 without auth', async () => {
    const { post } = await seed();
    const res = await request(app)
      .post('/api/comments')
      .send({ content: 'hi', postId: post._id });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/posts/:id/comments', () => {
  it('returns flat array sorted by createdAt asc', async () => {
    const { user, post } = await seed();
    await Comment.create({ content: 'A', author: user._id, post: post._id });
    await Comment.create({ content: 'B', author: user._id, post: post._id });
    const res = await request(app).get(`/api/posts/${post._id}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments[0].content).toBe('A');
  });
});

describe('DELETE /api/comments/:id', () => {
  it('deletes comment, cascades children, and decrements commentCount for each', async () => {
    const { user, post, token } = await seed();
    const parent = await Comment.create({ content: 'Parent', author: user._id, post: post._id });
    const child = await Comment.create({
      content: 'Child', author: user._id, post: post._id,
      parent: parent._id, depth: 1,
    });
    await Post.findByIdAndUpdate(post._id, { commentCount: 2 });

    const res = await request(app)
      .delete(`/api/comments/${parent._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await Comment.findById(parent._id)).toBeNull();
    expect(await Comment.findById(child._id)).toBeNull();
    const updated = await Post.findById(post._id);
    expect(updated.commentCount).toBe(0);
  });

  it('returns 403 if not the author', async () => {
    const { post } = await seed();
    const other = await User.create({ email: 'o@test.com', username: 'other', verified: true });
    const comment = await Comment.create({
      content: 'Not yours', author: new mongoose.Types.ObjectId(), post: post._id,
    });
    const token = createToken(other._id);
    const res = await request(app)
      .delete(`/api/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/comments/:id/upvote', () => {
  it('toggles upvote on and off', async () => {
    const { user, post, token } = await seed();
    const comment = await Comment.create({ content: 'Vote me', author: user._id, post: post._id });
    const res1 = await request(app)
      .post(`/api/comments/${comment._id}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res1.status).toBe(200);
    expect(res1.body.upvotes).toBe(1);
    const res2 = await request(app)
      .post(`/api/comments/${comment._id}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.upvotes).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

Run from `backend/` directory:
```bash
npx jest src/features/comments/__tests__/comments.test.js --runInBand --forceExit
```
Expected: FAIL — "Comment Model" test may error, API tests fail with 404.

---

## Task 2: Implement comment model and full backend

**Files:**
- Modify: `backend/src/features/comments/comment.model.js`
- Create: `backend/src/features/comments/comments.controller.js`
- Create: `backend/src/features/comments/comments.routes.js`
- Modify: `backend/src/server.js`
- Modify: `backend/src/features/posts/posts.routes.js`

- [ ] **Step 1: Replace the stub model with the real schema**

Replace all content of `backend/src/features/comments/comment.model.js`:
```js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  depth: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
```

- [ ] **Step 2: Create the comments controller**

Create `backend/src/features/comments/comments.controller.js`:
```js
const Comment = require('./comment.model');
const Post = require('../posts/post.model');
const User = require('../auth/auth.model');
const Notification = require('../notifications/notification.model');

const createComment = async (req, res, next) => {
  try {
    const { content, postId, parentId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content required', code: 'VALIDATION_ERROR' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });

    let depth = 0;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ success: false, message: 'Parent comment not found', code: 'NOT_FOUND' });
      depth = parent.depth + 1;
    }

    const comment = await Comment.create({
      content: content.trim(),
      author: req.user.id,
      post: postId,
      parent: parentId || null,
      depth,
    });
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
    await comment.populate('author', 'username profilePicture');

    if (post.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        message: 'Someone commented on your post',
        postId: post._id,
      });
    }
    return res.status(201).json({ success: true, comment });
  } catch (err) { return next(err); }
};

const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'username profilePicture commentKarma');
    return res.json({ success: true, comments });
  } catch (err) { return next(err); }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your comment', code: 'FORBIDDEN' });
    }
    const postId = comment.post;
    const deleteSubtree = async (commentId) => {
      const children = await Comment.find({ parent: commentId });
      for (const child of children) await deleteSubtree(child._id);
      await Comment.findByIdAndDelete(commentId);
      await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
    };
    await deleteSubtree(comment._id);
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { return next(err); }
};

const upvoteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyUpvoted = comment.upvoters.map((id) => id.toString()).includes(userId);
    if (alreadyUpvoted) {
      comment.upvoters.pull(userId);
      comment.upvotes = Math.max(0, comment.upvotes - 1);
      await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: -1 } });
    } else {
      comment.downvoters.pull(userId);
      if (comment.downvoters.length < comment.downvotes) comment.downvotes = Math.max(0, comment.downvotes - 1);
      comment.upvoters.push(userId);
      comment.upvotes += 1;
      await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: 1 } });
    }
    await comment.save();
    return res.json({ success: true, upvotes: comment.upvotes, downvotes: comment.downvotes });
  } catch (err) { return next(err); }
};

const downvoteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyDownvoted = comment.downvoters.map((id) => id.toString()).includes(userId);
    if (alreadyDownvoted) {
      comment.downvoters.pull(userId);
      comment.downvotes = Math.max(0, comment.downvotes - 1);
    } else {
      comment.upvoters.pull(userId);
      if (comment.upvoters.length < comment.upvotes) {
        comment.upvotes = Math.max(0, comment.upvotes - 1);
        await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: -1 } });
      }
      comment.downvoters.push(userId);
      comment.downvotes += 1;
    }
    await comment.save();
    return res.json({ success: true, upvotes: comment.upvotes, downvotes: comment.downvotes });
  } catch (err) { return next(err); }
};

module.exports = { createComment, getComments, deleteComment, upvoteComment, downvoteComment };
```

- [ ] **Step 3: Create comments routes**

Create `backend/src/features/comments/comments.routes.js`:
```js
const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { createComment, deleteComment, upvoteComment, downvoteComment } = require('./comments.controller');

const router = express.Router();

router.post('/', verifyToken, createComment);
router.delete('/:id', verifyToken, deleteComment);
router.post('/:id/upvote', verifyToken, upvoteComment);
router.post('/:id/downvote', verifyToken, downvoteComment);

module.exports = router;
```

- [ ] **Step 4: Register comments routes in server.js**

In `backend/src/server.js`, add after the existing require statements and before `app.use(errorMiddleware)`:
```js
const commentsRoutes = require('./features/comments/comments.routes');
// ...
app.use('/api/comments', commentsRoutes);
```

The full updated server.js should look like:
```js
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

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  });
}

module.exports = app;
```

- [ ] **Step 5: Add GET /:id/comments to posts.routes.js**

In `backend/src/features/posts/posts.routes.js`, add the import and route. Add `getComments` to the existing imports and add the route before `router.get('/:id', getPost)`:
```js
const { createPost, getPost, getCommunityPosts, getFeed, deletePost, updatePost, updatePostStatus, upvotePost, downvotePost } = require('./posts.controller');
const { getComments } = require('../comments/comments.controller');
// ...
router.get('/:id/comments', getComments);
router.get('/:id', getPost);
```

The full updated `posts.routes.js`:
```js
const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../../middleware/auth.middleware');
const { uploadPost } = require('../../config/cloudinary');
const { createPost, getPost, getCommunityPosts, getFeed, deletePost, updatePost, updatePostStatus, upvotePost, downvotePost } = require('./posts.controller');
const { getComments } = require('../comments/comments.controller');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    } catch {}
  }
  next();
};

const router = express.Router();

router.get('/feed', optionalAuth, getFeed);
router.post('/', verifyToken, uploadPost.single('image'), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('community').notEmpty().withMessage('Community required'),
], createPost);
router.get('/:id/comments', getComments);
router.get('/:id', getPost);
router.patch('/:id/status', verifyToken, updatePostStatus);
router.patch('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/upvote', verifyToken, upvotePost);
router.post('/:id/downvote', verifyToken, downvotePost);

module.exports = router;
```

- [ ] **Step 6: Create stub search routes (needed for server.js to not crash)**

Create `backend/src/features/search/search.routes.js` (stub, will be replaced in Task 4):
```js
const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.json({ success: true, posts: [], communities: [], users: [] }));
module.exports = router;
```

- [ ] **Step 7: Run comment tests**

```bash
cd backend && npx jest src/features/comments/__tests__/comments.test.js --runInBand --forceExit
```
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/features/comments/ backend/src/server.js backend/src/features/posts/posts.routes.js backend/src/features/search/
git commit -m "feat: add comments feature - model, controller, routes, tests"
```

---

## Task 3: Write failing search tests

**Files:**
- Create: `backend/src/features/search/__tests__/search.test.js`

- [ ] **Step 1: Write the test file**

Create `backend/src/features/search/__tests__/search.test.js`:
```js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const Post = require('../../posts/post.model');
const User = require('../../auth/auth.model');
const Community = require('../../communities/community.model');
const Comment = require('../../comments/comment.model');

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'testsecret';
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
afterEach(async () => {
  await Post.deleteMany({});
  await User.deleteMany({});
  await Community.deleteMany({});
  await Comment.deleteMany({});
});

describe('GET /api/search', () => {
  it('returns empty arrays for blank query', async () => {
    const res = await request(app).get('/api/search?q=');
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(0);
    expect(res.body.communities).toHaveLength(0);
    expect(res.body.users).toHaveLength(0);
  });

  it('finds posts by title', async () => {
    const user = await User.create({ email: 's@test.com', username: 'searcher', verified: true });
    const comm = await Community.create({ name: 'scomm', description: 'test', creator: user._id });
    await Post.create({ title: 'Hello World Post', content: 'content', author: user._id, community: comm._id, status: 'published' });
    const res = await request(app).get('/api/search?q=hello');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThan(0);
    expect(res.body.posts[0].title).toMatch(/hello/i);
  });

  it('finds communities by name', async () => {
    const user = await User.create({ email: 'sc@test.com', username: 'scuser', verified: true });
    await Community.create({ name: 'reactjs', description: 'React community', creator: user._id });
    const res = await request(app).get('/api/search?q=react');
    expect(res.status).toBe(200);
    expect(res.body.communities.length).toBeGreaterThan(0);
    expect(res.body.communities[0].name).toMatch(/react/i);
  });

  it('finds users by username', async () => {
    await User.create({ email: 'su@test.com', username: 'johnsmith', verified: true });
    const res = await request(app).get('/api/search?q=john');
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThan(0);
    expect(res.body.users[0].username).toMatch(/john/i);
  });

  it('filters by type=posts only', async () => {
    const user = await User.create({ email: 'st@test.com', username: 'typed', verified: true });
    const comm = await Community.create({ name: 'typedcomm', description: 'test', creator: user._id });
    await Post.create({ title: 'Typed Post', content: 'c', author: user._id, community: comm._id, status: 'published' });
    const res = await request(app).get('/api/search?q=typed&type=posts');
    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeGreaterThan(0);
    expect(res.body.communities).toHaveLength(0);
    expect(res.body.users).toHaveLength(0);
  });
});

describe('GET /api/communities/name/:name', () => {
  it('finds community by name', async () => {
    const user = await User.create({ email: 'cn@test.com', username: 'cnuser', verified: true });
    await Community.create({ name: 'mycomm', description: 'My community', creator: user._id });
    const res = await request(app).get('/api/communities/name/mycomm');
    expect(res.status).toBe(200);
    expect(res.body.community.name).toBe('mycomm');
  });

  it('returns 404 for unknown name', async () => {
    const res = await request(app).get('/api/communities/name/doesnotexist');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/users/username/:username', () => {
  it('finds user by username', async () => {
    await User.create({ email: 'un@test.com', username: 'findme', verified: true });
    const res = await request(app).get('/api/users/username/findme');
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('findme');
  });

  it('returns 404 for unknown username', async () => {
    const res = await request(app).get('/api/users/username/ghost');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx jest src/features/search/__tests__/search.test.js --runInBand --forceExit
```
Expected: FAIL — search returns stubs, community/user by-name returns 404.

---

## Task 4: Implement search + supporting endpoints

**Files:**
- Modify: `backend/src/features/search/search.routes.js`
- Create: `backend/src/features/search/search.controller.js`
- Modify: `backend/src/features/communities/communities.controller.js`
- Modify: `backend/src/features/communities/communities.routes.js`
- Modify: `backend/src/features/users/users.controller.js`
- Modify: `backend/src/features/users/users.routes.js`

- [ ] **Step 1: Implement the search controller**

Create `backend/src/features/search/search.controller.js`:
```js
const Post = require('../posts/post.model');
const Community = require('../communities/community.model');
const User = require('../auth/auth.model');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all';
    if (!q) return res.json({ success: true, posts: [], communities: [], users: [] });

    const regex = { $regex: escapeRegex(q), $options: 'i' };

    const [posts, communities, users] = await Promise.all([
      (type === 'all' || type === 'posts')
        ? Post.find({ $or: [{ title: regex }, { content: regex }], status: 'published' })
            .populate('author', 'username profilePicture')
            .populate('community', 'name icon')
            .limit(10)
        : Promise.resolve([]),
      (type === 'all' || type === 'communities')
        ? Community.find({ $or: [{ name: regex }, { description: regex }] })
            .select('name description memberCount icon banner')
            .limit(10)
        : Promise.resolve([]),
      (type === 'all' || type === 'people')
        ? User.find({ username: regex })
            .select('username profilePicture postKarma commentKarma')
            .limit(10)
        : Promise.resolve([]),
    ]);

    return res.json({ success: true, posts, communities, users });
  } catch (err) { return next(err); }
};

module.exports = { search };
```

- [ ] **Step 2: Replace the stub search routes with the real implementation**

Replace `backend/src/features/search/search.routes.js`:
```js
const express = require('express');
const { search } = require('./search.controller');

const router = express.Router();
router.get('/', search);

module.exports = router;
```

- [ ] **Step 3: Add getCommunityByName to communities controller**

At the bottom of `backend/src/features/communities/communities.controller.js`, before `module.exports`, add:
```js
const getCommunityByName = async (req, res, next) => {
  try {
    const community = await Community.findOne({ name: req.params.name.toLowerCase() })
      .populate('creator', 'username');
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    }
    return res.json({ success: true, community });
  } catch (err) { return next(err); }
};
```

Add `getCommunityByName` to `module.exports` at the bottom of the same file.

- [ ] **Step 4: Register GET /name/:name in communities routes**

In `backend/src/features/communities/communities.routes.js`, add the import and register the route BEFORE `router.get('/:id', ...)`:

Add to imports:
```js
const { createCommunity, getCommunity, listCommunities, searchCommunities, joinCommunity, leaveCommunity, getFlairs, createFlair, getPendingPosts, getCommunityByName } = require('./communities.controller');
```

Add route before `router.get('/:id', ...)`:
```js
router.get('/name/:name', getCommunityByName);
```

- [ ] **Step 5: Add getUserByUsername, getUserPosts, getUserComments to users controller**

At the bottom of `backend/src/features/users/users.controller.js`, before `module.exports`, add:
```js
const getUserByUsername = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .select('-otp -otpExpiry -email -fcmToken -refreshTokens');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
    }
    return res.json({ success: true, user });
  } catch (err) { return next(err); }
};

const getUserPosts = async (req, res, next) => {
  try {
    const Post = require('../posts/post.model');
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
    }
    const posts = await Post.find({ author: user._id, status: 'published' })
      .sort({ createdAt: -1 })
      .populate('author', 'username profilePicture')
      .populate('community', 'name icon')
      .limit(20);
    return res.json({ success: true, posts });
  } catch (err) { return next(err); }
};

const getUserComments = async (req, res, next) => {
  try {
    const Comment = require('../comments/comment.model');
    const user = await User.findOne({ username: req.params.username.toLowerCase() }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
    }
    const comments = await Comment.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate('post', 'title')
      .limit(20);
    return res.json({ success: true, comments });
  } catch (err) { return next(err); }
};
```

Add `getUserByUsername`, `getUserPosts`, `getUserComments` to `module.exports`.

- [ ] **Step 6: Register new user routes**

In `backend/src/features/users/users.routes.js`, add imports and register the three new routes BEFORE `router.get('/:id', ...)`:

```js
const { getProfile, updateProfile, searchUsers, getSavedPosts, savePost, unsavePost, getUserByUsername, getUserPosts, getUserComments } = require('./users.controller');
```

Add these routes before `router.get('/:id', ...)`:
```js
router.get('/username/:username', getUserByUsername);
router.get('/:username/posts', getUserPosts);
router.get('/:username/comments', getUserComments);
```

- [ ] **Step 7: Run search tests**

```bash
cd backend && npx jest src/features/search/__tests__/search.test.js --runInBand --forceExit
```
Expected: All tests PASS.

- [ ] **Step 8: Run all backend tests to check for regressions**

```bash
cd backend && npm test
```
Expected: All test suites PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/features/search/ backend/src/features/communities/ backend/src/features/users/
git commit -m "feat: add search endpoint, community by name, user by username, user posts/comments endpoints"
```

---

## Task 5: Frontend API layer

**Files:**
- Create: `frontend/src/api/comments.js`
- Create: `frontend/src/api/search.js`
- Modify: `frontend/src/api/communities.js`
- Modify: `frontend/src/api/users.js`
- Modify: `frontend/src/api/posts.js`

- [ ] **Step 1: Create comments API file**

Create `frontend/src/api/comments.js`:
```js
import { fetchWithAuth } from './auth';

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function getComments(postId) {
  const res = await fetch(`/api/posts/${postId}/comments`);
  return parseResponse(res);
}

export async function createComment({ content, postId, parentId }) {
  return fetchWithAuth('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, postId, parentId }),
  });
}

export async function deleteComment(id) {
  return fetchWithAuth(`/api/comments/${id}`, { method: 'DELETE' });
}

export async function upvoteComment(id) {
  return fetchWithAuth(`/api/comments/${id}/upvote`, { method: 'POST' });
}

export async function downvoteComment(id) {
  return fetchWithAuth(`/api/comments/${id}/downvote`, { method: 'POST' });
}
```

- [ ] **Step 2: Create search API file**

Create `frontend/src/api/search.js`:
```js
async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error (${res.status})` }; }
}

export async function search(q, type = 'all') {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
  return parseResponse(res);
}
```

- [ ] **Step 3: Add getCommunityByName and getCommunityPosts to communities.js**

Add to the bottom of `frontend/src/api/communities.js` (before the end of file):
```js
export async function getCommunityByName(name) {
  const res = await fetch(`/api/communities/name/${encodeURIComponent(name)}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}

export async function getCommunityPosts(id, sort = 'new') {
  const res = await fetch(`/api/communities/${id}/posts?sort=${sort}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { success: false }; }
}
```

- [ ] **Step 4: Add getUserByUsername, getUserPosts, getUserComments to users.js**

Add to the bottom of `frontend/src/api/users.js`:
```js
export async function getUserByUsername(username) {
  const res = await fetch(`/api/users/username/${encodeURIComponent(username)}`);
  return parseResponse(res);
}

export async function getUserPosts(username) {
  const res = await fetch(`/api/users/${encodeURIComponent(username)}/posts`);
  return parseResponse(res);
}

export async function getUserComments(username) {
  const res = await fetch(`/api/users/${encodeURIComponent(username)}/comments`);
  return parseResponse(res);
}
```

- [ ] **Step 5: Add getPost to posts.js**

Add to the bottom of `frontend/src/api/posts.js`:
```js
export async function getPost(id) {
  const res = await fetch(`/api/posts/${id}`);
  return parseResponse(res);
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: add frontend API functions for comments, search, community/user by name"
```

---

## Task 6: Shared Layout component

**Files:**
- Create: `frontend/src/components/Layout.jsx`

The Layout wraps all pages that need the navbar (everything except auth pages). It reads auth state, provides navigation to /home, /search, and user profile, and renders the Reddit-style top nav.

- [ ] **Step 1: Create Layout.jsx**

Create `frontend/src/components/Layout.jsx`:
```jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, logout } from '../api/auth';

const RedditLogo = () => (
  <svg width="32" height="32" viewBox="0 0 20 20" style={{ cursor: 'pointer' }}>
    <circle cx="10" cy="10" r="10" fill="#ff4500"/>
    <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
  </svg>
);

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe().then(data => { if (data.success) setCurrentUser(data.user); });
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('accessToken');
    navigate('/Login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#dae0e6' }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#fff', borderBottom: '1px solid #edeff1',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 48,
      }}>
        <div onClick={() => navigate('/home')} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <RedditLogo />
          <span style={{ fontWeight: 700, fontSize: 18, color: '#1c1c1c' }}>reddit</span>
        </div>
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 690, margin: '0 auto' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Reddit"
            style={{
              width: '100%', padding: '6px 16px', border: '1px solid #edeff1',
              borderRadius: 20, background: '#f6f7f8', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {currentUser ? (
            <>
              <span
                onClick={() => navigate(`/u/${currentUser.username}`)}
                style={{ cursor: 'pointer', fontSize: 14, color: '#1c1c1c', fontWeight: 500 }}
              >
                u/{currentUser.username}
              </span>
              <button onClick={handleLogout} style={{
                padding: '4px 16px', border: '1px solid #0079d3', borderRadius: 20,
                background: 'transparent', color: '#0079d3', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}>Log Out</button>
            </>
          ) : (
            <button onClick={() => navigate('/Login')} style={{
              padding: '4px 16px', border: 'none', borderRadius: 20,
              background: '#ff4500', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            }}>Log In</button>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add shared Layout component with navbar and search"
```

---

## Task 7: PostDetailPage

**Files:**
- Create: `frontend/src/pages/PostDetailPage.jsx`

- [ ] **Step 1: Create PostDetailPage.jsx**

Create `frontend/src/pages/PostDetailPage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getPost, upvotePost, downvotePost } from '../api/posts';
import { getComments, createComment, deleteComment, upvoteComment, downvoteComment } from '../api/comments';
import { getMe } from '../api/auth';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function buildTree(comments) {
  const map = {};
  const roots = [];
  comments.forEach(c => { map[c._id] = { ...c, children: [] }; });
  comments.forEach(c => {
    if (c.parent && map[c.parent]) {
      map[c.parent].children.push(map[c._id]);
    } else {
      roots.push(map[c._id]);
    }
  });
  return roots;
}

function Comment({ comment, currentUser, postId, onCommentAdded, onDeleted, depth = 0 }) {
  const [votes, setVotes] = useState({ up: comment.upvotes, down: comment.downvotes });
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpvote = async () => {
    if (!currentUser) return;
    const data = await upvoteComment(comment._id);
    if (data.success) setVotes({ up: data.upvotes, down: data.downvotes });
  };

  const handleDownvote = async () => {
    if (!currentUser) return;
    const data = await downvoteComment(comment._id);
    if (data.success) setVotes({ up: data.upvotes, down: data.downvotes });
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    const data = await createComment({ content: replyText, postId, parentId: comment._id });
    if (data.success) {
      setReplyText('');
      setShowReply(false);
      onCommentAdded();
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    const data = await deleteComment(comment._id);
    if (data.success) onDeleted();
  };

  const indent = Math.min(depth, 6) * 16;

  return (
    <div style={{ marginLeft: indent, borderLeft: depth > 0 ? '2px solid #edeff1' : 'none', paddingLeft: depth > 0 ? 12 : 0, marginBottom: 8 }}>
      <div style={{ background: '#fff', borderRadius: 4, padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 12, color: '#878a8c' }}>
          <Link to={`/u/${comment.author?.username}`} style={{ color: '#0079d3', fontWeight: 700, textDecoration: 'none' }}>
            u/{comment.author?.username}
          </Link>
          <span>{comment.author?.commentKarma ?? 0} karma</span>
          <span>•</span>
          <span>{timeAgo(comment.createdAt)}</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.5 }}>{comment.content}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#878a8c' }}>
          <button onClick={handleUpvote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#878a8c', fontWeight: 700 }}>
            ▲ {votes.up}
          </button>
          <button onClick={handleDownvote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#878a8c', fontWeight: 700 }}>
            ▼ {votes.down}
          </button>
          {currentUser && (
            <button onClick={() => setShowReply(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#878a8c', fontWeight: 700 }}>
              Reply
            </button>
          )}
          {currentUser?._id === comment.author?._id && (
            <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4500', fontWeight: 700 }}>
              Delete
            </button>
          )}
        </div>
        {showReply && (
          <form onSubmit={handleReply} style={{ marginTop: 8 }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="What are your thoughts?"
              rows={3}
              style={{ width: '100%', padding: 8, border: '1px solid #edeff1', borderRadius: 4, resize: 'vertical', fontSize: 14, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={submitting || !replyText.trim()} style={{
                padding: '4px 16px', border: 'none', borderRadius: 20,
                background: '#ff4500', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>
                {submitting ? 'Saving…' : 'Reply'}
              </button>
              <button type="button" onClick={() => setShowReply(false)} style={{
                padding: '4px 16px', border: '1px solid #edeff1', borderRadius: 20,
                background: 'none', cursor: 'pointer', fontSize: 12,
              }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
      {comment.children?.map(child => (
        <Comment
          key={child._id}
          comment={child}
          currentUser={currentUser}
          postId={postId}
          onCommentAdded={onCommentAdded}
          onDeleted={onDeleted}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [commentTree, setCommentTree] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState({ up: 0, down: 0 });

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
    load();
  }, [id]);

  async function load() {
    const [postData, commentsData] = await Promise.all([getPost(id), getComments(id)]);
    if (postData.success) {
      setPost(postData.post);
      setVotes({ up: postData.post.upvotes, down: postData.post.downvotes });
    }
    if (commentsData.success) setCommentTree(buildTree(commentsData.comments));
  }

  const handleUpvote = async () => {
    if (!currentUser) return;
    const data = await upvotePost(id);
    if (data.success) setVotes({ up: data.upvotes, down: data.downvotes });
  };

  const handleDownvote = async () => {
    if (!currentUser) return;
    const data = await downvotePost(id);
    if (data.success) setVotes({ up: data.upvotes, down: data.downvotes });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    const data = await createComment({ content: newComment, postId: id });
    if (data.success) { setNewComment(''); load(); }
    setSubmitting(false);
  };

  if (!post) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>Loading…</div></Layout>;

  return (
    <Layout>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '20px 16px' }}>
        {/* Post */}
        <div style={{ background: '#fff', borderRadius: 4, padding: 16, marginBottom: 16, border: '1px solid #ccc' }}>
          <div style={{ fontSize: 12, color: '#878a8c', marginBottom: 8 }}>
            Posted by{' '}
            <Link to={`/u/${post.author?.username}`} style={{ color: '#0079d3', textDecoration: 'none' }}>
              u/{post.author?.username}
            </Link>{' '}
            in{' '}
            <Link to={`/r/${post.community?.name}`} style={{ color: '#0079d3', fontWeight: 700, textDecoration: 'none' }}>
              r/{post.community?.name}
            </Link>{' '}
            • {timeAgo(post.createdAt)}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>{post.title}</h1>
          {post.content && <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>{post.content}</p>}
          {post.image && <img src={post.image} alt="" style={{ maxWidth: '100%', borderRadius: 4, marginBottom: 12 }} />}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={handleUpvote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4500', fontWeight: 700, fontSize: 16 }}>▲</button>
              <span style={{ fontWeight: 700 }}>{votes.up - votes.down}</span>
              <button onClick={handleDownvote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7193ff', fontWeight: 700, fontSize: 16 }}>▼</button>
            </div>
            <span style={{ fontSize: 12, color: '#878a8c' }}>{post.commentCount} comments</span>
          </div>
        </div>

        {/* Comment form */}
        {currentUser ? (
          <form onSubmit={handleCommentSubmit} style={{ background: '#fff', borderRadius: 4, padding: 16, marginBottom: 16, border: '1px solid #ccc' }}>
            <p style={{ fontSize: 12, marginBottom: 8 }}>
              Comment as <Link to={`/u/${currentUser.username}`} style={{ color: '#0079d3', textDecoration: 'none' }}>u/{currentUser.username}</Link>
            </p>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="What are your thoughts?"
              rows={4}
              style={{ width: '100%', padding: 8, border: '1px solid #edeff1', borderRadius: 4, resize: 'vertical', fontSize: 14, boxSizing: 'border-box' }}
            />
            <button type="submit" disabled={submitting || !newComment.trim()} style={{
              marginTop: 8, padding: '6px 20px', border: 'none', borderRadius: 20,
              background: '#ff4500', color: '#fff', cursor: 'pointer', fontWeight: 700,
            }}>
              {submitting ? 'Saving…' : 'Comment'}
            </button>
          </form>
        ) : (
          <div style={{ background: '#fff', borderRadius: 4, padding: 16, marginBottom: 16, border: '1px solid #ccc', textAlign: 'center' }}>
            <Link to="/Login" style={{ color: '#0079d3' }}>Log in</Link> to comment.
          </div>
        )}

        {/* Comments */}
        {commentTree.length === 0 ? (
          <div style={{ color: '#878a8c', textAlign: 'center', padding: 24 }}>No comments yet. Be the first!</div>
        ) : (
          commentTree.map(comment => (
            <Comment
              key={comment._id}
              comment={comment}
              currentUser={currentUser}
              postId={id}
              onCommentAdded={load}
              onDeleted={load}
              depth={0}
            />
          ))
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PostDetailPage.jsx
git commit -m "feat: add PostDetailPage with nested comments"
```

---

## Task 8: CommunityPage

**Files:**
- Create: `frontend/src/pages/CommunityPage.jsx`

- [ ] **Step 1: Create CommunityPage.jsx**

Create `frontend/src/pages/CommunityPage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getCommunityByName, getCommunityPosts, joinCommunity, leaveCommunity } from '../api/communities';
import { getMe } from '../api/auth';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatScore(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n;
}

export default function CommunityPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [sort, setSort] = useState('new');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
  }, []);

  useEffect(() => { loadCommunity(); }, [name]);
  useEffect(() => { if (community) loadPosts(); }, [community, sort]);

  async function loadCommunity() {
    setLoading(true);
    const data = await getCommunityByName(name);
    if (data.success) {
      setCommunity(data.community);
      const userId = localStorage.getItem('accessToken') ? (await (await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      })).json()).user?._id : null;
      setJoined(data.community.members?.some(m => m === userId || m?._id === userId) ?? false);
    }
    setLoading(false);
  }

  async function loadPosts() {
    const data = await getCommunityPosts(community._id, sort);
    if (data.success) setPosts(data.posts);
  }

  const handleJoinLeave = async () => {
    if (!currentUser) return navigate('/Login');
    if (joined) {
      await leaveCommunity(community._id);
      setJoined(false);
      setCommunity(c => ({ ...c, memberCount: c.memberCount - 1 }));
    } else {
      await joinCommunity(community._id);
      setJoined(true);
      setCommunity(c => ({ ...c, memberCount: c.memberCount + 1 }));
    }
  };

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>Loading…</div></Layout>;
  if (!community) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>Community not found.</div></Layout>;

  return (
    <Layout>
      {/* Banner */}
      <div style={{ height: 80, background: community.banner ? `url(${community.banner}) center/cover` : '#ff4500' }} />
      <div style={{ background: '#fff', borderBottom: '1px solid #edeff1', padding: '0 20px 12px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', border: '4px solid #fff',
            background: community.icon ? `url(${community.icon}) center/cover` : '#ff4500',
            marginTop: -20, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '4px 0 2px', fontSize: 28, fontWeight: 700 }}>r/{community.name}</h1>
            <span style={{ fontSize: 14, color: '#878a8c' }}>{community.memberCount?.toLocaleString()} members</span>
          </div>
          <button onClick={handleJoinLeave} style={{
            padding: '6px 24px', border: joined ? '1px solid #0079d3' : 'none',
            borderRadius: 20, background: joined ? 'transparent' : '#ff4500',
            color: joined ? '#0079d3' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          }}>
            {joined ? 'Joined' : 'Join'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', display: 'flex', gap: 24 }}>
        {/* Posts feed */}
        <div style={{ flex: 1 }}>
          {/* Sort tabs */}
          <div style={{ background: '#fff', borderRadius: 4, padding: '8px 12px', marginBottom: 16, display: 'flex', gap: 8 }}>
            {['new', 'top', 'hot'].map(s => (
              <button key={s} onClick={() => setSort(s)} style={{
                padding: '6px 16px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: sort === s ? '#edeff1' : 'transparent', color: sort === s ? '#0079d3' : '#878a8c',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#878a8c', padding: 40 }}>No posts yet.</div>
          ) : posts.map(post => (
            <div key={post._id} style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 8, border: '1px solid #ccc' }}>
              <div style={{ fontSize: 12, color: '#878a8c', marginBottom: 4 }}>
                Posted by <Link to={`/u/${post.author?.username}`} style={{ color: '#0079d3', textDecoration: 'none' }}>u/{post.author?.username}</Link>
                {' '}• {timeAgo(post.createdAt)}
              </div>
              <Link to={`/post/${post._id}`} style={{ textDecoration: 'none', color: '#1c1c1c' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{post.title}</h3>
              </Link>
              {post.content && <p style={{ fontSize: 14, margin: '0 0 8px', color: '#878a8c', overflow: 'hidden', maxHeight: 40 }}>{post.content}</p>}
              <div style={{ fontSize: 12, color: '#878a8c' }}>
                ▲ {formatScore(post.upvotes - post.downvotes)} •{' '}
                <Link to={`/post/${post._id}`} style={{ color: '#878a8c', textDecoration: 'none' }}>
                  {post.commentCount} comments
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <aside style={{ width: 312, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 4, padding: 16, border: '1px solid #ccc' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>About r/{community.name}</h3>
            <p style={{ fontSize: 14, color: '#1c1c1c', marginBottom: 12 }}>{community.description}</p>
            <div style={{ fontSize: 12, color: '#878a8c', marginBottom: 12 }}>
              {community.memberCount?.toLocaleString()} Members
            </div>
            {community.rules && (
              <>
                <h4 style={{ margin: '12px 0 4px', fontSize: 13 }}>Rules</h4>
                <p style={{ fontSize: 13, color: '#1c1c1c', whiteSpace: 'pre-wrap' }}>{community.rules}</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/CommunityPage.jsx
git commit -m "feat: add CommunityPage with posts, join/leave, sort tabs"
```

---

## Task 9: ProfilePage

**Files:**
- Create: `frontend/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Create ProfilePage.jsx**

Create `frontend/src/pages/ProfilePage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUserByUsername, getUserPosts, getUserComments, updateProfile } from '../api/users';
import { getMe } from '../api/auth';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function cakeDay(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState(null);
  const [comments, setComments] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
  }, []);

  useEffect(() => {
    setLoading(true);
    setPosts(null);
    setComments(null);
    setTab('posts');
    getUserByUsername(username).then(d => {
      if (d.success) { setUser(d.user); setBio(d.user.bio || ''); }
      setLoading(false);
    });
  }, [username]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'posts' && posts === null) {
      getUserPosts(username).then(d => { if (d.success) setPosts(d.posts); });
    }
    if (tab === 'comments' && comments === null) {
      getUserComments(username).then(d => { if (d.success) setComments(d.comments); });
    }
  }, [tab, user]);

  const handleSave = async () => {
    setSaving(true);
    const data = await updateProfile(currentUser._id, { bio });
    if (data.success) { setUser(u => ({ ...u, bio: data.user.bio })); setEditing(false); }
    setSaving(false);
  };

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>Loading…</div></Layout>;
  if (!user) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>User not found.</div></Layout>;

  const isOwnProfile = currentUser?.username === user.username;
  const totalKarma = (user.postKarma || 0) + (user.commentKarma || 0);

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px', display: 'flex', gap: 24 }}>
        {/* Main */}
        <div style={{ flex: 1 }}>
          {/* Tabs */}
          <div style={{ background: '#fff', borderRadius: 4, padding: '8px 12px', marginBottom: 16, display: 'flex', gap: 8, border: '1px solid #ccc' }}>
            {['posts', 'comments'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                background: tab === t ? '#edeff1' : 'transparent', color: tab === t ? '#0079d3' : '#878a8c',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'posts' && (
            posts === null ? <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div> :
            posts.length === 0 ? <div style={{ textAlign: 'center', color: '#878a8c', padding: 40 }}>No posts yet.</div> :
            posts.map(post => (
              <div key={post._id} style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 8, border: '1px solid #ccc' }}>
                <div style={{ fontSize: 12, color: '#878a8c', marginBottom: 4 }}>
                  <Link to={`/r/${post.community?.name}`} style={{ color: '#0079d3', fontWeight: 700, textDecoration: 'none' }}>
                    r/{post.community?.name}
                  </Link>{' '}• {timeAgo(post.createdAt)}
                </div>
                <Link to={`/post/${post._id}`} style={{ textDecoration: 'none', color: '#1c1c1c' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{post.title}</h3>
                </Link>
                <div style={{ fontSize: 12, color: '#878a8c' }}>
                  ▲ {post.upvotes - post.downvotes} • {post.commentCount} comments
                </div>
              </div>
            ))
          )}

          {tab === 'comments' && (
            comments === null ? <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div> :
            comments.length === 0 ? <div style={{ textAlign: 'center', color: '#878a8c', padding: 40 }}>No comments yet.</div> :
            comments.map(comment => (
              <div key={comment._id} style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 8, border: '1px solid #ccc' }}>
                <div style={{ fontSize: 12, color: '#878a8c', marginBottom: 4 }}>
                  Commented on{' '}
                  <Link to={`/post/${comment.post?._id}`} style={{ color: '#0079d3', textDecoration: 'none' }}>
                    {comment.post?.title}
                  </Link>
                  {' '}• {timeAgo(comment.createdAt)}
                </div>
                <p style={{ margin: 0, fontSize: 14 }}>{comment.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ width: 312, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 4, padding: 16, border: '1px solid #ccc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: user.profilePicture ? `url(${user.profilePicture}) center/cover` : '#ff4500',
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>u/{user.username}</div>
                <div style={{ fontSize: 12, color: '#878a8c' }}>{totalKarma.toLocaleString()} karma</div>
              </div>
            </div>
            {editing ? (
              <>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows={3}
                  maxLength={500}
                  style={{ width: '100%', padding: 8, border: '1px solid #edeff1', borderRadius: 4, resize: 'vertical', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '4px 16px', border: 'none', borderRadius: 20,
                    background: '#ff4500', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{
                    padding: '4px 16px', border: '1px solid #edeff1', borderRadius: 20,
                    background: 'none', cursor: 'pointer', fontSize: 13,
                  }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#1c1c1c', marginBottom: 12 }}>{user.bio || 'No bio yet.'}</p>
                {isOwnProfile && (
                  <button onClick={() => setEditing(true)} style={{
                    width: '100%', padding: '6px', border: '1px solid #0079d3', borderRadius: 20,
                    background: 'transparent', color: '#0079d3', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginBottom: 8,
                  }}>Edit Profile</button>
                )}
              </>
            )}
            <div style={{ fontSize: 12, color: '#878a8c', borderTop: '1px solid #edeff1', paddingTop: 8 }}>
              <div>🎂 Cake day: {cakeDay(user.createdAt)}</div>
              <div>📝 Post karma: {(user.postKarma || 0).toLocaleString()}</div>
              <div>💬 Comment karma: {(user.commentKarma || 0).toLocaleString()}</div>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ProfilePage.jsx
git commit -m "feat: add ProfilePage with karma, cake day, posts/comments tabs, and edit bio"
```

---

## Task 10: SearchPage + App.jsx routing + PostCard nav links

**Files:**
- Create: `frontend/src/pages/SearchPage.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create SearchPage.jsx**

Create `frontend/src/pages/SearchPage.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { search } from '../api/search';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [tab, setTab] = useState('posts');
  const [results, setResults] = useState({ posts: [], communities: [], users: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    search(q).then(data => {
      if (data.success) setResults({ posts: data.posts, communities: data.communities, users: data.users });
      setLoading(false);
    });
  }, [q]);

  return (
    <Layout>
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '20px 16px' }}>
        <h2 style={{ marginBottom: 16, fontSize: 18 }}>Search results for "{q}"</h2>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 4, padding: '8px 12px', marginBottom: 16, display: 'flex', gap: 8, border: '1px solid #ccc' }}>
          {[
            { key: 'posts', label: `Posts (${results.posts.length})` },
            { key: 'communities', label: `Communities (${results.communities.length})` },
            { key: 'people', label: `People (${results.users.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '6px 16px', border: 'none', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: tab === key ? '#edeff1' : 'transparent', color: tab === key ? '#0079d3' : '#878a8c',
            }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40 }}>Searching…</div> : (
          <>
            {tab === 'posts' && (
              results.posts.length === 0
                ? <div style={{ textAlign: 'center', color: '#878a8c', padding: 40 }}>No posts found.</div>
                : results.posts.map(post => (
                  <div key={post._id} style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 8, border: '1px solid #ccc' }}>
                    <div style={{ fontSize: 12, color: '#878a8c', marginBottom: 4 }}>
                      <Link to={`/r/${post.community?.name}`} style={{ color: '#0079d3', fontWeight: 700, textDecoration: 'none' }}>
                        r/{post.community?.name}
                      </Link>
                      {' '}• Posted by <Link to={`/u/${post.author?.username}`} style={{ color: '#0079d3', textDecoration: 'none' }}>
                        u/{post.author?.username}
                      </Link>
                      {' '}• {timeAgo(post.createdAt)}
                    </div>
                    <Link to={`/post/${post._id}`} style={{ textDecoration: 'none', color: '#1c1c1c' }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{post.title}</h3>
                    </Link>
                    <div style={{ fontSize: 12, color: '#878a8c' }}>
                      ▲ {post.upvotes - post.downvotes} • {post.commentCount} comments
                    </div>
                  </div>
                ))
            )}

            {tab === 'communities' && (
              results.communities.length === 0
                ? <div style={{ textAlign: 'center', color: '#878a8c', padding: 40 }}>No communities found.</div>
                : results.communities.map(comm => (
                  <Link key={comm._id} to={`/r/${comm.name}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 8, border: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: comm.icon ? `url(${comm.icon}) center/cover` : '#ff4500', flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#1c1c1c' }}>r/{comm.name}</div>
                        <div style={{ fontSize: 12, color: '#878a8c' }}>{comm.memberCount?.toLocaleString()} members</div>
                        <div style={{ fontSize: 13, color: '#878a8c' }}>{comm.description}</div>
                      </div>
                    </div>
                  </Link>
                ))
            )}

            {tab === 'people' && (
              results.users.length === 0
                ? <div style={{ textAlign: 'center', color: '#878a8c', padding: 40 }}>No people found.</div>
                : results.users.map(u => (
                  <Link key={u._id} to={`/u/${u.username}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: '#fff', borderRadius: 4, padding: 12, marginBottom: 8, border: '1px solid #ccc', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: u.profilePicture ? `url(${u.profilePicture}) center/cover` : '#0079d3', flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#1c1c1c' }}>u/{u.username}</div>
                        <div style={{ fontSize: 12, color: '#878a8c' }}>
                          {((u.postKarma || 0) + (u.commentKarma || 0)).toLocaleString()} karma
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Update App.jsx with 4 new routes**

Replace `frontend/src/App.jsx` with:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EmailPage from './pages/EmailPage';
import OtpPage from './pages/OtpPage';
import InterestsPage from './pages/InterestsPage';
import HomePage from './pages/HomePage';
import SubmitPage from './pages/SubmitPage';
import PostDetailPage from './pages/PostDetailPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  return token ? children : <Navigate to="/Login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/Login" element={<EmailPage />} />
        <Route path="/verify-otp" element={<OtpPage />} />
        <Route path="/interests" element={<InterestsPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <SubmitPage />
            </ProtectedRoute>
          }
        />
        <Route path="/post/:id" element={<PostDetailPage />} />
        <Route path="/r/:name" element={<CommunityPage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/Login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Wire PostCard navigation links in HomePage.jsx**

In `frontend/src/pages/HomePage.jsx`, find the `PostCard` component and add `useNavigate` navigation for post title, community name, and author. Locate the JSX rendering the post title (look for the `<h3>` or `<div>` with `post.title`) and wrap it with a click handler or Link that navigates to `/post/${post._id}`. Do the same for `r/${community.name}` → `/r/${post.community?.name}` and `u/${author}` → `/u/${post.author?.username}`.

Add `import { Link } from 'react-router-dom';` at the top of `HomePage.jsx` if not already imported, then update the PostCard return JSX so that:
- The post title becomes: `<Link to={`/post/${post._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{post.title}</Link>`
- The community name becomes: `<Link to={`/r/${post.community?.name}`} style={{ color: '#0079d3', textDecoration: 'none' }}>r/{post.community?.name}</Link>`
- The author username becomes: `<Link to={`/u/${post.author?.username}`} style={{ color: '#0079d3', textDecoration: 'none' }}>u/{post.author?.username}</Link>`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/SearchPage.jsx frontend/src/App.jsx frontend/src/pages/HomePage.jsx
git commit -m "feat: add SearchPage, update App routing, wire PostCard nav links"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Comment model ✓, comment CRUD routes ✓, `GET /posts/:id/comments` ✓, cascade delete ✓, upvote/downvote comments ✓, `GET /communities/name/:name` ✓, `GET /users/username/:username` ✓, `GET /users/:username/posts` ✓, `GET /users/:username/comments` ✓, unified search ✓, PostDetailPage ✓, CommunityPage ✓, ProfilePage ✓, SearchPage ✓, navbar wiring ✓, PostCard nav links ✓
- [x] **No placeholders:** All steps have complete code.
- [x] **Type consistency:** `createComment({ content, postId, parentId })` used consistently in Task 5 and Task 7. `upvoteComment(id)` / `downvoteComment(id)` consistent across Task 5 and Task 7. `getCommunityByName(name)` consistent across Task 5 and Task 8. `getUserByUsername(username)`, `getUserPosts(username)`, `getUserComments(username)` consistent across Task 5 and Task 9.
