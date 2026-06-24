const User = require('../models/User');

module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ result: false, error: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];
  const user = await User.findOne({ token });

  if (!user) {
    return res.status(401).json({ result: false, error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};
