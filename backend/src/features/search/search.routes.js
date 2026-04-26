const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.json({ success: true, posts: [], communities: [], users: [] }));
module.exports = router;
