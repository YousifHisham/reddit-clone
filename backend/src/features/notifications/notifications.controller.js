const Notification = require('./notification.model');

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    // Ensure postId is returned as a plain string so the frontend can use it directly in URLs
    const normalized = notifications.map(n => ({
      ...n,
      postId: n.postId ? n.postId.toString() : null,
      communityId: n.communityId ? n.communityId.toString() : null,
    }));
    res.json({ success: true, notifications: normalized });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getNotifications, markAllRead };
