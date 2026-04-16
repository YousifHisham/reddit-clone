const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const { createToken } = require('../../auth/auth.utils');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await User.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('GET /api/users/:id', () => {
  it('returns user profile without sensitive fields', async () => {
    const user = await User.create({ email: 'u@test.com', username: 'testuser', bio: 'Hello world' });

    const res = await request(app).get(`/api/users/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.bio).toBe('Hello world');
    expect(res.body.user.otp).toBeUndefined();
    expect(res.body.user.otpExpiry).toBeUndefined();
    expect(res.body.user.email).toBeUndefined();
    expect(res.body.user.fcmToken).toBeUndefined();
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
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
    expect(res.body.success).toBe(true);
    expect(res.body.user.bio).toBe('Updated bio');
  });

  it('returns 403 if updating another user', async () => {
    const owner = await User.create({ email: 'owner@test.com', username: 'owner', verified: true });
    const other = await User.create({ email: 'other@test.com', username: 'other', verified: true });
    const token = createToken(other._id);

    const res = await request(app)
      .put(`/api/users/${owner._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'hacked' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/users/search', () => {
  it('returns matching users by username', async () => {
    await User.create({ email: 'js@test.com', username: 'javascript', verified: true });
    await User.create({ email: 'py@test.com', username: 'python', verified: true });

    const res = await request(app).get('/api/users/search?q=java');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe('javascript');
  });
});

describe('Saved posts routes', () => {
  it('saves and unsaves a post for the authenticated owner', async () => {
    const user = await User.create({ email: 'saved@test.com', username: 'saveduser', verified: true });
    const token = createToken(user._id);
    const postId = new mongoose.Types.ObjectId();

    const saveRes = await request(app)
      .post(`/api/users/${user._id}/save/${postId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);

    const getSavedRes = await request(app)
      .get(`/api/users/${user._id}/saved`)
      .set('Authorization', `Bearer ${token}`);
    expect(getSavedRes.status).toBe(200);
    expect(getSavedRes.body.savedPosts).toHaveLength(1);

    const unsaveRes = await request(app)
      .delete(`/api/users/${user._id}/save/${postId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(unsaveRes.status).toBe(200);
    expect(unsaveRes.body.success).toBe(true);
    expect(unsaveRes.body.savedPosts).toHaveLength(0);
  });
});
