const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

beforeAll(async () => {
  const uri = process.env.MONGODB_URI.replace('/hackatweet?', '/hackatweet_test?');
  await mongoose.connect(uri);
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});

const validUser = { username: 'alice', email: 'alice@test.com', password: 'secret123' };

describe('POST /api/users/signup', () => {
  it('returns 400 when any field is missing', async () => {
    const res = await request(app).post('/api/users/signup').send({ email: 'a@a.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/users/signup').send({ username: 'bob', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.result).toBe(false);
  });

  it('returns 201 with token and username on success', async () => {
    const res = await request(app).post('/api/users/signup').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.result).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.username).toBe('alice');
  });

  it('stores the password as a bcrypt hash', async () => {
    await request(app).post('/api/users/signup').send(validUser);
    const user = await User.findOne({ username: 'alice' });
    expect(user.password).not.toBe('secret123');
    expect(user.password).toMatch(/^\$2[aby]\$/);
  });

  it('returns 409 when username or email already taken', async () => {
    await request(app).post('/api/users/signup').send(validUser);
    const res = await request(app).post('/api/users/signup').send({ ...validUser, email: 'other@test.com' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/users/signin', () => {
  beforeEach(async () => {
    await request(app).post('/api/users/signup').send(validUser);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/users/signin').send({ password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong email or password', async () => {
    const res = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token on correct credentials', async () => {
    const res = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('rotates the token on each signin', async () => {
    const first = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'secret123' });
    const second = await request(app).post('/api/users/signin').send({ email: 'alice@test.com', password: 'secret123' });
    expect(first.body.token).not.toBe(second.body.token);
  });
});
