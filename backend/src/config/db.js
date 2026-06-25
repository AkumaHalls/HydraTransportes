const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

async function createCollections() {
  await connectDB();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name);

  const needed = ['configs', 'clients', 'services', 'corridas', 'drivers'];
  for (const name of needed) {
    if (!names.includes(name)) {
      await db.createCollection(name);
      console.log(`Created collection: ${name}`);
    }
  }
}

module.exports = { connectDB, createCollections };
