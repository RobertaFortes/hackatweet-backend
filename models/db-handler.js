#!/usr/bin/env node 
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let originalEnv;

async function connect() {
  //  console.log('1 - création MongoMemoryServer');
  originalEnv = {
    connectionString: process.env.connectionString,
    node_env: process.env.node_env,
  };
  
  mongoServer = await MongoMemoryServer.create();
  // console.log('2 - serveur créé');

  const uri = mongoServer.getUri();
  // console.log('3 - uri:', uri);
  process.env.node_env = 'test';
  process.env.connectionString = uri;

  await mongoose.connect(uri);
  // console.log('4 - mongoose connecté');
}


async function clearDatabase() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }

};

async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  if (mongoServer) {
    await mongoServer.stop();
  }

  process.env.connectionString = originalEnv.connectionString;
  process.env.node_env = originalEnv.node_env;
};

module.exports = {
  connect,
  clearDatabase,
  closeDatabase,
};