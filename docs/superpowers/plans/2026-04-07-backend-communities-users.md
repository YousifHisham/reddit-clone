# Backend Communities & Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement user profile endpoints and full community CRUD (create, view, list, search, join, leave).

**Architecture:** Two feature modules — `users/` owns profile and saved-posts logic; `communities/` owns community lifecycle. Both mount onto the main Express router in server.js. Cloudinary config is added for profile picture uploads.

**Tech Stack:** Express, Mongoose, Cloudinary (multer + cloudinary), express-validator, Jest, Supertest, mongodb-memory-server

**Prerequisite:** `backend-setup-auth` plan must be complete (User model and auth middleware exist).

---

## File Structure

```
backend/src/features/
├── users/
│   ├── users.controller.js     # getProfile, updateProfile, searchUsers, getSaved, savePost, unsavePost
│   ├── users.routes.js         # GET/PUT /api/users/:id, GET /api/users/search, saved posts routes
│   └── __tests__/
│       └── users.test.js
└── communities/
    ├── community.model.js       # Community Mongoose model
    ├── communities.controller.js # create, getOne, listAll, search, join, leave
    ├── communities.routes.js    # POST/GET /api/communities, join/leave
    └── __tests__/
        └── communities.test.js

backend/src/config/
└── cloudinary.js               # Cloudinary setup + upload middleware
```

---

### Task 1: Cloudinary Config & Upload Middleware

**Files:**
- Create: `backend/src/config/cloudinary.js`

- [ ] **Step 1: Install dependencies**

```bash
cd backend && npm install cloudinary multer multer-storage-cloudinary
```

- [ ] **Step 2: Add to .env.example**

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- [ ] **Step 3: Create cloudinary.js**

```javascript
// backend/src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'reddit-clone/profiles', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 256, height: 256, crop: 'fill' }] },
});

const postStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'reddit-clone/posts', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
});

const communityStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'reddit-clone/communities', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});

const uploadProfile = multer({ storage: profileStorage });
const uploadPost = multer({ storage: postStorage });
const uploadCommunity = multer({ storage: communityStorage });

module.exports = { cloudinary, uploadProfile, uploadPost, uploadCommunity };
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/cloudinary.js backend/.env.example
git commit -m "feat: add Cloudinary config with upload middleware for profiles/posts/communities"
```

---

### Task 2: User Profile Endpoints

**Files:**
- Create: `backend/src/features/users/users.controller.js`
- Create: `backend/src/features/users/users.routes.js`
- Create: `backend/src/features/users/__tests__/users.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// backend/src/features/users/__tests__/users.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRES_IN = '7d';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

const { createToken } = require('../../auth/auth.utils');

describe('GET /api/users/:id', () => {
  it('returns user profile without sensitive fields', async () => {
    const user = await User.create({ email: 'u@test.com', username: 'testuser', bio: 'Hello' });
    const res = await request(app).get(`/api/users/${user._id}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.otp).toBeUndefined();
    expect(res.body.user.email).toBeUndefined();
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/users/:id', () => {
  it('updates bio for authenticated user', async () => {
    const user = await User.create({ email: 'edit@test.com', username: 'edituser', verified: true });
    const token = createToken(user._id);
    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Updated bio' });
    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('Updated bio');
  });

  it('returns 403 if updating another user', async () => {
    const owner = await User.create({ email: 'owner@test.com', username: 'owner' });
    const other = await User.create({ email: 'other@test.com', username: 'other', verified: true });
    const token = createToken(other._id);
    const res = await request(app)
      .put(`/api/users/${owner._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'hacked' });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=users.test.js
```
Expected: FAIL — routes not found

- [ ] **Step 3: Create users.controller.js**

```javascript
// backend/src/features/users/users.controller.js
const User = require('../auth/auth.model');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-otp -otpExpiry -email -fcmToken')
      .populate('savedPosts', 'title createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
    }
    const updates = {};
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.file) updates.profilePicture = req.file.path;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-otp -otpExpiry -email -fcmToken');
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, users: [] });
    const users = await User.find({
      username: { $regex: q, $options: 'i' },
    }).select('username profilePicture postKarma').limit(10);
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
};

const getSavedPosts = async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
    }
    const user = await User.findById(req.params.id).populate({
      path: 'savedPosts',
      populate: { path: 'author community', select: 'username name' },
    });
    res.json({ success: true, posts: user.savedPosts });
  } catch (err) {
    next(err);
  }
};

const savePost = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { savedPosts: req.params.postId },
    });
    res.json({ success: true, message: 'Post saved' });
  } catch (err) {
    next(err);
  }
};

const unsavePost = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { savedPosts: req.params.postId },
    });
    res.json({ success: true, message: 'Post unsaved' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, searchUsers, getSavedPosts, savePost, unsavePost };
```

- [ ] **Step 4: Create users.routes.js**

```javascript
// backend/src/features/users/users.routes.js
const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { uploadProfile } = require('../../config/cloudinary');
const { getProfile, updateProfile, searchUsers, getSavedPosts, savePost, unsavePost } = require('./users.controller');

const router = express.Router();

router.get('/search', searchUsers);
router.get('/:id', getProfile);
router.put('/:id', verifyToken, uploadProfile.single('profilePicture'), updateProfile);
router.get('/:id/saved', verifyToken, getSavedPosts);
router.post('/:id/save/:postId', verifyToken, savePost);
router.delete('/:id/save/:postId', verifyToken, unsavePost);

module.exports = router;
```

- [ ] **Step 5: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const usersRoutes = require('./features/users/users.routes');
app.use('/api/users', usersRoutes);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd backend && npx jest --testPathPattern=users.test.js
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/features/users/
git commit -m "feat: add user profile GET/PUT, search, and saved posts endpoints"
```

---

### Task 3: Community Model

**Files:**
- Create: `backend/src/features/communities/community.model.js`

- [ ] **Step 1: Write failing test**

```javascript
// backend/src/features/communities/__tests__/communities.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Community = require('../community.model');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Community.deleteMany({});
});

describe('Community Model', () => {
  it('creates community with required fields', async () => {
    const community = await Community.create({
      name: 'testcommunity',
      description: 'A test community',
      creator: new mongoose.Types.ObjectId(),
    });
    expect(community.name).toBe('testcommunity');
    expect(community.memberCount).toBe(0);
    expect(community.flairs).toEqual([]);
  });

  it('enforces unique name', async () => {
    const id = new mongoose.Types.ObjectId();
    await Community.create({ name: 'dupename', description: 'first', creator: id });
    await expect(Community.create({ name: 'dupename', description: 'second', creator: id })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=communities.test.js -t "Community Model"
```
Expected: FAIL

- [ ] **Step 3: Create community.model.js**

```javascript
// backend/src/features/communities/community.model.js
const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  rules: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  memberCount: { type: Number, default: 0 },
  banner: { type: String, default: '' },
  icon: { type: String, default: '' },
  flairs: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Community', communitySchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=communities.test.js -t "Community Model"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/communities/community.model.js backend/src/features/communities/__tests__/communities.test.js
git commit -m "feat: add Community model"
```

---

### Task 4: Community CRUD Endpoints

**Files:**
- Create: `backend/src/features/communities/communities.controller.js`
- Create: `backend/src/features/communities/communities.routes.js`

- [ ] **Step 1: Write failing tests**

Add to `backend/src/features/communities/__tests__/communities.test.js`:
```javascript
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const { createToken } = require('../../auth/auth.utils');

afterEach(async () => {
  await User.deleteMany({});
  await Community.deleteMany({});
});

describe('POST /api/communities', () => {
  it('creates a community and sets creator as member', async () => {
    const user = await User.create({ email: 'c@test.com', username: 'creator', verified: true });
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/communities')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'mynewcommunity', description: 'Test community', rules: 'Be kind' });
    expect(res.status).toBe(201);
    expect(res.body.community.name).toBe('mynewcommunity');
    expect(res.body.community.memberCount).toBe(1);
  });
});

describe('GET /api/communities/:id', () => {
  it('returns community details', async () => {
    const user = await User.create({ email: 'c2@test.com', username: 'c2user' });
    const community = await Community.create({ name: 'testcomm', description: 'desc', creator: user._id });
    const res = await request(app).get(`/api/communities/${community._id}`);
    expect(res.status).toBe(200);
    expect(res.body.community.name).toBe('testcomm');
  });
});

describe('GET /api/communities/search', () => {
  it('returns matching communities', async () => {
    const userId = new mongoose.Types.ObjectId();
    await Community.create({ name: 'javascript', description: 'JS community', creator: userId });
    await Community.create({ name: 'python', description: 'Python community', creator: userId });
    const res = await request(app).get('/api/communities/search?q=java');
    expect(res.status).toBe(200);
    expect(res.body.communities).toHaveLength(1);
    expect(res.body.communities[0].name).toBe('javascript');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=communities.test.js -t "POST /api/communities"
```
Expected: FAIL

- [ ] **Step 3: Create communities.controller.js**

```javascript
// backend/src/features/communities/communities.controller.js
const Community = require('./community.model');

const createCommunity = async (req, res, next) => {
  try {
    const { name, description, rules } = req.body;
    const existing = await Community.findOne({ name: name.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Community name taken', code: 'NAME_TAKEN' });
    const community = await Community.create({
      name: name.toLowerCase(),
      description,
      rules,
      creator: req.user.id,
      members: [req.user.id],
      memberCount: 1,
    });
    res.status(201).json({ success: true, community });
  } catch (err) {
    next(err);
  }
};

const getCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id).populate('creator', 'username');
    if (!community) return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    res.json({ success: true, community });
  } catch (err) {
    next(err);
  }
};

const listCommunities = async (req, res, next) => {
  try {
    const communities = await Community.find().sort({ memberCount: -1 }).limit(50);
    res.json({ success: true, communities });
  } catch (err) {
    next(err);
  }
};

const searchCommunities = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, communities: [] });
    const communities = await Community.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ],
    }).limit(20);
    res.json({ success: true, communities });
  } catch (err) {
    next(err);
  }
};

const joinCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    if (community.members.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already a member', code: 'ALREADY_MEMBER' });
    }
    community.members.push(req.user.id);
    community.memberCount += 1;
    await community.save();
    res.json({ success: true, message: 'Joined community' });
  } catch (err) {
    next(err);
  }
};

const leaveCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    if (!community.members.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Not a member', code: 'NOT_MEMBER' });
    }
    community.members = community.members.filter(id => id.toString() !== req.user.id);
    community.memberCount = Math.max(0, community.memberCount - 1);
    await community.save();
    res.json({ success: true, message: 'Left community' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCommunity, getCommunity, listCommunities, searchCommunities, joinCommunity, leaveCommunity };
```

- [ ] **Step 4: Create communities.routes.js**

```javascript
// backend/src/features/communities/communities.routes.js
const express = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../../middleware/auth.middleware');
const { createCommunity, getCommunity, listCommunities, searchCommunities, joinCommunity, leaveCommunity } = require('./communities.controller');

const router = express.Router();

router.get('/search', searchCommunities);
router.get('/', listCommunities);
router.post('/', verifyToken, [
  body('name').trim().isLength({ min: 3, max: 21 }).withMessage('Community name must be 3-21 characters'),
  body('description').notEmpty().withMessage('Description required'),
], createCommunity);
router.get('/:id', getCommunity);
router.post('/:id/join', verifyToken, joinCommunity);
router.post('/:id/leave', verifyToken, leaveCommunity);

module.exports = router;
```

- [ ] **Step 5: Mount in server.js**

Add to `backend/src/server.js`:
```javascript
const communitiesRoutes = require('./features/communities/communities.routes');
app.use('/api/communities', communitiesRoutes);
```

- [ ] **Step 6: Run all community tests**

```bash
cd backend && npx jest --testPathPattern=communities.test.js
```
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/features/communities/
git commit -m "feat: add community CRUD, join/leave, and search endpoints"
```

---

### Task 5: FCM Token Update Endpoint

**Files:**
- Modify: `backend/src/features/users/users.controller.js`
- Modify: `backend/src/features/users/users.routes.js`

- [ ] **Step 1: Write failing test**

Add to `backend/src/features/users/__tests__/users.test.js`:
```javascript
describe('PUT /api/users/:id/fcm-token', () => {
  it('updates FCM token for authenticated user', async () => {
    const user = await User.create({ email: 'fcm@test.com', username: 'fcmuser', verified: true });
    const token = createToken(user._id);
    const res = await request(app)
      .put(`/api/users/${user._id}/fcm-token`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fcmToken: 'test-fcm-token-123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updated = await User.findById(user._id);
    expect(updated.fcmToken).toBe('test-fcm-token-123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=users.test.js -t "PUT /api/users/:id/fcm-token"
```
Expected: FAIL

- [ ] **Step 3: Add updateFcmToken to users.controller.js**

Add to `backend/src/features/users/users.controller.js`:
```javascript
const updateFcmToken = async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' });
    }
    await User.findByIdAndUpdate(req.user.id, { fcmToken: req.body.fcmToken });
    res.json({ success: true, message: 'FCM token updated' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, searchUsers, getSavedPosts, savePost, unsavePost, updateFcmToken };
```

- [ ] **Step 4: Add route in users.routes.js**

Add to `backend/src/features/users/users.routes.js`:
```javascript
const { getProfile, updateProfile, searchUsers, getSavedPosts, savePost, unsavePost, updateFcmToken } = require('./users.controller');

router.put('/:id/fcm-token', verifyToken, updateFcmToken);
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && npx jest --testPathPattern="(users|communities).test.js"
```
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/features/users/users.controller.js backend/src/features/users/users.routes.js
git commit -m "feat: add PUT /api/users/:id/fcm-token for push notification registration"
```
