const Post = require('./post.model');
const Community = require('../communities/community.model');
const User = require('../auth/auth.model');

const createPost = async (req, res, next) => {
  try {
    const { title, content, community: communityId, flair, tags } = req.body;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ success: false, message: 'Community not found', code: 'NOT_FOUND' });
    if (!community.members.map((id) => id.toString()).includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You must join this community to post', code: 'NOT_MEMBER' });
    }
    const post = await Post.create({
      title, content, flair, tags: tags || [],
      image: req.file ? req.file.path : '',
      author: req.user.id,
      community: communityId,
    });
    await post.populate('author', 'username profilePicture');
    await post.populate('community', 'name');
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
    const { sort = 'best', page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;
    let posts;
    if (req.user) {
      const user = await User.findById(req.user.id).select('interests tags');
      const joinedCommunities = await Community.find({ members: req.user.id }).select('_id');
      const joinedIds = joinedCommunities.map((c) => c._id);
      posts = await Post.find({
        $or: [{ community: { $in: joinedIds } }, { tags: { $in: user.tags } }],
      })
        .sort({ createdAt: -1 })
        .populate('author', 'username profilePicture')
        .populate('community', 'name icon')
        .skip(skip)
        .limit(limit);
      if (sort === 'best') {
        posts = posts.map((p) => {
          const pObj = p.toObject();
          let score = pObj.upvotes;
          if (user.interests.some((i) => pObj.tags.includes(i))) score += 20;
          if (user.tags.some((t) => pObj.tags.includes(t))) score += 30;
          if (joinedIds.map((id) => id.toString()).includes(pObj.community._id.toString())) score += 50;
          score -= (Date.now() - new Date(pObj.createdAt)) / 3600000;
          return { ...pObj, _score: score };
        }).sort((a, b) => b._score - a._score);
      }
    } else {
      posts = await Post.find()
        .sort({ upvotes: -1, createdAt: -1 })
        .populate('author', 'username profilePicture')
        .populate('community', 'name icon')
        .limit(limit);
    }
    res.json({ success: true, posts });
  } catch (err) { next(err); }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your post', code: 'FORBIDDEN' });
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

module.exports = { createPost, getPost, getCommunityPosts, getFeed, deletePost, upvotePost, downvotePost };
