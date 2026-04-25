# Backend Posts, Comments & Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement post and comment CRUD with voting, image uploads via Cloudinary, and a personalized feed algorithm.

**Architecture:** Two feature modules — `posts/` and `comments/`. Feed logic lives in posts controller. Voting is toggle-based (upvote again = remove vote). Karma updates on the User model on every vote action.

**Tech Stack:** Express, Mongoose, Cloudinary (multer), express-validator, Jest, Supertest, mongodb-memory-server

**Prerequisite:** `backend-setup-auth` and `backend-communities-users` plans complete.

---

## File Structure

```
backend/src/features/
├── posts/
│   ├── post.model.js            # Post Mongoose model
│   ├── posts.controller.js      # create, getOne, getCommunityPosts, getFeed, deletePost, upvote, downvote
│   ├── posts.routes.js
│   └── __tests__/
│       └── posts.test.js
└── comments/
    ├── comment.model.js         # Comment Mongoose model
    ├── comments.controller.js   # create, deleteComment, upvote
    ├── comments.routes.js
    └── __tests__/
        └── comments.test.js
```

---

### Task 1: Post Model

**Files:**
- Create: `backend/src/features/posts/post.model.js`

- [ ] **Step 1: Write failing test**

```javascript
// backend/src/features/posts/__tests__/posts.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Post = require('../post.model');

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRES_IN = '7d';
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
afterEach(async () => { await Post.deleteMany({}); });

describe('Post Model', () => {
  it('creates post with required fields', async () => {
    const post = await Post.create({
      title: 'Test post',
      content: 'Hello world',
      author: new mongoose.Types.ObjectId(),
      community: new mongoose.Types.ObjectId(),
    });
    expect(post.upvotes).toBe(0);
    expect(post.downvotes).toBe(0);
    expect(post.commentCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=posts.test.js -t "Post Model"
```
Expected: FAIL

- [ ] **Step 3: Create post.model.js**

```javascript
// backend/src/features/posts/post.model.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  content: { type: String, default: '' },
  image: { type: String, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  flair: { type: String, default: '' },
  tags: [{ type: String }],
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=posts.test.js -t "Post Model"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/posts/post.model.js backend/src/features/posts/__tests__/posts.test.js
git commit -m "feat: add Post model"
```

---

### Task 2: Create & Get Post Endpoints

**Files:**
- Create: `backend/src/features/posts/posts.controller.js`
- Create: `backend/src/features/posts/posts.routes.js`

- [ ] **Step 1: Write failing tests**

Add to `backend/src/features/posts/__tests__/posts.test.js`:
```javascript
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const Community = require('../../communities/community.model');
const { createToken } = require('../../auth/auth.utils');

afterEach(async () => {
  await User.deleteMany({});
  await Community.deleteMany({});
  await Post.deleteMany({});
});

describe('POST /api/posts', () => {
  it('creates a post in a community the user is a member of', async () => {
    const user = await User.create({ email: 'p@test.com', username: 'poster', verified: true });
    const community = await Community.create({
      name: 'testcomm', description: 'test', creator: user._id, members: [user._id],
    });
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My post', content: 'Post content', community: community._id });
    expect(res.status).toBe(201);
    expect(res.body.post.title).toBe('My post');
  });

  it('returns 403 if user is not a member', async () => {
    const user = await User.create({ email: 'np@test.com', username: 'nonmember', verified: true });
    const community = await Community.create({ name: 'private', description: 'test', creator: new mongoose.Types.ObjectId() });
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My post', content: 'Post content', community: community._id });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_MEMBER');
  });
});

describe('GET /api/posts/:id', () => {
  it('returns post with populated author and community', async () => {
    const user = await User.create({ email: 'g@test.com', username: 'getter' });
    const community = await Community.create({ name: 'getcomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'Get me', content: 'content', author: user._id, community: community._id });
    const res = await request(app).get(`/api/posts/${post._id}`);
    expect(res.status).toBe(200);
    expect(res.body.post.author.username).toBe('getter');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=posts.test.js -t "POST /api/posts"
```
Expected: FAIL

- [ ] **Step 3: Create posts.controller.js**

```javascript
// backend/src/features/posts/posts.controller.js
const Post = require('./post.model');
const Community = require('../communities/community.model');
const User = require('../auth/auth.model');

const createPost = async (req, res, next) => {
  try {
    const { title, content, community: communityId, flair, tags } = req.body;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    if (!community.members.map(id => id.toString()).includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You must join this community to post', code: 'NOT_MEMBER' });
    }
    const post = await Post.create({
      title, content, flair, tags: tags || [],
      image: req.file ? req.file.path : '',
      author: req.user.id,
      community: communityId,
    });
    await post.populate('author', 'username profilePicture');
    await post.populate('community', 'name');
    res.status(201).json({ success: true, post });
  } catch (err) { next(err); }
};

const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username profilePicture')
      .populate('community', 'name icon');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    res.json({ success: true, post });
  } catch (err) { next(err); }
};

const getCommunityPosts = async (req, res, next) => {
  try {
    const { sort = 'new' } = req.query;
    const sortMap = { new: { createdAt: -1 }, top: { upvotes: -1 }, hot: { upvotes: -1, createdAt: -1 } };
    const posts = await Post.find({ community: req.params.id })
      .sort(sortMap[sort] || { createdAt: -1 })
      .populate('author', 'username profilePicture')
      .limit(20);
    res.json({ success: true, posts });
  } catch (err) { next(err); }
};

const getFeed = async (req, res, next) => {
  try {
    const { sort = 'best', page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;
    let posts;
    if (req.user) {
      const user = await User.findById(req.user.id).select('interests tags savedPosts');
      const joinedCommunities = await Community.find({ members: req.user.id }).select('_id');
      const joinedIds = joinedCommunities.map(c => c._id);
      // Get posts from joined communities + matching interests/tags
      posts = await Post.find({
        $or: [
          { community: { $in: joinedIds } },
          { tags: { $in: user.tags } },
        ],
      })
        .sort({ createdAt: -1 })
        .populate('author', 'username profilePicture')
        .populate('community', 'name icon')
        .skip(skip)
        .limit(limit);
      // Score and sort in-memory for 'best'
      if (sort === 'best') {
        posts = posts.map(p => {
          const pObj = p.toObject();
          let score = pObj.upvotes;
          if (user.interests.some(i => pObj.tags.includes(i))) score += 20;
          if (user.tags.some(t => pObj.tags.includes(t))) score += 30;
          if (joinedIds.map(id => id.toString()).includes(pObj.community._id.toString())) score += 50;
          const hoursOld = (Date.now() - new Date(pObj.createdAt)) / 3600000;
          score -= hoursOld;
          return { ...pObj, _score: score };
        }).sort((a, b) => b._score - a._score);
      }
    } else {
      posts = await Post.find().sort({ upvotes: -1, createdAt: -1 })
        .populate('author', 'username profilePicture')
        .populate('community', 'name icon')
        .limit(limit);
    }
    res.json({ success: true, posts });
  } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your post', code: 'FORBIDDEN' });
    }
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};

const upvotePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyUpvoted = post.upvoters.map(id => id.toString()).includes(userId);
    if (alreadyUpvoted) {
      post.upvoters.pull(userId);
      post.upvotes = Math.max(0, post.upvotes - 1);
      await User.findByIdAndUpdate(post.author, { $inc: { postKarma: -1 } });
    } else {
      post.downvoters.pull(userId);
      if (post.downvoters.length < post.downvotes) post.downvotes = Math.max(0, post.downvotes - 1);
      post.upvoters.push(userId);
      post.upvotes += 1;
      await User.findByIdAndUpdate(post.author, { $inc: { postKarma: 1 } });
    }
    await post.save();
    res.json({ success: true, upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (err) { next(err); }
};

const downvotePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyDownvoted = post.downvoters.map(id => id.toString()).includes(userId);
    if (alreadyDownvoted) {
      post.downvoters.pull(userId);
      post.downvotes = Math.max(0, post.downvotes - 1);
    } else {
      post.upvoters.pull(userId);
      if (post.upvoters.length < post.upvotes) {
        post.upvotes = Math.max(0, post.upvotes - 1);
        await User.findByIdAndUpdate(post.author, { $inc: { postKarma: -1 } });
      }
      post.downvoters.push(userId);
      post.downvotes += 1;
    }
    await post.save();
    res.json({ success: true, upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (err) { next(err); }
};

module.exports = { createPost, getPost, getCommunityPosts, getFeed, deletePost, upvotePost, downvotePost };
```

- [ ] **Step 4: Create posts.routes.js**

```javascript
// backend/src/features/posts/posts.routes.js
const express = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../../middleware/auth.middleware');
const { uploadPost } = require('../../config/cloudinary');
const { createPost, getPost, getCommunityPosts, getFeed, deletePost, upvotePost, downvotePost } = require('./posts.controller');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
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
router.get('/:id', getPost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/upvote', verifyToken, upvotePost);
router.post('/:id/downvote', verifyToken, downvotePost);

module.exports = router;
```

- [ ] **Step 5: Add community posts route in communities.routes.js**

Add to `backend/src/features/communities/communities.routes.js`:
```javascript
const { getCommunityPosts } = require('../posts/posts.controller');
router.get('/:id/posts', getCommunityPosts);
```

- [ ] **Step 6: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const postsRoutes = require('./features/posts/posts.routes');
app.use('/api/posts', postsRoutes);
```

- [ ] **Step 7: Run all post tests**

```bash
cd backend && npx jest --testPathPattern=posts.test.js
```
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/features/posts/
git commit -m "feat: add post CRUD, voting, feed algorithm, and community posts endpoint"
```

---

### Task 3: Comment Model

**Files:**
- Create: `backend/src/features/comments/comment.model.js`

- [ ] **Step 1: Write failing test**

```javascript
// backend/src/features/comments/__tests__/comments.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Comment = require('../comment.model');

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRES_IN = '7d';
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer.stop(); });
afterEach(async () => { await Comment.deleteMany({}); });

describe('Comment Model', () => {
  it('creates top-level comment with null parentComment', async () => {
    const comment = await Comment.create({
      content: 'Hello',
      author: new mongoose.Types.ObjectId(),
      post: new mongoose.Types.ObjectId(),
    });
    expect(comment.parentComment).toBeNull();
    expect(comment.upvotes).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=comments.test.js -t "Comment Model"
```
Expected: FAIL

- [ ] **Step 3: Create comment.model.js**

```javascript
// backend/src/features/comments/comment.model.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  upvotes: { type: Number, default: 0 },
  upvoters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=comments.test.js -t "Comment Model"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/comments/comment.model.js backend/src/features/comments/__tests__/comments.test.js
git commit -m "feat: add Comment model with nested reply support"
```

---

### Task 4: Comment CRUD & Upvote Endpoints

**Files:**
- Create: `backend/src/features/comments/comments.controller.js`
- Create: `backend/src/features/comments/comments.routes.js`

- [ ] **Step 1: Write failing tests**

Add to `backend/src/features/comments/__tests__/comments.test.js`:
```javascript
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const Post = require('../../posts/post.model');
const Community = require('../../communities/community.model');
const { createToken } = require('../../auth/auth.utils');

afterEach(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});
  await Community.deleteMany({});
  await Comment.deleteMany({});
});

describe('POST /api/comments', () => {
  it('creates a top-level comment', async () => {
    const user = await User.create({ email: 'c@test.com', username: 'commenter', verified: true });
    const community = await Community.create({ name: 'ccomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'Post', content: 'content', author: user._id, community: community._id });
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Great post!', post: post._id });
    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe('Great post!');
    expect(res.body.comment.parentComment).toBeNull();
    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.commentCount).toBe(1);
  });

  it('creates a nested reply with parentComment', async () => {
    const user = await User.create({ email: 'r@test.com', username: 'replier', verified: true });
    const community = await Community.create({ name: 'rcomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'Post', content: 'content', author: user._id, community: community._id });
    const parent = await Comment.create({ content: 'Parent', author: user._id, post: post._id });
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Reply!', post: post._id, parentComment: parent._id });
    expect(res.status).toBe(201);
    expect(res.body.comment.parentComment).toBe(parent._id.toString());
  });
});

describe('DELETE /api/comments/:id', () => {
  it('deletes own comment', async () => {
    const user = await User.create({ email: 'del@test.com', username: 'deleter', verified: true });
    const community = await Community.create({ name: 'delcomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'Post', content: 'c', author: user._id, community: community._id, commentCount: 1 });
    const comment = await Comment.create({ content: 'Delete me', author: user._id, post: post._id });
    const token = createToken(user._id);
    const res = await request(app)
      .delete(`/api/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const found = await Comment.findById(comment._id);
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=comments.test.js -t "POST /api/comments"
```
Expected: FAIL

- [ ] **Step 3: Create comments.controller.js**

```javascript
// backend/src/features/comments/comments.controller.js
const Comment = require('./comment.model');
const Post = require('../posts/post.model');
const User = require('../auth/auth.model');

const createComment = async (req, res, next) => {
  try {
    const { content, post: postId, parentComment } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    const comment = await Comment.create({
      content, post: postId, author: req.user.id,
      parentComment: parentComment || null,
    });
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
    await comment.populate('author', 'username profilePicture');
    await User.findByIdAndUpdate(post.author, { $inc: { commentKarma: 1 } });
    res.status(201).json({ success: true, comment });
  } catch (err) { next(err); }
};

const getPostComments = async (req, res, next) => {
  try {
    const { sort = 'best' } = req.query;
    const sortMap = { best: { upvotes: -1 }, new: { createdAt: -1 }, top: { upvotes: -1 } };
    const comments = await Comment.find({ post: req.params.postId, parentComment: null })
      .sort(sortMap[sort] || { upvotes: -1 })
      .populate('author', 'username profilePicture');
    const replies = await Comment.find({ post: req.params.postId, parentComment: { $ne: null } })
      .populate('author', 'username profilePicture');
    res.json({ success: true, comments, replies });
  } catch (err) { next(err); }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your comment', code: 'FORBIDDEN' });
    }
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentCount: -1 } });
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
};

const upvoteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyUpvoted = comment.upvoters.map(id => id.toString()).includes(userId);
    if (alreadyUpvoted) {
      comment.upvoters.pull(userId);
      comment.upvotes = Math.max(0, comment.upvotes - 1);
      await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: -1 } });
    } else {
      comment.upvoters.push(userId);
      comment.upvotes += 1;
      await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: 1 } });
    }
    await comment.save();
    res.json({ success: true, upvotes: comment.upvotes });
  } catch (err) { next(err); }
};

module.exports = { createComment, getPostComments, deleteComment, upvoteComment };
```

- [ ] **Step 4: Create comments.routes.js**

```javascript
// backend/src/features/comments/comments.routes.js
const express = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../../middleware/auth.middleware');
const { createComment, getPostComments, deleteComment, upvoteComment } = require('./comments.controller');

const router = express.Router();

router.post('/', verifyToken, [
  body('content').trim().notEmpty().withMessage('Comment content required'),
  body('post').notEmpty().withMessage('Post ID required'),
], createComment);
router.get('/post/:postId', getPostComments);
router.delete('/:id', verifyToken, deleteComment);
router.post('/:id/upvote', verifyToken, upvoteComment);

module.exports = router;
```

- [ ] **Step 5: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const commentsRoutes = require('./features/comments/comments.routes');
app.use('/api/comments', commentsRoutes);
```

- [ ] **Step 6: Run all tests**

```bash
cd backend && npx jest --testPathPattern="(posts|comments).test.js"
```
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/features/comments/
git commit -m "feat: add comment CRUD, nested replies, upvoting, and post comment count tracking"
```
