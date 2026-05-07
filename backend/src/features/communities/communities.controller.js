const { validationResult } = require('express-validator');
const Community = require('./community.model');
const JoinRequest = require('./joinRequest.model');
const Notification = require('../notifications/notification.model');
const User = require('../auth/auth.model');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validationError = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({
    success: false,
    message: errors.array()[0].msg,
    code: 'VALIDATION_ERROR',
  });
};

const createCommunity = async (req, res, next) => {
  try {
    const validationResponse = validationError(req, res);
    if (validationResponse) return validationResponse;

    const { name, description, rules } = req.body;
    const normalizedName = name.trim().toLowerCase();

    const existing = await Community.exists({ name: normalizedName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Community name taken',
        code: 'NAME_TAKEN',
      });
    }

    const community = await Community.create({
      name: normalizedName,
      description: description.trim(),
      rules: rules || '',
      creator: req.user.id,
      members: [req.user.id],
      memberCount: 1,
    });

    return res.status(201).json({ success: true, community });
  } catch (err) {
    return next(err);
  }
};

const getCommunity = async (req, res, next) => {
  try {
    const validationResponse = validationError(req, res);
    if (validationResponse) return validationResponse;

    const community = await Community.findById(req.params.id).populate('creator', 'username');
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, community });
  } catch (err) {
    return next(err);
  }
};

const listCommunities = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.joined === 'true' && req.user) filter.members = req.user.id;
    if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
    const communities = await Community.find(filter).sort({ memberCount: -1 }).limit(50);
    return res.json({ success: true, communities });
  } catch (err) {
    return next(err);
  }
};

const searchCommunities = async (req, res, next) => {
  try {
    const validationResponse = validationError(req, res);
    if (validationResponse) return validationResponse;

    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, communities: [] });

    const regex = new RegExp(escapeRegex(q), 'i');
    const communities = await Community.find({
      $or: [{ name: regex }, { description: regex }],
    }).limit(20);

    return res.json({ success: true, communities });
  } catch (err) {
    return next(err);
  }
};

const joinCommunity = async (req, res, next) => {
  try {
    const validationResponse = validationError(req, res);
    if (validationResponse) return validationResponse;

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found',
        code: 'NOT_FOUND',
      });
    }

    const isMember = community.members.some((id) => id.toString() === req.user.id);
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'Already a member',
        code: 'ALREADY_MEMBER',
      });
    }

    community.members.push(req.user.id);
    community.memberCount += 1;
    await community.save();
    if (community.creator.toString() !== req.user.id) {
      await Notification.create({ recipient: community.creator, type: 'join', message: `Someone joined your r/${community.name} community` });
    }
    return res.json({ success: true, message: 'Joined community' });
  } catch (err) {
    return next(err);
  }
};

const leaveCommunity = async (req, res, next) => {
  try {
    const validationResponse = validationError(req, res);
    if (validationResponse) return validationResponse;

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found',
        code: 'NOT_FOUND',
      });
    }

    const isMember = community.members.some((id) => id.toString() === req.user.id);
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'Not a member',
        code: 'NOT_MEMBER',
      });
    }

    community.members = community.members.filter((id) => id.toString() !== req.user.id);
    community.memberCount = Math.max(0, community.memberCount - 1);
    await community.save();

    return res.json({ success: true, message: 'Left community' });
  } catch (err) {
    return next(err);
  }
};

const getFlairs = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id).select('flairs name');
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
    return res.json({ success: true, flairs: community.flairs });
  } catch (err) { return next(err); }
};

const createFlair = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the moderator can create flairs' });
    }
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Flair name required' });
    community.flairs.push({ name, color: color || '#0079d3' });
    await community.save();
    return res.status(201).json({ success: true, flairs: community.flairs });
  } catch (err) { return next(err); }
};

const getPendingPosts = async (req, res, next) => {
  try {
    const Post = require('../posts/post.model');
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the moderator can view pending posts' });
    }
    const posts = await Post.find({ community: req.params.id, status: 'pending' })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    return res.json({ success: true, posts });
  } catch (err) { return next(err); }
};

const getCommunityByName = async (req, res, next) => {
  try {
    const community = await Community.findOne({ name: req.params.name.toLowerCase() })
      .populate('creator', 'username');
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    }
    return res.json({ success: true, community });
  } catch (err) { return next(err); }
};

const createJoinRequest = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' });

    const isMember = community.members.some(id => id.toString() === req.user.id);
    if (isMember) return res.status(400).json({ success: false, message: 'Already a member' });

    const existing = await JoinRequest.findOne({ community: req.params.id, requester: req.user.id });
    if (existing && existing.status === 'pending') {
      return res.json({ success: true, status: 'pending' });
    }
    if (existing) {
      existing.status = 'pending';
      await existing.save();
    } else {
      await JoinRequest.create({ community: req.params.id, requester: req.user.id });
    }

    const requester = await User.findById(req.user.id).select('username');
    await Notification.create({
      recipient: community.creator,
      sender: req.user.id,
      type: 'join_request',
      message: `u/${requester.username} wants to join r/${community.name}`,
      communityId: community._id,
      requesterId: req.user.id,
    });

    return res.json({ success: true, status: 'pending' });
  } catch (err) { return next(err); }
};

const handleJoinRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the moderator can handle join requests' });
    }

    const joinReq = await JoinRequest.findOne({ community: req.params.id, requester: req.params.requesterId });
    if (!joinReq) return res.status(404).json({ success: false, message: 'Join request not found' });

    joinReq.status = status;
    await joinReq.save();

    if (status === 'approved') {
      if (!community.members.some(id => id.toString() === req.params.requesterId)) {
        community.members.push(req.params.requesterId);
        community.memberCount += 1;
        await community.save();
      }
      await Notification.create({
        recipient: req.params.requesterId,
        sender: req.user.id,
        type: 'join_approved',
        message: `✅ Your request to join r/${community.name} has been approved! You are now a member.`,
        communityId: community._id,
      });
    } else {
      await Notification.create({
        recipient: req.params.requesterId,
        sender: req.user.id,
        type: 'join_rejected',
        message: `❌ Your request to join r/${community.name} has been rejected.`,
        communityId: community._id,
      });
    }

    return res.json({ success: true, status });
  } catch (err) { return next(err); }
};

const getJoinRequests = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' });
    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the moderator can view join requests' });
    }
    const requests = await JoinRequest.find({ community: req.params.id, status: 'pending' })
      .populate('requester', 'username')
      .sort({ createdAt: -1 });
    return res.json({ success: true, requests });
  } catch (err) { return next(err); }
};

module.exports = {
  createCommunity,
  getCommunity,
  listCommunities,
  searchCommunities,
  joinCommunity,
  leaveCommunity,
  getFlairs,
  createFlair,
  getPendingPosts,
  getCommunityByName,
  createJoinRequest,
  handleJoinRequest,
  getJoinRequests,
};
