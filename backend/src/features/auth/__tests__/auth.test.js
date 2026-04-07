const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const User = require('../auth.model');
const { generateOtp, hashOtp, verifyOtp, createToken } = require('../auth.utils');

jest.mock('../../../config/email', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
}));

let mongoServer;
const getRefreshCookie = (res) =>
  (res.headers['set-cookie'] || []).find((cookie) => cookie.startsWith('refreshToken='));

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';
  process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
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
  jest.clearAllMocks();
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
    const token = createToken('507f1f77bcf86cd799439011');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('POST /api/auth/send-otp', () => {
  it('creates user and sends OTP for new email', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ email: 'new@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const user = await User.findOne({ email: 'new@test.com' });
    expect(user).toBeTruthy();
    expect(user.otp).toBeTruthy();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({ email: 'notanemail' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/verify-otp', () => {
  it('verifies correct OTP, returns access token, and sets refresh cookie', async () => {
    const user = await User.create({
      email: 'verify@test.com',
      otp: await hashOtp('654321'),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });
    const res = await request(app).post('/api/auth/verify-otp').send({ email: 'verify@test.com', otp: '654321' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.userId.toString()).toBe(user._id.toString());
    expect(getRefreshCookie(res)).toBeTruthy();
  });

  it('returns 400 for wrong OTP', async () => {
    await User.create({
      email: 'wrong@test.com',
      otp: await hashOtp('111111'),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });
    const res = await request(app).post('/api/auth/verify-otp').send({ email: 'wrong@test.com', otp: '999999' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_OTP');
  });

  it('returns 400 for expired OTP', async () => {
    await User.create({
      email: 'expired@test.com',
      otp: await hashOtp('222222'),
      otpExpiry: new Date(Date.now() - 1000),
    });
    const res = await request(app).post('/api/auth/verify-otp').send({ email: 'expired@test.com', otp: '222222' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates refresh token and returns a new access token', async () => {
    await User.create({
      email: 'refresh@test.com',
      otp: await hashOtp('333333'),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });

    const loginRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'refresh@test.com', otp: '333333' });

    const firstRefreshCookie = getRefreshCookie(loginRes);
    expect(firstRefreshCookie).toBeTruthy();

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', firstRefreshCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.accessToken).toBeTruthy();

    const secondRefreshCookie = getRefreshCookie(refreshRes);
    expect(secondRefreshCookie).toBeTruthy();
    expect(secondRefreshCookie).not.toEqual(firstRefreshCookie);
  });

  it('returns 401 when refresh token is missing', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/auth/complete-profile', () => {
  it('sets username, gender, interests, tags', async () => {
    const user = await User.create({ email: 'profile@test.com', verified: true });
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
    const token = createToken(user._id);
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'takenuser', gender: '', interests: [], tags: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('USERNAME_TAKEN');
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user from JWT', async () => {
    const user = await User.create({ email: 'me@test.com', username: 'meuser', verified: true });
    const token = createToken(user._id);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
    expect(res.body.user.otp).toBeUndefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes refresh token and blocks later refresh attempts', async () => {
    const user = await User.create({
      email: 'logout@test.com',
      username: 'logout',
      verified: true,
      otp: await hashOtp('444444'),
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
    });

    const loginRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'logout@test.com', otp: '444444' });

    const refreshCookie = getRefreshCookie(loginRes);
    const accessToken = loginRes.body.accessToken;
    expect(refreshCookie).toBeTruthy();
    expect(accessToken).toBeTruthy();

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.code).toBe('UNAUTHORIZED');
  });
});

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
