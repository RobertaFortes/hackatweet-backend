const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

// Cache the connection across invocations in serverless (e.g. Vercel),
// where the module is reused between requests but bin/www never runs.
let cached = global.mongooseConnection;
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectToDatabase;
