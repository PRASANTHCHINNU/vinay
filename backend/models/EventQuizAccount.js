const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/encryption');

const eventQuizAccountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['department', 'organization'],
    default: 'department'
  },
  department: {
    type: String,
    required: function() {
      return this.eventType === 'department';
    },
    enum: [
      'Computer Science and Engineering',
      'Electronics and Communication Engineering',
      'Electrical and Electronics Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Information Technology'
    ]
  },
  originalPassword: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
eventQuizAccountSchema.index({ department: 1, email: 1 });

// Pre-save middleware to hash password and store original password
eventQuizAccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Store original password in encrypted form
    this.originalPassword = encrypt(this.password);
    
    // Hash password for authentication
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update middleware to handle password changes and updatedAt timestamp
eventQuizAccountSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.password) {
    try {
      // Store original password in encrypted form
      update.originalPassword = encrypt(update.password);
      
      // Hash password for authentication
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(update.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  update.updatedAt = new Date();
  next();
});

// Method to compare password
eventQuizAccountSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const EventQuizAccount = mongoose.model('EventQuizAccount', eventQuizAccountSchema);
module.exports = EventQuizAccount; 