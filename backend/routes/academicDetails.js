const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { auth, authorize } = require('../middleware/auth');
const AcademicDetail = require('../models/AcademicDetail');

// Multer configuration for Excel file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.xlsx');
    
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Helper function to validate year-semester relationship
const validateYearSemester = (year, semester) => {
  const minSem = (year - 1) * 2 + 1;
  const maxSem = year * 2;
  return semester >= minSem && semester <= maxSem;
};

// Public GET routes - No authentication required

// Get all academic details
router.get('/', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    const query = {};

    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (semester) query.semester = parseInt(semester);

    const academicDetails = await AcademicDetail.find(query)
      .sort({ department: 1, year: 1, semester: 1 });
    res.json(academicDetails);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching academic details', error: error.message });
  }
});

// Get subjects for a specific department, year, and semester
router.get('/subjects', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    if (!department || !year || !semester) {
      return res.status(400).json({ message: 'Department, year, and semester are required' });
    }

    const academicDetail = await AcademicDetail.findOne({
      department,
      year: parseInt(year),
      semester: parseInt(semester)
    });

    if (!academicDetail) {
      return res.json([]);
    }

    // Convert subjects string to array of objects
    const subjects = academicDetail.subjects.split(',').map(subject => {
      const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
      return {
        name: match[1].trim(),
        code: match[2]
      };
    });

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
});

// Get sections for a specific department, year, and semester
router.get('/sections', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    if (!department || !year || !semester) {
      return res.status(400).json({ message: 'Department, year, and semester are required' });
    }

    const academicDetail = await AcademicDetail.findOne({
      department,
      year: parseInt(year),
      semester: parseInt(semester)
    });

    if (!academicDetail) {
      return res.json([]);
    }

    // Convert sections string to array
    const sections = academicDetail.sections.split(',').map(s => s.trim());
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sections', error: error.message });
  }
});

// Get academic structure for faculty - No auth required
router.get('/faculty-structure', async (req, res) => {
  try {
    // Get all academic details
    const academicDetails = await AcademicDetail.find()
      .sort({ department: 1, year: 1, semester: 1 });
    
    // Process academic details to get organized structure
    const structure = academicDetails.reduce((acc, detail) => {
      // Skip invalid details
      if (!detail || !detail.department || !detail.year || !detail.semester) {
        return acc;
      }

      // Add department if not exists
      if (!acc[detail.department]) {
        acc[detail.department] = {
          years: {}
        };
      }

      // Add year if not exists
      if (!acc[detail.department].years[detail.year]) {
        acc[detail.department].years[detail.year] = {
          semesters: {}
        };
      }

      // Add semester if not exists
      if (!acc[detail.department].years[detail.year].semesters[detail.semester]) {
        // Handle sections
        const sections = detail.sections ? detail.sections.split(',').map(s => s.trim()) : [];

        // Handle subjects
        let subjects = [];
        if (detail.subjects) {
          subjects = detail.subjects.split(',')
            .filter(s => s.trim()) // Filter out empty strings
            .map(s => {
              const match = s.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
              if (!match) {
                return null;
              }
              return {
                name: match[1].trim(),
                code: match[2]
              };
            })
            .filter(s => s !== null); // Filter out invalid subjects
        }

        acc[detail.department].years[detail.year].semesters[detail.semester] = {
          sections,
          subjects
        };
      }

      return acc;
    }, {});

    res.json(structure);
  } catch (error) {
    console.error('Error fetching academic structure:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Protected routes - Require authentication and admin role

// Create or update academic details
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { department, year, semester, sections, subjects, credits } = req.body;

    console.log('Received data:', req.body); // Debug log

    // Basic validation
    if (!department || !year || !semester || !sections) {
      return res.status(400).json({
        message: 'Department, year, semester, and sections are required'
      });
    }

    // Validate year-semester relationship
    if (!validateYearSemester(year, semester)) {
      return res.status(400).json({
        message: 'Invalid year-semester combination. Check that semester matches the year range.'
      });
    }

    // Validate sections format
    const sectionArray = sections.split(',').map(s => s.trim());
    if (!sectionArray.every(s => /^[A-Z]$/.test(s))) {
      return res.status(400).json({
        message: 'Sections must be single uppercase letters (e.g., A,B,C)'
      });
    }

    // Create or update the academic detail
    const academicDetail = await AcademicDetail.findOneAndUpdate(
      { department, year, semester },
      { 
        sections,
        subjects: subjects || '',
        credits: credits || 3
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    );

    console.log('Created/Updated academic detail:', academicDetail); // Debug log
    res.status(201).json(academicDetail);
  } catch (error) {
    console.error('Server error:', error); // Debug log
    res.status(500).json({ 
      message: 'Error creating/updating academic details', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Update academic details by ID
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { department, year, semester, sections, subjects, credits } = req.body;

    // Validate year-semester relationship
    if (!validateYearSemester(year, semester)) {
      return res.status(400).json({
        message: 'Invalid year-semester combination. Check that semester matches the year range.'
      });
    }

    // Validate sections format if provided
    if (sections) {
      const sectionArray = sections.split(',').map(s => s.trim());
      if (!sectionArray.every(s => /^[A-Z]$/.test(s))) {
        return res.status(400).json({
          message: 'Sections must be single uppercase letters (e.g., A,B,C)'
        });
      }
    }

    // Find and update the academic detail
    const academicDetail = await AcademicDetail.findById(req.params.id);
    if (!academicDetail) {
      return res.status(404).json({ message: 'Academic details not found' });
    }

    // Update only the provided fields
    if (department) academicDetail.department = department;
    if (year) academicDetail.year = year;
    if (semester) academicDetail.semester = semester;
    if (sections) academicDetail.sections = sections;
    if (subjects) academicDetail.subjects = subjects;
    if (credits) academicDetail.credits = credits;

    await academicDetail.save();
    res.json(academicDetail);
  } catch (error) {
    console.error('Error updating academic details:', error);
    res.status(500).json({ message: 'Error updating academic details', error: error.message });
  }
});

// Upload academic details from Excel
router.post('/upload', auth, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = [];
    const errors = [];

    for (const row of data) {
      try {
        const year = parseInt(row.Year);
        const semester = parseInt(row.Semester);

        // Validate year-semester relationship
        if (!validateYearSemester(year, semester)) {
          throw new Error(`Invalid year-semester combination for ${row.Department} Year ${year} Semester ${semester}`);
        }

        // Create or update academic detail
        const academicDetail = await AcademicDetail.findOneAndUpdate(
          {
            department: row.Department,
            year: year,
            semester: semester
          },
          {
            sections: row.Sections,
            subjects: row.Subjects,
            credits: parseInt(row.Credits)
          },
          { new: true, upsert: true, runValidators: true }
        );

        results.push(academicDetail);
      } catch (error) {
        errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
      }
    }

    res.json({
      message: 'Academic details upload completed',
      success: results.length,
      errors: errors,
      details: results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading academic details', error: error.message });
  }
});

// Delete academic details
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const academicDetail = await AcademicDetail.findByIdAndDelete(req.params.id);
    if (!academicDetail) {
      return res.status(404).json({ message: 'Academic details not found' });
    }
    res.json({ message: 'Academic details deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting academic details', error: error.message });
  }
});

module.exports = router; 