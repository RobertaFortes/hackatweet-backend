const request = require('supertest');
const app = require('../app');
const Tweet = require('../models/Tweet');

async function createUserAndToken(overrides = {}) {
  const user = {
    username: 'alice',
    email: 'alice@test.com',
    password: 'secret123',
    ...overrides,
  };
  const res = await request(app).post('/api/users/signup').send(user);
  return { token: res.body.token, username: res.body.username };
}

async function createTweet(token, content) {
  const res = await request(app)
    .post('/api/tweets')
    .set('Authorization', `Bearer ${token}`)
    .send({ content });
  return res.body.tweet;
}

describe('POST /api/tweets', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).post('/api/tweets').send({ content: 'hello #world' });
    expect(res.status).toBe(401);
    expect(res.body.result).toBe(false);
  });

  it('returns 400 when content is missing', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 400 when content is only whitespace', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 201 and extracts hashtags on success', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello #World and #world again #js' });
    expect(res.status).toBe(201);
    expect(res.body.result).toBe(true);
    expect(res.body.tweet).toBeDefined();
    expect(res.body.tweet.content).toBe('Hello #World and #world again #js');
    expect(res.body.tweet.author).toBeDefined();
    expect(res.body.tweet.hashtags).toEqual(['world', 'js']);
    expect(res.body.tweet.likes).toEqual([]);
  });

  it('rejects content longer than 280 characters', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .post('/api/tweets')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'a'.repeat(281) });
    expect(res.status).toBe(500);
    expect(res.body.result).toBe(false);
  });
});

describe('GET /api/tweets', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/api/tweets');
    expect(res.status).toBe(401);
  });

  it('returns an empty list when there are no tweets', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app).get('/api/tweets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(true);
    expect(res.body.tweets).toEqual([]);
  });

  it('returns tweets sorted by createdAt desc with populated author', async () => {
    const { token, username } = await createUserAndToken();
    await createTweet(token, 'first tweet');
    await createTweet(token, 'second tweet');

    const res = await request(app).get('/api/tweets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(2);
    expect(res.body.tweets[0].content).toBe('second tweet');
    expect(res.body.tweets[1].content).toBe('first tweet');
    expect(res.body.tweets[0].author.username).toBe(username);
    expect(res.body.tweets[0].author.password).toBeUndefined();
  });
});

describe('DELETE /api/tweets/:id', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).delete('/api/tweets/507f1f77bcf86cd799439011');
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid id', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .delete('/api/tweets/not-an-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 404 when the tweet does not exist', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .delete('/api/tweets/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.result).toBe(false);
  });

  it('returns 403 when deleting another user\'s tweet', async () => {
    const { token: aliceToken } = await createUserAndToken();
    const tweet = await createTweet(aliceToken, 'alice tweet');

    const { token: bobToken } = await createUserAndToken({ username: 'bob', email: 'bob@test.com' });
    const res = await request(app)
      .delete(`/api/tweets/${tweet._id}`)
      .set('Authorization', `Bearer ${bobToken}`);
    expect(res.status).toBe(403);
    expect(res.body.result).toBe(false);
    expect(await Tweet.findById(tweet._id)).not.toBeNull();
  });

  it('deletes the user\'s own tweet', async () => {
    const { token } = await createUserAndToken();
    const tweet = await createTweet(token, 'my tweet');

    const res = await request(app)
      .delete(`/api/tweets/${tweet._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(true);
    expect(await Tweet.findById(tweet._id)).toBeNull();
  });
});

describe('PUT /api/tweets/:id/like', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(app).put('/api/tweets/507f1f77bcf86cd799439011/like');
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid id', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .put('/api/tweets/not-an-id/like')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 404 when the tweet does not exist', async () => {
    const { token } = await createUserAndToken();
    const res = await request(app)
      .put('/api/tweets/507f1f77bcf86cd799439011/like')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('toggles a like on and off', async () => {
    const { token } = await createUserAndToken();
    const tweet = await createTweet(token, 'likeable tweet');

    const liked = await request(app)
      .put(`/api/tweets/${tweet._id}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(liked.status).toBe(200);
    expect(liked.body.likesCount).toBe(1);

    const unliked = await request(app)
      .put(`/api/tweets/${tweet._id}/like`)
      .set('Authorization', `Bearer ${token}`);
    expect(unliked.status).toBe(200);
    expect(unliked.body.likesCount).toBe(0);
  });
});

describe('GET /api/tweets/trends', () => {
  it('returns the top hashtags by count, sorted desc', async () => {
    const { token } = await createUserAndToken();
    await createTweet(token, 'one #js');
    await createTweet(token, 'two #js #node');
    await createTweet(token, 'three #js #node #node');

    const res = await request(app).get('/api/tweets/trends').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(true);

    expect(res.body.trends[0]).toEqual({ _id: 'js', count: 3 });
    expect(res.body.trends[1]).toEqual({ _id: 'node', count: 2 });
  });
});

describe('GET /api/tweets/hashtag/:tag', () => {
  it('returns only tweets with the hashtag, case-insensitive', async () => {
    const { token } = await createUserAndToken();
    await createTweet(token, 'about #js');
    await createTweet(token, 'about #python');

    const res = await request(app)
      .get('/api/tweets/hashtag/JS')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(1);
    expect(res.body.tweets[0].content).toBe('about #js');
  });
});
