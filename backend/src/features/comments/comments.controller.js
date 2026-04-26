const Comment = require('./comment.model');
const Post = require('../posts/post.model');
const User = require('../auth/auth.model');
const Notification = require('../notifications/notification.model');

const createComment = async (req, res, next) => {
  try {
    const { content, postId, parentId } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content required', code: 'VALIDATION_ERROR' });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found', code: 'NOT_FOUND' });

    let depth = 0;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ success: false, message: 'Parent comment not found', code: 'NOT_FOUND' });
      depth = parent.depth + 1;
    }

    const comment = await Comment.create({
      content: content.trim(),
      author: req.user.id,
      post: postId,
      parent: parentId || null,
      depth,
    });
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
    await comment.populate('author', 'username profilePicture');

    if (post.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.author,
        sender: req.user.id,
        type: 'comment',
        message: 'Someone commented on your post',
        postId: post._id,
      });
    }
    return res.status(201).json({ success: true, comment });
  } catch (err) { return next(err); }
};

const getComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('author', 'username profilePicture commentKarma');
    return res.json({ success: true, comments });
  } catch (err) { return next(err); }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your comment', code: 'FORBIDDEN' });
    }
    const postId = comment.post;
    const deleteSubtree = async (commentId) => {
      const children = await Comment.find({ parent: commentId });
      for (const child of children) await deleteSubtree(child._id);
      await Comment.findByIdAndDelete(commentId);
      await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
    };
    await deleteSubtree(comment._id);
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { return next(err); }
};

const upvoteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyUpvoted = comment.upvoters.map((id) => id.toString()).includes(userId);
    if (alreadyUpvoted) {
      comment.upvoters.pull(userId);
      comment.upvotes = Math.max(0, comment.upvotes - 1);
      await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: -1 } });
    } else {
      comment.downvoters.pull(userId);
      if (comment.downvoters.length < comment.downvotes) comment.downvotes = Math.max(0, comment.downvotes - 1);
      comment.upvoters.push(userId);
      comment.upvotes += 1;
      await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: 1 } });
    }
    await comment.save();
    return res.json({ success: true, upvotes: comment.upvotes, downvotes: comment.downvotes });
  } catch (err) { return next(err); }
};

const downvoteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found', code: 'NOT_FOUND' });
    const userId = req.user.id;
    const alreadyDownvoted = comment.downvoters.map((id) => id.toString()).includes(userId);
    if (alreadyDownvoted) {
      comment.downvoters.pull(userId);
      comment.downvotes = Math.max(0, comment.downvotes - 1);
    } else {
      comment.upvoters.pull(userId);
      if (comment.upvoters.length < comment.upvotes) {
        comment.upvotes = Math.max(0, comment.upvotes - 1);
        await User.findByIdAndUpdate(comment.author, { $inc: { commentKarma: -1 } });
      }
      comment.downvoters.push(userId);
      comment.downvotes += 1;
    }
    await comment.save();
    return res.json({ success: true, upvotes: comment.upvotes, downvotes: comment.downvotes });
  } catch (err) { return next(err); }
};

module.exports = { createComment, getComments, deleteComment, upvoteComment, downvoteComment };
