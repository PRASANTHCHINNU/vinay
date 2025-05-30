const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOption: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  marks: {
    type: Number,
    required: true,
    default: 0
  }
});

const quizSubmissionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  submitTime: {
    type: Date
  },
  duration: {
    type: Number, // Duration in minutes
    min: 0
  },
  status: {
    type: String,
    enum: ['started', 'submitted', 'evaluated'],
    default: 'started'
  },
  answers: [answerSchema],
  totalMarks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient querying
quizSubmissionSchema.index({ quiz: 1, student: 1 });

// Calculate duration before saving if submitTime exists
quizSubmissionSchema.pre('save', function(next) {
  if (this.submitTime && this.startTime) {
    this.duration = Math.ceil((this.submitTime - this.startTime) / (1000 * 60));
  }
  next();
});

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema); 