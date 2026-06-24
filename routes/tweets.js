const router = require('express').Router();
const { getTweets, createTweet, deleteTweet, toggleLike, getTrends, getTweetsByHashtag } = require('../controllers/tweetController');

router.get('/', getTweets);
router.post('/', createTweet);
router.delete('/:id', deleteTweet)
router.put('/:id/like', toggleLike)
router.get('/trends', getTrends);
router.get('/hashtag/:tag', getTweetsByHashtag);

module.exports = router;
