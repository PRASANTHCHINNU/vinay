const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Subject = require('../models/Subject');

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/college_quiz_app');
    console.log('Connected to MongoDB');

    // Create test faculty user
    const hashedPassword = await bcrypt.hash('test123', 10);
    const faculty = await User.findOneAndUpdate(
      { email: 'faculty@test.com' },
      {
        name: 'Test Faculty',
        email: 'faculty@test.com',
        password: hashedPassword,
        role: 'faculty',
        department: 'Computer Science'
      },
      { upsert: true, new: true }
    );
    console.log('Created faculty user:', faculty.email);

    // Create test subject
    const subject = await Subject.findOneAndUpdate(
      { code: 'CS101' },
      {
        name: 'Introduction to Computer Science',
        code: 'CS101',
        department: 'Computer Science',
        credits: 3
      },
      { upsert: true, new: true }
    );
    console.log('Created subject:', subject.code);

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

seed(); 