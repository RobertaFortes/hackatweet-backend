const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/Tweet');
const dbHandler = require('../models/db-handler');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { extractHashtags } = require('../utils/hashtags');

let mongoServer;

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

const validTweet = { content: 'jhg g hgjhg kgkhgkhg hjg jhg #test #test2', author: 'alice', hashtags: extractHashtags('jhg g hgjhg kgkhgkhg hjg jhg #test #test2')};

describe('POST /api/tweets', () => {
  it('returns 400 when any field is missing', async () => {
    const res = await request(app).post('/api/tweets').send({ content: 'd hsdf hdfhdfhjhdcgjgsjsfjfgj #test'});
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 400 any field is missing', async () => {
    const res = await request(app).post('/api/tweets').send({ author: 'bob'});
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });
  
  it('returns 400 any field is missing', async () => {
    const res = await request(app).post('/api/tweets').send({ });
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 201 with on success', async () => {
    const res = await request(app).post('/api/tweets').send(validTweet);
    expect(res.status).toBe(201);
    expect(res.body.result).toBe(true);
    expect(res.body.tweet).toBeDefined();
    expect(res.body.tweet.content).toBe('jhg g hgjhg kgkhgkhg hjg jhg #test #test2');
    expect(res.body.tweet.author).toBe('alice');
    expect(res.body.tweet.hashtag).toBe('test, test2');
  });

//   it('stores the password as a bcrypt hash', async () => {
//     await request(app).post('/api/users/signup').send(validUser);
//     const user = await User.findOne({ username: 'alice' });
//     expect(user.password).not.toBe('secret123');
//     expect(user.password).toMatch(/^\$2[aby]\$/);
//   });

//   it('returns 409 when username or email already taken', async () => {
//     await request(app).post('/api/users/signup').send(validUser);
//     const res = await request(app).post('/api/users/signup').send({ ...validUser, email: 'other@test.com' });
//     expect(res.status).toBe(409);
//   });
// });

// describe('POST /api/users/signin', () => {
//   beforeEach(async () => {
//     await request(app).post('/api/users/signup').send(validUser);
//   });

//   it('returns 400 when fields are missing', async () => {
//     const res = await request(app).post('/api/users/signin').send({ password: 'secret123' });
//     expect(res.status).toBe(400);
//   });

//   it('returns 401 for wrong email or password', async () => {
//     const res = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'wrong' });
//     expect(res.status).toBe(401);
//   });

//   it('returns 200 with token on correct credentials', async () => {
//     const res = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'secret123' });
//     expect(res.status).toBe(200);
//     expect(res.body.result).toBe(true);
//     expect(res.body.token).toBeDefined();
//   });

//   it('rotates the token on each signin', async () => {
//     const first = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'secret123' });
//     const second = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'secret123' });
//     expect(first.body.token).not.toBe(second.body.token);
//   });
 });
