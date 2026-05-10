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
    const posts = await Post.find({ community: req.params.id, status: 'published' })
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
    } else if (sort === 'popular') {
      filter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      sortQuery = { upvotes: -1 };
    }
    // hot: default sortQuery (upvotes + recency)

    if (req.user) {
      const joinedCommunities = await Community.find({ members: req.user.id }).select('_id');
      const joinedIds = joinedCommunities.map((c) => c._id);
      if (joinedIds.length > 0) {
        filter.community = { $in: joinedIds };
      }
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

const summarizePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username')
      .populate('community', 'name');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ success: false, message: 'AI summarization is not configured' });
    }

    const postText = [
      `Title: ${post.title}`,
      post.content ? `Body: ${post.content}` : null,
      `Community: r/${post.community?.name}`,
      `Author: u/${post.author?.username}`,
      `Score: ${post.upvotes - post.downvotes} points`,
      `Comments: ${post.commentCount}`,
    ].filter(Boolean).join('\n');

    const userContent = post.image
      ? [
          { type: 'text', text: `Summarize this Reddit post in 2-3 sentences. The post includes an image — describe what you see in it and how it relates to the post:\n\n${postText}` },
          { type: 'image_url', image_url: { url: post.image } },
        ]
      : `Summarize this Reddit post in 2-3 sentences and mention 1-2 key things a reader should know:\n\n${postText}`;

    const model = post.image ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.1-8b-instant';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes Reddit posts concisely.' },
          { role: 'user', content: userContent },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Groq error]', response.status, JSON.stringify(data));
      return res.status(502).json({ success: false, message: data.error?.message || 'AI service error' });
    }

    const summary = data.choices?.[0]?.message?.content || 'Could not generate summary.';
    return res.json({ success: true, summary });
  } catch (err) {
    return next(err);
  }
};

const saveDraft = async (req, res, next) => {
  try {
    const { title, content, community: communityId, url } = req.body;
    const post = await Post.create({
      title: title || 'Untitled Draft',
      content: content || '',
      url: url || '',
      image: req.file ? req.file.path : '',
      author: req.user.id,
      community: communityId || undefined,
      status: 'draft',
    });
    res.status(201).json({ success: true, post });
  } catch (err) { next(err); }
};

const getDrafts = async (req, res, next) => {
  try {
    const posts = await Post.find({ author: req.user.id, status: 'draft' })
      .sort({ createdAt: -1 })
      .populate('community', 'name');
    res.json({ success: true, posts });
  } catch (err) { next(err); }
};

module.exports = { createPost, getPost, getCommunityPosts, getFeed, deletePost, updatePost, updatePostStatus, upvotePost, downvotePost, summarizePost, saveDraft, getDrafts };
