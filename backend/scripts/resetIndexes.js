const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/test'; // Update this if your database URI is different

async function resetIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the sections collection
    const db = mongoose.connection.db;
    const sectionsCollection = db.collection('sections');

    // Drop all existing indexes
    console.log('Dropping all indexes...');
    await sectionsCollection.dropIndexes();
    console.log('All indexes dropped');

    // Create the new compound index
    console.log('Creating new compound index...');
    await sectionsCollection.createIndex(
      { name: 1, department: 1, year: 1, semester: 1 },
      { unique: true }
    );
    console.log('New index created successfully');

    // Verify indexes
    const indexes = await sectionsCollection.indexes();
    console.log('Current indexes:', indexes);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetIndexes(); 