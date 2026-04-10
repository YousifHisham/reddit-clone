const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const User = require('../../auth/auth.model');
const Community = require('../community.model');
const { createToken } = require('../../auth/auth.utils');

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.ACCESS_TOKEN_SECRET = 'test-access-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await User.init();
  await Community.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Community.deleteMany({});
});

describe('Community Model', () => {
  it('creates community with required fields', async () => {
    const creatorId = new mongoose.Types.ObjectId();
    const community = await Community.create({
      name: 'testcommunity',
      description: 'A test community',
      creator: creatorId,
    });

    expect(community.name).toBe('testcommunity');
    expect(community.description).toBe('A test community');
    expect(community.creator.toString()).toBe(creatorId.toString());
    expect(community.memberCount).toBe(0);
    expect(community.flairs).toEqual([]);
  });

  it('enforces unique name', async () => {
    const id = new mongoose.Types.ObjectId();
    await Community.create({ name: 'dupename', description: 'first', creator: id });
    await expect(Community.create({ name: 'dupename', description: 'second', creator: id })).rejects.toThrow();
  });
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
    expect(res.body.success).toBe(true);
    expect(res.body.community.name).toBe('mynewcommunity');
    expect(res.body.community.memberCount).toBe(1);
    expect(res.body.community.members[0].toString()).toBe(user._id.toString());
  });
});

describe('GET /api/communities/:id', () => {
  it('returns community details', async () => {
    const user = await User.create({ email: 'c2@test.com', username: 'c2user', verified: true });
    const community = await Community.create({ name: 'testcomm', description: 'desc', creator: user._id });

    const res = await request(app).get(`/api/communities/${community._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
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
    expect(res.body.success).toBe(true);
    expect(res.body.communities).toHaveLength(1);
    expect(res.body.communities[0].name).toBe('javascript');
  });
});

describe('POST /api/communities/:id/join and /leave', () => {
  it('joins and leaves a community for authenticated user', async () => {
    const creator = await User.create({ email: 'c3@test.com', username: 'c3user', verified: true });
    const member = await User.create({ email: 'member@test.com', username: 'member', verified: true });
    const community = await Community.create({
      name: 'joinleave',
      description: 'desc',
      creator: creator._id,
      members: [creator._id],
      memberCount: 1,
    });

    const token = createToken(member._id);

    const joinRes = await request(app)
      .post(`/api/communities/${community._id}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.success).toBe(true);

    const afterJoin = await Community.findById(community._id);
    expect(afterJoin.memberCount).toBe(2);

    const leaveRes = await request(app)
      .post(`/api/communities/${community._id}/leave`)
      .set('Authorization', `Bearer ${token}`);
    expect(leaveRes.status).toBe(200);
    expect(leaveRes.body.success).toBe(true);

    const afterLeave = await Community.findById(community._id);
    expect(afterLeave.memberCount).toBe(1);
  });
});
