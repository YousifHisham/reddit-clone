try {
  module.exports = require('../src/server.js');
} catch (err) {
  console.error('STARTUP CRASH:', err);
  module.exports = (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err.message, stack: err.stack });
  };
}
