const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  originalPassword: {
    type: String,
    required: false // Not required for existing users
  },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'student', 'event'],
    default: 'student'
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  year: {
    type: Number,
    required: function() {
      return this.role === 'student';
    },
    min: 1,
    max: 4
  },
  semester: {
    type: Number,
    required: function() {
      return this.role === 'student';
    },
    min: 1,
    max: 8
  },
  section: {
    type: String,
    required: function() {
      return this.role === 'student';
    }
  },
  admissionNumber: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    unique: true,
    sparse: true
  },
  isLateral: {
    type: Boolean,
    default: false
  },
  departments: {
    type: [String],
    required: function() {
      return this.role === 'faculty' || this.role === 'event';
    },
    validate: {
      validator: function(v) {
        if (this.role !== 'faculty' && this.role !== 'event') return true;
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Must have at least one department'
    }
  },
  years: {
    type: [String],
    required: function() {
      return this.role === 'faculty' || this.role === 'event';
    },
    validate: {
      validator: function(v) {
        if (this.role !== 'faculty' && this.role !== 'event') return true;
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Must have at least one year'
    }
  },
  semesters: {
    type: [String],
    required: function() {
      return this.role === 'faculty' || this.role === 'event';
    },
    validate: {
      validator: function(v) {
        if (this.role !== 'faculty' && this.role !== 'event') return true;
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Must have at least one semester'
    }
  },
  sections: {
    type: [String],
    required: function() {
      return this.role === 'faculty' || this.role === 'event';
    },
    validate: {
      validator: function(v) {
        if (this.role !== 'faculty' && this.role !== 'event') return true;
        return Array.isArray(v) && v.length > 0 && v.every(section => /^[A-Z]$/.test(section));
      },
      message: 'Must have at least one valid section (A-Z)'
    }
  },
  assignments: {
    type: [{
      department: {
        type: String,
        required: true
      },
      year: {
        type: String,
        required: true
      },
      semester: {
        type: String,
        required: true
      },
      sections: {
        type: [String],
        required: true,
        validate: {
          validator: function(v) {
            return Array.isArray(v) && v.length > 0 && v.every(section => /^[A-Z]$/.test(section));
          },
          message: 'Each assignment must have at least one valid section (A-Z)'
        }
      }
    }],
    required: function() {
      return this.role === 'faculty' || this.role === 'event';
    },
    validate: {
      validator: function(v) {
        if (this.role !== 'faculty' && this.role !== 'event') return true;
        return Array.isArray(v) && v.length > 0;
      },
      message: 'Must have at least one assignment'
    }
  },
  isEventQuizAccount: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (this.isModified('password') && !this.password.startsWith('$2a$')) {
    try {
      // Store original password
      this.originalPassword = this.password;
      
      // Hash password for authentication
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Pre-save hook to validate faculty assignments match their permissions
UserSchema.pre('save', function(next) {
  if (this.role === 'faculty') {
    // Validate that assignments only contain allowed departments, years, semesters, and sections
    const validAssignments = this.assignments.every(assignment => {
      return (
        this.departments.includes(assignment.department) &&
        this.years.includes(assignment.year) &&
        this.semesters.includes(assignment.semester) &&
        assignment.sections.every(section => this.sections.includes(section))
      );
    });

    if (!validAssignments) {
      next(new Error('Faculty assignments must match their allowed departments, years, semesters, and sections'));
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);