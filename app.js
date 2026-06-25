require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const connectToDatabase = require('./models/connection');
const usersRouter = require('./routes/users');
const tweetsRouter = require('./routes/tweets');

const app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Ensure a DB connection is established before handling any request.
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/api', (req, res) => res.json({ status: 'ok' }));
app.use('/api/users', usersRouter);
app.use('/api/tweets', tweetsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ result: false, error: 'Internal server error' });
});

module.exports = app;
