const bcrypt = require('bcrypt');
const uid2 = require('uid2');
const User = require('../models/User');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

exports.signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ result: false, error: 'All fields are required' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ result: false, error: 'Invalid email format' });
  }

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (exists) {
    return res.status(409).json({ result: false, error: 'Username or email already taken' });
  }

  const hash = await bcrypt.hash(password, 10);
  const token = uid2(32);
  const user = await new User({ username, email, password: hash, token }).save();

  res.status(201).json({ result: true, token: user.token, username: user.username });
});

exports.signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ result: false, error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ result: false, error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ result: false, error: 'Invalid credentials' });
  }

  user.token = uid2(32);
  await user.save();

  res.json({ result: true, token: user.token, username: user.username });
});
