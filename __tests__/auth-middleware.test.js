const request = require('supertest');
const app = require('../app');

describe('auth middleware', () => {
  async function signup() {
    const res = await request(app)
      .post('/api/users/signup')
      .send({ username: 'alice', email: 'alice@test.com', password: 'secret123' });
    return res.body.token;
  }

  it('returns 401 when the Authorization header is missing', async () => {
    const res = await request(app).get('/api/tweets');
    expect(res.status).toBe(401);
    expect(res.body.result).toBe(false);
    expect(res.body.error).toMatch(/missing or malformed/i);
  });

  it('returns 401 when the header is malformed (no Bearer prefix)', async () => {
    const res = await request(app).get('/api/tweets').set('Authorization', 'sometoken');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing or malformed/i);
  });

  it('returns 401 for an unknown token', async () => {
    const res = await request(app)
      .get('/api/tweets')
      .set('Authorization', 'Bearer does-not-exist');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  it('allows the request and injects req.user for a valid token', async () => {
    const token = await signup();
    const res = await request(app).get('/api/tweets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(true);
  });
});
