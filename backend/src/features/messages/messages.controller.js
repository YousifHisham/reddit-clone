const { Thread, Message } = require('./message.model');

const getThreads = async (req, res, next) => {
  try {
    const { type, unread } = req.query;
    const filter = { participants: req.user.id };
    if (unread === 'true') filter.readBy = { $nin: [req.user.id] };
    const threads = await Thread.find(filter)
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username profilePicture');
    res.json({ success: true, threads });
  } catch (err) { next(err); }
};

const getMessages = async (req, res, next) => {
  try {
    const thread = await Thread.findOne({ _id: req.params.threadId, participants: req.user.id });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });
    const messages = await Message.find({ thread: req.params.threadId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profilePicture');
    res.json({ success: true, messages });
  } catch (err) { next(err); }
};

const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, content, threadId } = req.body;
    if (!recipientId && !threadId) return res.status(400).json({ success: false, message: 'recipientId or threadId required' });

    let thread;
    if (threadId) {
      thread = await Thread.findOne({ _id: threadId, participants: req.user.id });
    } else {
      thread = await Thread.findOne({ participants: { $all: [req.user.id, recipientId], $size: 2 } });
    }

    if (!thread) {
      if (!recipientId) return res.status(400).json({ success: false, message: 'recipientId required' });
      thread = await Thread.create({ participants: [req.user.id, recipientId], readBy: [req.user.id] });
    }

    if (!content?.trim()) {
      await thread.populate('participants', 'username profilePicture');
      return res.status(201).json({ success: true, thread, threadId: thread._id });
    }

    const message = await Message.create({ thread: thread._id, sender: req.user.id, content: content.trim() });
    await message.populate('sender', 'username profilePicture');

    thread.lastMessage = content.trim();
    thread.lastMessageAt = new Date();
    thread.readBy = [req.user.id];
    await thread.save();

    res.status(201).json({ success: true, message, threadId: thread._id });
  } catch (err) { next(err); }
};

const markThreadRead = async (req, res, next) => {
  try {
    const thread = await Thread.findOne({ _id: req.params.threadId, participants: req.user.id });
    if (!thread) return res.status(404).json({ success: false, message: 'Thread not found' });
    if (!thread.readBy.map(id => id.toString()).includes(req.user.id)) {
      thread.readBy.push(req.user.id);
      await thread.save();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getThreads, getMessages, sendMessage, markThreadRead };
