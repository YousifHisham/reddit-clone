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
