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
