const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [{
      type: String,
      required: true,
      trim: true
    }],
    validate: {
      validator: function(options) {
        return options.length === 4;
      },
      message: 'Each question must have exactly 4 options'
    },
    required: true
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  marks: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['academic', 'event'],
    required: true,
    default: 'academic'
  },
  subject: {
    code: {
      type: String,
      required: function() {
        return this.type === 'academic';
      },
      trim: true
    },
    name: {
      type: String,
      required: function() {
        return this.type === 'academic';
      },
      trim: true
    }
  },
  eventDetails: {
    name: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    },
    description: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    },
    organizer: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    },
    venue: {
      type: String,
      required: function() {
        return this.type === 'event';
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 1,
    default: function() {
      return this.questions ? this.questions.reduce((sum, q) => sum + q.marks, 0) : 0;
    }
  },
  questions: {
    type: [questionSchema],
    required: true,
    validate: {
      validator: function(questions) {
        return questions.length > 0;
      },
      message: 'Quiz must have at least one question'
    }
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(endTime) {
        // Skip validation if startTime is not set (this happens during updates)
        if (!this.startTime) return true;
        return endTime > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowedGroups: [{
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4
    },
    department: {
      type: String,
      required: true
    },
    section: {
      type: String,
      required: true
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 2
    }
  }],
  sectionEndTimes: {
    type: Map,
    of: {
      endTime: {
        type: Date,
        required: true,
        validate: {
          validator: function(endTime) {
            return endTime > this.startTime;
          },
          message: 'Section end time must be after quiz start time'
        }
      },
      isActive: {
        type: Boolean,
        default: true
      }
    },
    default: new Map()
  },
  // New fields for section-specific settings
  sectionSettings: {
    type: Map,
    of: {
      shuffleQuestions: {
        type: Boolean,
        default: false
      },
      shuffleOptions: {
        type: Boolean,
        default: false
      },
      allowedAttempts: {
        type: Number,
        default: 1,
        min: 1
      },
      instructions: {
        type: String,
        trim: true
      }
    },
    default: new Map()
  }
}, {
  timestamps: true
});

// Index for efficient querying
quizSchema.index({
  isActive: 1,
  'allowedGroups.department': 1,
  'allowedGroups.year': 1,
  'allowedGroups.section': 1
});

// Virtual field for submissions
quizSchema.virtual('submissions', {
  ref: 'QuizSubmission',
  localField: '_id',
  foreignField: 'quiz'
});

// Enable virtuals in JSON
quizSchema.set('toJSON', { virtuals: true });
quizSchema.set('toObject', { virtuals: true });

// Method to check if a student can access this quiz
quizSchema.methods.canStudentAccess = function(student) {
  return (
    this.isActive &&
    this.allowedGroups.some(group => 
      group.department === student.department &&
      group.year === student.year &&
      group.section === student.section &&
      (!this.sectionEndTimes.has(student.section) || 
       (this.sectionEndTimes.get(student.section).isActive &&
        new Date() < this.sectionEndTimes.get(student.section).endTime))
    )
  );
};

// Method to get section-specific settings
quizSchema.methods.getSectionSettings = function(section) {
  return this.sectionSettings.get(section) || {
    shuffleQuestions: false,
    shuffleOptions: false,
    allowedAttempts: 1,
    instructions: ''
  };
};

// Middleware to calculate total marks before saving
quizSchema.pre('save', function(next) {
  if (this.questions) {
    this.totalMarks = this.questions.reduce((sum, question) => sum + question.marks, 0);
  }
  next();
});

// Add a custom method to validate dates
quizSchema.statics.validateDates = function(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start time');
  }
  
  if (isNaN(end.getTime())) {
    throw new Error('Invalid end time');
  }
  
  if (end <= start) {
    throw new Error('End time must be after start time');
  }
  
  return true;
};

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz; 