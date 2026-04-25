const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../../../server');
const Post = require('../post.model');
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
  await Post.deleteMany({});
  await User.deleteMany({});
  await Community.deleteMany({});
});

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

describe('POST /api/posts/:id/upvote', () => {
  it('toggles upvote on a post', async () => {
    const user = await User.create({ email: 'v@test.com', username: 'voter', verified: true });
    const community = await Community.create({ name: 'vcomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'Vote me', content: 'c', author: user._id, community: community._id });
    const token = createToken(user._id);
    const res = await request(app)
      .post(`/api/posts/${post._id}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.upvotes).toBe(1);
    const res2 = await request(app)
      .post(`/api/posts/${post._id}/upvote`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.body.upvotes).toBe(0);
  });
});

describe('DELETE /api/posts/:id', () => {
  it('deletes own post', async () => {
    const user = await User.create({ email: 'd@test.com', username: 'deleter', verified: true });
    const community = await Community.create({ name: 'dcomm', description: 'test', creator: user._id });
    const post = await Post.create({ title: 'Delete me', content: 'c', author: user._id, community: community._id });
    const token = createToken(user._id);
    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await Post.findById(post._id)).toBeNull();
  });
});
