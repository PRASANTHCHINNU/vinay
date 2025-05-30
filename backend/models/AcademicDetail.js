const mongoose = require('mongoose');

const academicDetailSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 1
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  sections: {
    type: String,  // Store as comma-separated string: "A,B,C"
    required: true,
    validate: {
      validator: function(sections) {
        // Check if sections string is not empty and follows format
        if (!sections) return false;
        const sectionArray = sections.split(',').map(s => s.trim());
        return sectionArray.length > 0 && sectionArray.every(s => /^[A-Z]$/.test(s));
      },
      message: 'Sections must be comma-separated single uppercase letters (e.g., "A,B,C")'
    }
  },
  subjects: {
    type: String,  // Store as comma-separated string: "Programming Fundamentals(CS101),Digital Logic(CS102)"
    default: '',
    validate: {
      validator: function(subjects) {
        // Empty subjects string is allowed
        if (!subjects) return true;
        const subjectArray = subjects.split(',').map(s => s.trim());
        // Allow empty subjects array or validate format
        return subjectArray.length === 0 || 
               subjectArray.every(s => /^.+\([A-Z]{2}\d{3}\)$/.test(s));
      },
      message: 'Subjects must be in format: Subject Name(CODE) and comma-separated'
    }
  },
  credits: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true
});

// Add a compound unique index for department, year, and semester
academicDetailSchema.index({ department: 1, year: 1, semester: 1 }, { unique: true });

// Add methods to get valid sections for a semester
academicDetailSchema.statics.getValidSectionsForSemester = function(semester) {
  // You can customize this logic based on your requirements
  const defaultSections = ['A', 'B', 'C'];
  return defaultSections;
};

// Add middleware to validate sections before saving
academicDetailSchema.pre('save', function(next) {
  const validSections = academicDetailSchema.statics.getValidSectionsForSemester(this.semester);
  const currentSections = this.sections.split(',').map(s => s.trim());
  
  // Check if all sections are valid for this semester
  const invalidSections = currentSections.filter(s => !validSections.includes(s));
  if (invalidSections.length > 0) {
    next(new Error(`Invalid sections ${invalidSections.join(', ')} for semester ${this.semester}`));
  } else {
    next();
  }
});

const AcademicDetail = mongoose.model('AcademicDetail', academicDetailSchema);
module.exports = AcademicDetail; 