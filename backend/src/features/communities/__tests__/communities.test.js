const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Community = require('../community.model');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Community.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
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
