const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { getTweets, createTweet, deleteTweet, toggleLike, getTrends, getTweetsByHashtag } = require('../controllers/tweetController');

router.use(authMiddleware);

router.get('/trends', getTrends);
router.get('/hashtag/:tag', getTweetsByHashtag);
router.get('/', getTweets);
router.post('/', createTweet);
router.delete('/:id', deleteTweet)
router.put('/:id/like', toggleLike)

module.exports = router;
