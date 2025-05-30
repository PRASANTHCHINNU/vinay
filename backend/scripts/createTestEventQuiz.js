const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

async function createTestEventQuiz() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/quiz', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Find an admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found');
      return;
    }

    // Create test event quiz
    const quiz = new Quiz({
      title: 'Test Event Quiz',
      type: 'event',
      eventDetails: {
        name: 'Test Event',
        description: 'This is a test event quiz',
        organizer: 'Test Organizer',
        venue: 'Test Venue'
      },
      createdBy: admin._id,
      duration: 30,
      totalMarks: 10,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      questions: [
        {
          question: 'What is the capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctAnswer: 2,
          marks: 5
        },
        {
          question: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
          correctAnswer: 1,
          marks: 5
        }
      ],
      allowedGroups: [
        {
          year: 1,
          department: 'Computer Science',
          section: 'A'
        }
      ]
    });

    await quiz.save();
    console.log('Test event quiz created successfully');
  } catch (error) {
    console.error('Error creating test event quiz:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestEventQuiz(); 