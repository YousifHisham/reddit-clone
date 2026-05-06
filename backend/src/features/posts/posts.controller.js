const Post = require('./post.model');
const Community = require('../communities/community.model');
const User = require('../auth/auth.model');
const Notification = require('../notifications/notification.model');
const { cloudinary } = require('../../config/cloudinary');

const createPost = async (req, res, next) => {
  try {
    const { title, content, community: communityId, flair, flairColor, tags, nsfw } = req.body;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    if (!community.members.map((id) => id.toString()).includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You must join this community to post', code: 'NOT_MEMBER' });
    }
    const status = community.requiresApproval ? 'pending' : 'published';
    const post = await Post.create({
      title, content, flair, flairColor: flairColor || '', tags: tags || [],
      nsfw: nsfw === true || nsfw === 'true',
      image: req.file ? req.file.path : '',
      author: req.user.id,
      community: communityId,
      status,
    });
    await post.populate('author', 'username profilePicture');
    await post.populate('community', 'name');
    if (status === 'pending') {
      const author = await User.findById(req.user.id).select('username');
      await Notification.create({
        recipient: community.creator,
        sender: req.user.id,
        type: 'post_approval',
        message: `u/${author.username} submitted a post in r/${community.name}: "${title}"`,
        postId: post._id,
        authorId: req.user.id,
        communityId: community._id,
      });
    }
    res.status(201).json({ success: true, post });
  } catch (err) { next(err); }
};

const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username profilePicture')
      .populate('community', 'name icon');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    res.json({ success: true, post });
  } catch (err) { next(err); }
};

const getCommunityPosts = async (req, res, next) => {
  try {
    const { sort = 'new' } = req.query;
    const sortMap = { new: { createdAt: -1 }, top: { upvotes: -1 }, hot: { upvotes: -1, createdAt: -1 } };
    const posts = await Post.find({ community: req.params.id })
      .sort(sortMap[sort] || { createdAt: -1 })
      .populate('author', 'username profilePicture')
      .limit(20);
    res.json({ success: true, posts });
  } catch (err) { next(err); }
};

const getFeed = async (req, res, next) => {
  try {
    const { sort = 'hot', page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    const filter = { status: 'published' };
    let sortQuery = { upvotes: -1, createdAt: -1 };

    if (sort === 'new') sortQuery = { createdAt: -1 };
    else if (sort === 'top') sortQuery = { upvotes: -1 };
    else if (sort === 'rising') {
      filter.createdAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      sortQuery = { upvotes: -1 };
    }
    // hot: default sortQuery (upvotes + recency)

    if (req.user) {
      const joinedCommunities = await Community.find({ members: req.user.id }).select('_id');
      const joinedIds = joinedCommunities.map((c) => c._id);
      filter.$or = [{ community: { $in: joinedIds } }, {}];
    }

    const posts = await Post.find(filter)
      .sort(sortQuery)
      .populate('author', 'username profilePicture')
      .populate('community', 'name icon')
      .skip(skip)
      .limit(limit);

    res.json({ success: true, posts });
  } catch (err) { next(err); }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your post', code: 'FORBIDDEN' });
    }
    post.content = req.body.body ?? post.content;
    await post.save();
    await post.populate('author', 'username profilePicture');
    await post.populate('community', 'name icon');
    res.json({ success: true, post });
  } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your post', code: 'FORBIDDEN' });
    }
    if (post.image) {
      const publicId = post.image.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};

const upvotePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyUpvoted = post.upvoters.map((id) => id.toString()).includes(userId);
    if (alreadyUpvoted) {
      post.upvoters.pull(userId);
      post.upvotes = Math.max(0, post.upvotes - 1);
      await User.findByIdAndUpdate(post.author, { $inc: { postKarma: -1 } });
    } else {
      post.downvoters.pull(userId);
      if (post.downvoters.length < post.downvotes) post.downvotes = Math.max(0, post.downvotes - 1);
      post.upvoters.push(userId);
      post.upvotes += 1;
      await User.findByIdAndUpdate(post.author, { $inc: { postKarma: 1 } });
      if (post.author.toString() !== userId) {
        await Notification.create({ recipient: post.author, type: 'upvote', message: 'Someone upvoted your post' });
      }
    }
    await post.save();
    res.json({ success: true, upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (err) { next(err); }
};

const downvotePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyDownvoted = post.downvoters.map((id) => id.toString()).includes(userId);
    if (alreadyDownvoted) {
      post.downvoters.pull(userId);
      post.downvotes = Math.max(0, post.downvotes - 1);
    } else {
      post.upvoters.pull(userId);
      if (post.upvoters.length < post.upvotes) {
        post.upvotes = Math.max(0, post.upvotes - 1);
        await User.findByIdAndUpdate(post.author, { $inc: { postKarma: -1 } });
      }
      post.downvoters.push(userId);
      post.downvotes += 1;
    }
    await post.save();
    res.json({ success: true, upvotes: post.upvotes, downvotes: post.downvotes });
  } catch (err) { next(err); }
};

const updatePostStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['published', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('community', 'name creator');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.community.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the moderator can update post status' });
    }
    post.status = status;
    await post.save();
    const emoji = status === 'published' ? '✅' : '❌';
    const verb = status === 'published' ? 'approved' : 'rejected';
    const notifType = status === 'published' ? 'post_approved' : 'post_rejected';
    await Notification.create({
      recipient: post.author._id,
      sender: req.user.id,
      type: notifType,
      message: `${emoji} Your post "${post.title}" was ${verb} in r/${post.community.name}`,
      postId: post._id,
      communityId: post.community._id,
    });
    res.json({ success: true, post });
  } catch (err) { next(err); }
};

module.exports = { createPost, getPost, getCommunityPosts, getFeed, deletePost, updatePost, updatePostStatus, upvotePost, downvotePost };
