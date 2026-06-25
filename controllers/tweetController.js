const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const { extractHashtags } = require('../utils/hashtags');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

exports.getTweets = asyncHandler(async (req, res) => { 
  try {
    const tweets = await Tweet.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.json({ result: true, tweets });
  } catch (error) {
    res.status(500).json({ result: false, error: error.message });
  }});

exports.createTweet = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        result: false,
        error: 'content is required',
      });
    }

    const tweet = new Tweet({
      content,
      author: req.user._id,
      hashtags: extractHashtags(content),
    });

    await tweet.save();

    res.status(201).json({
      result: true,
      tweet,
    });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});
exports.deleteTweet = asyncHandler(async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        result: false,
        error: 'Invalid tweet id',
      });
    }

    const tweet = await Tweet.findByIdAndDelete(req.params.id);

    if (!tweet) {
      return res.json({
        result: false,
        error: 'Tweet not found',
      });
    }

    res.json({ result: true });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});

exports.toggleLike = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id.toString();

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        result: false,
        error: 'Invalid tweet id',
      });
    }

    const tweet = await Tweet.findById(req.params.id);

    if (!tweet) {
      return res.json({
        result: false,
        error: 'Tweet not found',
      });
    }

    const alreadyLiked = tweet.likes.includes(userId);

    if (alreadyLiked) {
      tweet.likes = tweet.likes.filter(
        id => id.toString() !== userId
      );
    } else {
      tweet.likes.push(userId);
    }

    await tweet.save();

    res.json({
      result: true,
      likesCount: tweet.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});

exports.getTrends = asyncHandler(async (req, res) => {
  try {
    const trends = await Tweet.aggregate([
      { $unwind: '$hashtags' },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      result: true,
      trends,
    });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});

exports.getTweetsByHashtag = asyncHandler(async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase();

    const tweets = await Tweet.find({
      hashtags: tag,
    })
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.json({
      result: true,
      tweets,
    });
  } catch (error) {
    res.status(500).json({
      result: false,
      error: error.message,
    });
  }
});