const mongoose = require('mongoose');

const eventQuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  participantType: {
    type: String,
    enum: ['college', 'any'],
    default: 'college'
  },
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  spotRegistrationEnabled: {
    type: Boolean,
    default: false
  },
  maxParticipants: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  instructions: {
    type: String
  },
  passingMarks: {
    type: Number,
    default: 0
  },
  totalMarks: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  registrations: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String,
    college: String,
    department: String,
    year: String,
    registeredAt: {
      type: Date,
      default: Date.now
    },
    isSpotRegistration: {
      type: Boolean,
      default: false
    }
  }],
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'completed', 'cancelled'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Add index for efficient queries
eventQuizSchema.index({ startTime: 1, endTime: 1, status: 1 });
eventQuizSchema.index({ 'registrations.student': 1 });

module.exports = mongoose.model('EventQuiz', eventQuizSchema); 