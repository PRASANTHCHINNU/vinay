const mongoose = require('mongoose');

const admissionRangeSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  regularEntry: {
    start: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^y\d{2}[a-z]{2}\d{3}$/i.test(v);
        },
        message: props => `${props.value} is not a valid regular admission number!`
      }
    },
    end: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^y\d{2}[a-z]{2}\d{3}$/i.test(v);
        },
        message: props => `${props.value} is not a valid regular admission number!`
      }
    }
  },
  lateralEntry: {
    start: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^l\d{2}[a-z]{2}\d{3}$/i.test(v);
        },
        message: props => `${props.value} is not a valid lateral admission number!`
      }
    },
    end: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^l\d{2}[a-z]{2}\d{3}$/i.test(v);
        },
        message: props => `${props.value} is not a valid lateral admission number!`
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Add validation to ensure end number is greater than start number
admissionRangeSchema.pre('save', function(next) {
  const getNumber = (admissionNo) => parseInt(admissionNo.slice(-3));
  
  // Check regular entry range
  if (getNumber(this.regularEntry.end) <= getNumber(this.regularEntry.start)) {
    next(new Error('Regular entry end number must be greater than start number'));
  }
  
  // Check lateral entry range
  if (getNumber(this.lateralEntry.end) <= getNumber(this.lateralEntry.start)) {
    next(new Error('Lateral entry end number must be greater than start number'));
  }
  
  next();
});

const AdmissionRange = mongoose.model('AdmissionRange', admissionRangeSchema);

module.exports = AdmissionRange; 