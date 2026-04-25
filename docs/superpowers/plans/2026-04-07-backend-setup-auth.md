# Backend Setup & Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Express backend, connect to MongoDB, and implement OTP-based authentication with JWT.

**Architecture:** Feature-based Express app. Auth feature owns the User model, OTP logic, and JWT generation. Global error middleware returns consistent `{ success, message, code }` responses. Rate limiting on OTP endpoints.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, jsonwebtoken, bcryptjs, nodemailer, express-validator, express-rate-limit, cors, dotenv, Jest, Supertest, mongodb-memory-server

---

## File Structure

```
backend/
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── auth.model.js        # User Mongoose model
│   │       ├── auth.utils.js        # OTP generate/hash/verify helpers
│   │       ├── auth.controller.js   # sendOtp, verifyOtp, completeProfile, getMe, logout
│   │       ├── auth.routes.js       # POST /send-otp, /verify-otp, /complete-profile, GET /me, POST /logout
│   │       └── __tests__/
│   │           └── auth.test.js     # Supertest integration tests
│   ├── middleware/
│   │   ├── auth.middleware.js       # verifyToken — attaches req.user
│   │   └── error.middleware.js      # global error handler
│   ├── config/
│   │   ├── db.js                    # Mongoose connect
│   │   └── email.js                 # Nodemailer transporter
│   └── server.js                    # Express app setup + route mounting
├── .env.example
├── jest.config.js
└── package.json
```

---

### Task 1: Initialize Backend Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/jest.config.js`

- [ ] **Step 1: Create package.json and install dependencies**

```bash
cd backend
npm init -y
npm install express mongoose jsonwebtoken bcryptjs nodemailer express-validator express-rate-limit cors dotenv
npm install --save-dev jest supertest mongodb-memory-server
```

- [ ] **Step 2: Add scripts to package.json**

Edit `backend/package.json` — replace the `"scripts"` section:
```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "test": "jest --runInBand --forceExit"
}
```

- [ ] **Step 3: Create jest.config.js**

```javascript
// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterFramework: [],
};
```

- [ ] **Step 4: Create .env.example**

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/reddit-clone
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/.env.example backend/jest.config.js
git commit -m "chore: initialize backend project with dependencies"
```

---

### Task 2: Express Server & Middleware Setup

**Files:**
- Create: `backend/src/server.js`
- Create: `backend/src/config/db.js`
- Create: `backend/src/middleware/error.middleware.js`

- [ ] **Step 1: Create error middleware**

```javascript
// backend/src/middleware/error.middleware.js
const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
};

module.exports = errorMiddleware;
```

- [ ] **Step 2: Create DB config**

```javascript
// backend/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;
```

- [ ] **Step 3: Create server.js**

```javascript
// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/error.middleware');
const authRoutes = require('./features/auth/auth.routes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  });
}

module.exports = app;
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/server.js backend/src/config/db.js backend/src/middleware/error.middleware.js
git commit -m "feat: set up Express server with CORS and error middleware"
```

---

### Task 3: Email Config (Nodemailer)

**Files:**
- Create: `backend/src/config/email.js`

- [ ] **Step 1: Create email transporter**

```javascript
// backend/src/config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Reddit Clone" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your verification code',
    html: `
      <div style="font-family: IBM Plex Sans, sans-serif; max-width: 400px; margin: auto;">
        <h2>Your verification code</h2>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff4500;">${otp}</p>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #878a8c; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/config/email.js
git commit -m "feat: add Nodemailer email service for OTP delivery"
```

---

### Task 4: User Model

**Files:**
- Create: `backend/src/features/auth/auth.model.js`

- [ ] **Step 1: Write failing test**

```javascript
// backend/src/features/auth/__tests__/auth.test.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../auth.model');

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
  await User.deleteMany({});
});

describe('User Model', () => {
  it('creates a user with email only', async () => {
    const user = await User.create({ email: 'test@test.com' });
    expect(user.email).toBe('test@test.com');
    expect(user.verified).toBe(false);
    expect(user.postKarma).toBe(0);
    expect(user.commentKarma).toBe(0);
  });

  it('enforces unique email', async () => {
    await User.create({ email: 'dupe@test.com' });
    await expect(User.create({ email: 'dupe@test.com' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "User Model"
```
Expected: FAIL — `Cannot find module '../auth.model'`

- [ ] **Step 3: Create User model**

```javascript
// backend/src/features/auth/auth.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  bio: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  gender: { type: String, default: '' },
  interests: [{ type: String }],
  tags: [{ type: String }],
  otp: { type: String },
  otpExpiry: { type: Date },
  verified: { type: Boolean, default: false },
  postKarma: { type: Number, default: 0 },
  commentKarma: { type: Number, default: 0 },
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  fcmToken: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "User Model"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/auth/auth.model.js backend/src/features/auth/__tests__/auth.test.js
git commit -m "feat: add User model with OTP and karma fields"
```

---

### Task 5: OTP Utilities

**Files:**
- Create: `backend/src/features/auth/auth.utils.js`

- [ ] **Step 1: Write failing tests**

Add to `backend/src/features/auth/__tests__/auth.test.js`:
```javascript
const { generateOtp, hashOtp, verifyOtp, createToken } = require('../auth.utils');

describe('OTP Utils', () => {
  it('generates a 6-digit OTP string', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('hashes OTP and verifies correctly', async () => {
    const otp = '123456';
    const hashed = await hashOtp(otp);
    expect(hashed).not.toBe(otp);
    const valid = await verifyOtp(otp, hashed);
    expect(valid).toBe(true);
  });

  it('returns false for wrong OTP', async () => {
    const hashed = await hashOtp('123456');
    const valid = await verifyOtp('999999', hashed);
    expect(valid).toBe(false);
  });

  it('createToken returns a JWT string', () => {
    process.env.JWT_SECRET = 'testsecret';
    process.env.JWT_EXPIRES_IN = '7d';
    const token = createToken('507f1f77bcf86cd799439011');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "OTP Utils"
```
Expected: FAIL — `Cannot find module '../auth.utils'`

- [ ] **Step 3: Create auth.utils.js**

```javascript
// backend/src/features/auth/auth.utils.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = async (otp) => {
  return bcrypt.hash(otp, 10);
};

const verifyOtp = async (otp, hashed) => {
  return bcrypt.compare(otp, hashed);
};

const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { generateOtp, hashOtp, verifyOtp, createToken };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "OTP Utils"
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/features/auth/auth.utils.js
git commit -m "feat: add OTP generate/hash/verify utilities and JWT creator"
```

---

### Task 6: Send OTP Endpoint

**Files:**
- Create: `backend/src/features/auth/auth.controller.js`
- Create: `backend/src/features/auth/auth.routes.js`

- [ ] **Step 1: Write failing test**

Add to `backend/src/features/auth/__tests__/auth.test.js`:
```javascript
const request = require('supertest');
const app = require('../../../server');

// Mock email to avoid real SMTP calls in tests
jest.mock('../../../config/email', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
}));

describe('POST /api/auth/send-otp', () => {
  it('creates user and sends OTP for new email', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'new@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const user = await User.findOne({ email: 'new@test.com' });
    expect(user).toBeTruthy();
    expect(user.otp).toBeTruthy();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ email: 'notanemail' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "POST /api/auth/send-otp"
```
Expected: FAIL — route not found (404)

- [ ] **Step 3: Create auth controller (sendOtp)**

```javascript
// backend/src/features/auth/auth.controller.js
const { validationResult } = require('express-validator');
const User = require('./auth.model');
const { generateOtp, hashOtp, verifyOtp, createToken } = require('./auth.utils');
const { sendOtpEmail } = require('../../config/email');

const sendOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, code: 'VALIDATION_ERROR' });
    }
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) user = new User({ email });
    const otp = generateOtp();
    user.otp = await hashOtp(otp);
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOtpEmail(email, otp);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp };
```

- [ ] **Step 4: Create auth routes**

```javascript
// backend/src/features/auth/auth.routes.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { sendOtp } = require('./auth.controller');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests, try again later', code: 'RATE_LIMITED' },
});

router.post('/send-otp', otpLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
], sendOtp);

module.exports = router;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "POST /api/auth/send-otp"
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/features/auth/auth.controller.js backend/src/features/auth/auth.routes.js
git commit -m "feat: add POST /api/auth/send-otp endpoint with rate limiting"
```

---

### Task 7: Verify OTP Endpoint

**Files:**
- Modify: `backend/src/features/auth/auth.controller.js`
- Modify: `backend/src/features/auth/auth.routes.js`

- [ ] **Step 1: Write failing test**

Add to `backend/src/features/auth/__tests__/auth.test.js`:
```javascript
describe('POST /api/auth/verify-otp', () => {
  it('verifies correct OTP and returns JWT', async () => {
    process.env.JWT_SECRET = 'testsecret';
    const { hashOtp } = require('../auth.utils');
    const user = await User.create({
      email: 'verify@test.com',
      otp: await hashOtp('654321'),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'verify@test.com', otp: '654321' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.isNewUser).toBe(true);
  });

  it('returns 400 for wrong OTP', async () => {
    const { hashOtp } = require('../auth.utils');
    await User.create({
      email: 'wrong@test.com',
      otp: await hashOtp('111111'),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'wrong@test.com', otp: '999999' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_OTP');
  });

  it('returns 400 for expired OTP', async () => {
    const { hashOtp } = require('../auth.utils');
    await User.create({
      email: 'expired@test.com',
      otp: await hashOtp('222222'),
      otpExpiry: new Date(Date.now() - 1000),
    });
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'expired@test.com', otp: '222222' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "POST /api/auth/verify-otp"
```
Expected: FAIL — 404

- [ ] **Step 3: Add verifyOtp handler to auth.controller.js**

Add to `backend/src/features/auth/auth.controller.js`:
```javascript
const verifyOtpHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, code: 'VALIDATION_ERROR' });
    }
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.otp) {
      return res.status(400).json({ success: false, message: 'No OTP found for this email', code: 'INVALID_OTP' });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired', code: 'OTP_EXPIRED' });
    }
    const isValid = await verifyOtp(otp, user.otp);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP', code: 'INVALID_OTP' });
    }
    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    const token = createToken(user._id);
    const isNewUser = !user.username;
    res.json({ success: true, token, isNewUser, userId: user._id });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp, verifyOtpHandler };
```

- [ ] **Step 4: Add route in auth.routes.js**

Add to `backend/src/features/auth/auth.routes.js`:
```javascript
const { sendOtp, verifyOtpHandler } = require('./auth.controller');

router.post('/verify-otp', otpLimiter, [
  body('email').isEmail().withMessage('Valid email required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
], verifyOtpHandler);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "POST /api/auth/verify-otp"
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/features/auth/auth.controller.js backend/src/features/auth/auth.routes.js
git commit -m "feat: add POST /api/auth/verify-otp with JWT response"
```

---

### Task 8: Complete Profile Endpoint

**Files:**
- Modify: `backend/src/features/auth/auth.controller.js`
- Modify: `backend/src/features/auth/auth.routes.js`

- [ ] **Step 1: Write failing test**

Add to `backend/src/features/auth/__tests__/auth.test.js`:
```javascript
describe('POST /api/auth/complete-profile', () => {
  it('sets username, gender, interests, tags', async () => {
    process.env.JWT_SECRET = 'testsecret';
    const user = await User.create({ email: 'profile@test.com', verified: true });
    const { createToken } = require('../auth.utils');
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'testuser',
        gender: 'male',
        interests: ['Technology', 'Gaming'],
        tags: ['#python', '#react'],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updated = await User.findById(user._id);
    expect(updated.username).toBe('testuser');
    expect(updated.interests).toContain('Technology');
  });

  it('returns 400 if username already taken', async () => {
    await User.create({ email: 'taken@test.com', username: 'takenuser', verified: true });
    const user = await User.create({ email: 'new2@test.com', verified: true });
    const { createToken } = require('../auth.utils');
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'takenuser', gender: '', interests: [], tags: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('USERNAME_TAKEN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "POST /api/auth/complete-profile"
```
Expected: FAIL — 404

- [ ] **Step 3: Add completeProfile handler to auth.controller.js**

Add to `backend/src/features/auth/auth.controller.js`:
```javascript
const completeProfile = async (req, res, next) => {
  try {
    const { username, gender, interests, tags } = req.body;
    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({ success: false, message: 'Username already taken', code: 'USERNAME_TAKEN' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, gender, interests: interests || [], tags: tags || [] },
      { new: true, select: '-otp -otpExpiry' }
    );
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp, verifyOtpHandler, completeProfile };
```

- [ ] **Step 4: Create JWT auth middleware**

```javascript
// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided', code: 'UNAUTHORIZED' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
};

module.exports = { verifyToken };
```

- [ ] **Step 5: Add route with auth middleware in auth.routes.js**

Add to `backend/src/features/auth/auth.routes.js`:
```javascript
const { verifyToken } = require('../../middleware/auth.middleware');
const { sendOtp, verifyOtpHandler, completeProfile } = require('./auth.controller');

router.post('/complete-profile', verifyToken, [
  body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
], completeProfile);
```

- [ ] **Step 6: Mount auth middleware in server.js**

Add to `backend/src/server.js`:
```javascript
// Already mounted via auth.routes.js — no change needed to server.js
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "POST /api/auth/complete-profile"
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/features/auth/auth.controller.js backend/src/features/auth/auth.routes.js backend/src/middleware/auth.middleware.js
git commit -m "feat: add POST /api/auth/complete-profile and JWT auth middleware"
```

---

### Task 9: Get Current User & Logout

**Files:**
- Modify: `backend/src/features/auth/auth.controller.js`
- Modify: `backend/src/features/auth/auth.routes.js`

- [ ] **Step 1: Write failing tests**

Add to `backend/src/features/auth/__tests__/auth.test.js`:
```javascript
describe('GET /api/auth/me', () => {
  it('returns current user from JWT', async () => {
    process.env.JWT_SECRET = 'testsecret';
    const user = await User.create({ email: 'me@test.com', username: 'meuser', verified: true });
    const { createToken } = require('../auth.utils');
    const token = createToken(user._id);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
    expect(res.body.user.otp).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "GET /api/auth/me"
```
Expected: FAIL — 404

- [ ] **Step 3: Add getMe and logout to auth.controller.js**

Add to `backend/src/features/auth/auth.controller.js`:
```javascript
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-otp -otpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found', code: 'NOT_FOUND' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { sendOtp, verifyOtpHandler, completeProfile, getMe, logout };
```

- [ ] **Step 4: Add routes in auth.routes.js**

Add to `backend/src/features/auth/auth.routes.js`:
```javascript
const { sendOtp, verifyOtpHandler, completeProfile, getMe, logout } = require('./auth.controller');

router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "GET /api/auth/me"
```
Expected: PASS

- [ ] **Step 6: Run all auth tests**

```bash
cd backend && npx jest --testPathPattern=auth.test.js
```
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/features/auth/auth.controller.js backend/src/features/auth/auth.routes.js
git commit -m "feat: add GET /api/auth/me and POST /api/auth/logout endpoints"
```

---

### Task 10: Username Availability Check

**Files:**
- Modify: `backend/src/features/auth/auth.controller.js`
- Modify: `backend/src/features/auth/auth.routes.js`

- [ ] **Step 1: Write failing test**

Add to `backend/src/features/auth/__tests__/auth.test.js`:
```javascript
describe('GET /api/auth/check-username', () => {
  it('returns available: true for unused username', async () => {
    const res = await request(app).get('/api/auth/check-username?username=freshname');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it('returns available: false for taken username', async () => {
    await User.create({ email: 'taken2@test.com', username: 'takenname' });
    const res = await request(app).get('/api/auth/check-username?username=takenname');
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest --testPathPattern=auth.test.js -t "GET /api/auth/check-username"
```
Expected: FAIL — 404

- [ ] **Step 3: Add checkUsername to auth.controller.js**

Add to `backend/src/features/auth/auth.controller.js`:
```javascript
const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.query;
    const existing = await User.findOne({ username });
    res.json({ available: !existing });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp, verifyOtpHandler, completeProfile, getMe, logout, checkUsername };
```

- [ ] **Step 4: Add route in auth.routes.js**

Add to `backend/src/features/auth/auth.routes.js`:
```javascript
const { sendOtp, verifyOtpHandler, completeProfile, getMe, logout, checkUsername } = require('./auth.controller');

router.get('/check-username', checkUsername);
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && npx jest --testPathPattern=auth.test.js
```
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/features/auth/auth.controller.js backend/src/features/auth/auth.routes.js
git commit -m "feat: add GET /api/auth/check-username for real-time availability"
```
