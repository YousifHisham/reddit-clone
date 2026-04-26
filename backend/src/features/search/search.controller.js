const Post = require('../posts/post.model');
const Community = require('../communities/community.model');
const User = require('../auth/auth.model');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all';
    if (!q) return res.json({ success: true, posts: [], communities: [], users: [] });

    const regex = { $regex: escapeRegex(q), $options: 'i' };

    const [posts, communities, users] = await Promise.all([
      (type === 'all' || type === 'posts')
        ? Post.find({ $or: [{ title: regex }, { content: regex }], status: 'published' })
            .populate('author', 'username profilePicture')
            .populate('community', 'name icon')
            .limit(10)
        : Promise.resolve([]),
      (type === 'all' || type === 'communities')
        ? Community.find({ $or: [{ name: regex }, { description: regex }] })
            .select('name description memberCount icon banner')
            .limit(10)
        : Promise.resolve([]),
      (type === 'all' || type === 'people')
        ? User.find({ username: regex })
            .select('username profilePicture postKarma commentKarma')
            .limit(10)
        : Promise.resolve([]),
    ]);

    return res.json({ success: true, posts, communities, users });
  } catch (err) { return next(err); }
};

module.exports = { search };
