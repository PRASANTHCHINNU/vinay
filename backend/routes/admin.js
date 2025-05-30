const express = require('express');
const router = express.Router();
const { auth, authorize, isAdmin } = require('../middleware/auth');
const AdmissionRange = require('../models/AdmissionRange');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const EventQuizAccount = require('../models/EventQuizAccount');
const Department = require('../models/Department');
const AcademicDetail = require('../models/AcademicDetail');
const { encrypt, decrypt } = require('../utils/encryption');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get all admission ranges
router.get('/admission-ranges', auth, authorize('admin'), async (req, res) => {
  try {
    const ranges = await AdmissionRange.find()
      .populate('updatedBy', 'name email')
      .sort({ department: 1, year: -1, section: 1 });
    res.json(ranges);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new admission range
router.post('/admission-ranges', auth, authorize('admin'), async (req, res) => {
  try {
    const range = new AdmissionRange({
      ...req.body,
      updatedBy: req.user._id
    });
    await range.save();
    res.status(201).json(range);
  } catch (error) {
    res.status(400).json({ message: 'Validation error', error: error.message });
  }
});

// Update admission range
router.put('/admission-ranges/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const range = await AdmissionRange.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id,
        lastUpdated: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    if (!range) {
      return res.status(404).json({ message: 'Range not found' });
    }
    
    res.json(range);
  } catch (error) {
    res.status(400).json({ message: 'Validation error', error: error.message });
  }
});

// Delete admission range
router.delete('/admission-ranges/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const range = await AdmissionRange.findByIdAndDelete(req.params.id);
    
    if (!range) {
      return res.status(404).json({ message: 'Range not found' });
    }
    
    res.json({ message: 'Range deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk upload admission ranges through Excel
router.post('/admission-ranges/bulk-upload', auth, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const ranges = data.map(row => ({
      department: row.Department,
      year: row.Year,
      section: row.Section,
      regularEntry: {
        start: row.RegularStart,
        end: row.RegularEnd
      },
      lateralEntry: {
        start: row.LateralStart,
        end: row.LateralEnd
      },
      isActive: true,
      updatedBy: req.user._id
    }));

    await AdmissionRange.insertMany(ranges);

    res.status(201).json({ 
      message: `Successfully uploaded ${ranges.length} ranges`,
      count: ranges.length
    });
  } catch (error) {
    res.status(400).json({ message: 'Upload failed', error: error.message });
  }
});

// Validate admission number
router.post('/validate-admission', auth, async (req, res) => {
  try {
    const { admissionNumber, department, year, section } = req.body;

    const range = await AdmissionRange.findOne({
      department,
      year,
      section,
      isActive: true
    });

    if (!range) {
      return res.status(404).json({ message: 'No range configuration found' });
    }

    const isRegular = admissionNumber.startsWith('y');
    const entry = isRegular ? range.regularEntry : range.lateralEntry;
    const num = parseInt(admissionNumber.slice(-3));
    const startNum = parseInt(entry.start.slice(-3));
    const endNum = parseInt(entry.end.slice(-3));

    const isValid = num >= startNum && num <= endNum;

    res.json({
      isValid,
      message: isValid ? 'Valid admission number' : 'Invalid admission number for this section'
    });
  } catch (error) {
    res.status(500).json({ message: 'Validation failed', error: error.message });
  }
});

// Get student counts by semester and section
router.get('/student-counts', auth, authorize('admin'), async (req, res) => {
  try {
    const counts = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $group: {
          _id: {
            department: '$department',
            year: '$year',
            section: '$section'
          },
          count: { $sum: 1 },
          regularCount: {
            $sum: { $cond: [{ $eq: ['$isLateral', false] }, 1, 0] }
          },
          lateralCount: {
            $sum: { $cond: [{ $eq: ['$isLateral', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          department: '$_id.department',
          year: '$_id.year',
          section: '$_id.section',
          totalCount: '$count',
          regularCount: '$regularCount',
          lateralCount: '$lateralCount'
        }
      },
      { $sort: { department: 1, year: 1, section: 1 } }
    ]);

    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all event quiz accounts
router.get('/event-quiz-accounts', isAdmin, async (req, res) => {
  try {
    const accounts = await EventQuizAccount.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ accounts });
  } catch (error) {
    console.error('Error fetching event accounts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create event quiz account
router.post('/event-quiz-accounts', isAdmin, async (req, res) => {
  try {
    const { department, email, password, eventType } = req.body;

    console.log('Creating event quiz account:', { department, email, eventType });

    // Validate required fields
    if (!email || !password || !eventType) {
      console.log('Missing required fields:', { email, password: !!password, eventType });
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // If event type is department, department is required
    if (eventType === 'department' && !department) {
      return res.status(400).json({ message: 'Department is required for department events' });
    }

    // Check if account already exists
    const existingAccount = await EventQuizAccount.findOne({ email });
    if (existingAccount) {
      console.log('Account already exists:', email);
      return res.status(400).json({ message: 'Account with this email already exists' });
    }

    // Create new account
    const account = new EventQuizAccount({
      department,
      email,
      password,
      eventType,
      createdBy: req.user._id
    });

    // Validate against schema
    const validationError = account.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(validationError.errors).map(err => err.message)
      });
    }

    await account.save();

    // Return account without password
    const accountToReturn = account.toObject();
    delete accountToReturn.password;

    console.log('Account created successfully:', accountToReturn._id);
    res.status(201).json(accountToReturn);
  } catch (error) {
    console.error('Error creating event account:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update event quiz account
router.put('/event-quiz-accounts/:id', isAdmin, async (req, res) => {
  try {
    const { department, email, password, eventType, isActive } = req.body;
    const updateData = {
      email,
      eventType,
      isActive
    };

    // Only include department if event type is department
    if (eventType === 'department') {
      if (!department) {
        return res.status(400).json({ message: 'Department is required for department events' });
      }
      updateData.department = department;
    }

    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const account = await EventQuizAccount.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ message: 'Account updated successfully', account });
  } catch (error) {
    console.error('Error updating event account:', error);
    res.status(500).json({ message: 'Error updating account', error: error.message });
  }
});

// Delete event quiz account
router.delete('/event-quiz-accounts/:id', isAdmin, async (req, res) => {
  try {
    console.log('Deleting event quiz account:', req.params.id);
    const account = await EventQuizAccount.findByIdAndDelete(req.params.id);
    if (!account) {
      console.log('Account not found:', req.params.id);
      return res.status(404).json({ message: 'Account not found' });
    }
    console.log('Account deleted successfully:', req.params.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting event account:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk create event quiz accounts from Excel
router.post('/event-quiz-accounts/bulk', isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const createdAccounts = [];
    const errors = [];

    for (const row of data) {
      try {
        const existingAccount = await EventQuizAccount.findOne({ email: row.email });
        if (existingAccount) {
          errors.push(`Account with email ${row.email} already exists`);
          continue;
        }

        const account = new EventQuizAccount({
          department: row.department,
          email: row.email,
          password: row.password,
          isActive: row.isActive !== false, // default to true if not specified
          createdBy: req.user._id
        });

        await account.save();
        const accountToReturn = account.toObject();
        delete accountToReturn.password;
        createdAccounts.push(accountToReturn);
      } catch (error) {
        errors.push(`Error creating account for ${row.email}: ${error.message}`);
      }
    }

    res.status(201).json({
      message: 'Bulk upload completed',
      created: createdAccounts.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all accounts with optional role filter
router.get('/accounts', isAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};

    console.log('Fetching accounts with query:', query);

    const accounts = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`Found ${accounts.length} accounts`);

    // For faculty accounts, ensure arrays are properly initialized
    const processedAccounts = accounts.map(account => {
      if (account.role === 'faculty') {
        return {
          ...account.toObject(),
          departments: account.departments || [],
          years: account.years || [],
          semesters: account.semesters || [],
          sections: account.sections || []
        };
      }
      return account.toObject();
    });

    res.json({ accounts: processedAccounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ message: 'Error fetching accounts', error: error.message });
  }
});

// Create a new account (student or faculty)
router.post('/accounts', isAdmin, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      department, 
      year, 
      semester, 
      section, 
      admissionNumber, 
      isLateral,
      departments,
      years,
      semesters,
      sections,
      assignments,
      isEventQuizAccount
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Store encrypted original password
    const encryptedPassword = encrypt(password);

    // Hash password for authentication
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create base user object
    const userData = {
      name,
      email,
      password: hashedPassword,
      originalPassword: encryptedPassword,
      role: role || 'student'
    };

    // Add role-specific fields
    if (role === 'student') {
      Object.assign(userData, {
        department,
        year,
        semester,
        section,
        admissionNumber,
        isLateral: isLateral || false
      });
    } else if (role === 'faculty') {
      // Validate required faculty fields
      if (!departments?.length || !years?.length || !sections?.length || !assignments?.length) {
        return res.status(400).json({ 
          message: 'Missing required faculty fields',
          details: {
            departments: !departments?.length ? 'At least one department is required' : null,
            years: !years?.length ? 'At least one year is required' : null,
            sections: !sections?.length ? 'At least one section is required' : null,
            assignments: !assignments?.length ? 'At least one assignment is required' : null
          }
        });
      }

      // Validate assignments structure
      const isValidAssignments = assignments.every(assignment => 
        assignment.department && 
        assignment.year && 
        assignment.semester && 
        Array.isArray(assignment.sections) && 
        assignment.sections.length > 0
      );

      if (!isValidAssignments) {
        return res.status(400).json({ 
          message: 'Invalid assignments structure',
          details: 'Each assignment must have department, year, semester, and at least one section'
        });
      }

      Object.assign(userData, {
        departments,
        years,
        semesters,
        sections,
        assignments,
        isEventQuizAccount: isEventQuizAccount || false
      });
    }

    // Create and save user
    const user = new User(userData);
    await user.save();

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        departments: user.departments,
        years: user.years,
        semesters: user.semesters,
        sections: user.sections,
        assignments: user.assignments
      }
    });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ message: 'Error creating account', error: error.message });
  }
});

// Update a student account
router.put('/accounts/:id', isAdmin, async (req, res) => {
  try {
    const { name, email, password, department, year, semester, section, admissionNumber } = req.body;
    const updateData = {
      name,
      email,
      department,
      year,
      semester,
      section,
      admissionNumber
    };

    // If password is provided, hash it and store original
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.originalPassword = encrypt(password);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -originalPassword'); // Don't return passwords in response

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Account updated successfully', user });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ message: 'Error updating account', error: error.message });
  }
});

// Update faculty account
router.put('/faculty/:id', isAdmin, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      departments, 
      years, 
      semesters,
      sections, 
      assignments,
      isEventQuizAccount 
    } = req.body;

    // Validate required fields
    if (!departments?.length || !years?.length || !sections?.length || !assignments?.length) {
      return res.status(400).json({ 
        message: 'Missing required faculty fields',
        details: {
          departments: !departments?.length ? 'At least one department is required' : null,
          years: !years?.length ? 'At least one year is required' : null,
          sections: !sections?.length ? 'At least one section is required' : null,
          assignments: !assignments?.length ? 'At least one assignment is required' : null
        }
      });
    }

    // Validate assignments structure
    const isValidAssignments = assignments.every(assignment => 
      assignment.department && 
      assignment.year && 
      assignment.semester && 
      Array.isArray(assignment.sections) && 
      assignment.sections.length > 0
    );

    if (!isValidAssignments) {
      return res.status(400).json({ 
        message: 'Invalid assignments structure',
        details: 'Each assignment must have department, year, semester, and at least one section'
      });
    }

    const updateData = {
      name,
      email,
      departments,
      years,
      semesters,
      sections,
      assignments,
      isEventQuizAccount
    };

    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.originalPassword = encrypt(password);
    }

    const faculty = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -originalPassword');

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    res.json({ 
      message: 'Faculty account updated successfully', 
      faculty 
    });
  } catch (error) {
    console.error('Error updating faculty account:', error);
    res.status(500).json({ 
      message: 'Error updating faculty account', 
      error: error.message 
    });
  }
});

// Delete a student account
router.delete('/accounts/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// Bulk create accounts from Excel data
router.post('/accounts/bulk', isAdmin, async (req, res) => {
  try {
    const { accounts } = req.body;
    const createdAccounts = [];
    const errors = [];

    for (const account of accounts) {
      try {
        // Check if it's a faculty account (has assignments field)
        if (account.assignments) {
          // Process faculty account
          const { 
            name, 
            email, 
            password, 
            department,
            assignments 
          } = account;

          // Check if user already exists
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            errors.push(`User with email ${email} already exists`);
            continue;
          }

          // Store encrypted original password
          const encryptedPassword = encrypt(password);

          // Hash password for authentication
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          // Extract unique years, semesters, and sections from assignments
          const years = [...new Set(assignments.map(a => a.year))];
          const semesters = [...new Set(assignments.map(a => a.semester))];
          const sections = [...new Set(assignments.flatMap(a => a.sections))];

          // Create faculty user
          const userData = {
            name,
            email,
            password: hashedPassword,
            originalPassword: encryptedPassword,
            role: 'faculty',
            departments: [department],
            years,
            semesters,
            sections,
            assignments,
            isEventQuizAccount: false
          };

          // Create and save user
          const user = new User(userData);
          await user.save();

          // Remove sensitive data before adding to response
          const userResponse = user.toObject();
          delete userResponse.password;
          delete userResponse.originalPassword;
          
          createdAccounts.push(userResponse);
        } else {
          // Process student account
          const { 
            name, 
            email, 
            password, 
            department, 
            year, 
            semester, 
            section, 
            admissionNumber,
            isLateral 
          } = account;

          // Check if user already exists
          const existingUser = await User.findOne({ email });
          if (existingUser) {
            errors.push(`User with email ${email} already exists`);
            continue;
          }

          // Validate required fields
          if (!name || !email || !password || !department || !year || !semester || !section || !admissionNumber) {
            errors.push(`Missing required fields for student ${name || email}`);
            continue;
          }

          // Store encrypted original password
          const encryptedPassword = encrypt(password);

          // Hash password for authentication
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          // Create student user
          const userData = {
            name,
            email,
            password: hashedPassword,
            originalPassword: encryptedPassword,
            role: 'student',
            department,
            year,
            semester,
            section,
            admissionNumber,
            isLateral: isLateral || false
          };

          // Create and save user
          const user = new User(userData);
          await user.save();

          // Remove sensitive data before adding to response
          const userResponse = user.toObject();
          delete userResponse.password;
          delete userResponse.originalPassword;
          
          createdAccounts.push(userResponse);
        }
      } catch (error) {
        errors.push(`Error creating account for ${account.email}: ${error.message}`);
      }
    }

    res.status(201).json({
      message: 'Bulk upload completed',
      created: createdAccounts.length,
      errors: errors.length > 0 ? errors : undefined,
      accounts: createdAccounts
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get all student/faculty passwords
router.get('/accounts/passwords', isAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    const users = await User.find(query).select('_id originalPassword');
    const passwords = {};
    
    users.forEach(user => {
      // If originalPassword exists and is encrypted, decrypt it
      if (user.originalPassword && user.originalPassword.includes(':')) {
        try {
          passwords[user._id] = decrypt(user.originalPassword);
        } catch (err) {
          console.error('Error decrypting password:', err);
          passwords[user._id] = '********';
        }
      } else {
        passwords[user._id] = user.originalPassword || '********';
      }
    });
    
    res.json({ passwords });
  } catch (error) {
    console.error('Error fetching passwords:', error);
    res.status(500).json({ message: 'Error fetching passwords' });
  }
});

// Get password for a specific account
router.get('/accounts/:id/password', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('originalPassword');
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    let password = '********';
    if (user.originalPassword) {
      try {
        // Decrypt the original password if it's encrypted
        if (user.originalPassword.includes(':')) {
          password = decrypt(user.originalPassword);
        } else {
          password = user.originalPassword;
        }
      } catch (error) {
        console.error('Error decrypting password:', error);
        password = '********';
      }
    }

    res.json({ password });
  } catch (error) {
    console.error('Error fetching account password:', error);
    res.status(500).json({ message: 'Error fetching password' });
  }
});

// Get all event account passwords
router.get('/event-quiz-accounts/passwords', isAdmin, async (req, res) => {
  try {
    // Get accounts with both password fields
    const accounts = await EventQuizAccount.find().select('_id password originalPassword');
    const passwords = {};
    
    accounts.forEach(account => {
      try {
        // First try to use originalPassword if it exists
        if (account.originalPassword) {
          if (account.originalPassword.includes(':')) {
            // If it's encrypted, decrypt it
            passwords[account._id] = decrypt(account.originalPassword);
          } else {
            // If it's not encrypted, use as is
            passwords[account._id] = account.originalPassword;
          }
        } else if (account.password) {
          // If no originalPassword, use the regular password field
          passwords[account._id] = account.password;
        } else {
          passwords[account._id] = '********';
        }
        console.log(`Password for account ${account._id}:`, passwords[account._id]); // Debug log
      } catch (err) {
        console.error('Error processing password for account:', account._id, err);
        passwords[account._id] = '********';
      }
    });
    
    console.log('Sending passwords:', passwords); // Debug log
    res.json({ passwords });
  } catch (error) {
    console.error('Error fetching event account passwords:', error);
    res.status(500).json({ message: 'Error fetching passwords' });
  }
});

// Get password for a specific event quiz account
router.get('/event-quiz-accounts/passwords/:id', isAdmin, async (req, res) => {
  try {
    const account = await EventQuizAccount.findById(req.params.id).select('+password +originalPassword');
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    let password = '********';
    if (account.originalPassword) {
      try {
        if (account.originalPassword.includes(':')) {
          // If it's encrypted, decrypt it
          password = decrypt(account.originalPassword);
        } else {
          // If it's not encrypted, use as is
          password = account.originalPassword;
        }
      } catch (error) {
        console.error('Error decrypting password:', error);
        password = '********';
      }
    }

    res.json({ password });
  } catch (error) {
    console.error('Error fetching account password:', error);
    res.status(500).json({ message: 'Error fetching password' });
  }
});

// Department routes
router.get('/settings/departments', async (req, res) => {
  try {
    const departments = await Department.find().sort('name');
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments' });
  }
});

router.post('/settings/departments', async (req, res) => {
  try {
    const department = new Department(req.body);
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Department with this name or code already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

router.put('/settings/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Department with this name or code already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

router.delete('/settings/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    // Also delete all sections for this department
    await AcademicDetail.deleteMany({ department: department.name });
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload departments from Excel
router.post('/settings/departments/upload', isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = [];
    const errors = [];

    for (const row of data) {
      try {
        // Validate required fields
        if (!row['Department Name'] || !row['Department Code']) {
          throw new Error('Department Name and Code are required');
        }

        // Create or update department
        const department = await Department.findOneAndUpdate(
          {
            $or: [
              { name: row['Department Name'] },
              { code: row['Department Code'] }
            ]
          },
          {
            name: row['Department Name'],
            code: row['Department Code'],
            description: row['Description'] || ''
          },
          { new: true, upsert: true, runValidators: true }
        );

        results.push(department);
      } catch (error) {
        errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
      }
    }

    res.json({
      message: 'Departments upload completed',
      success: results.length,
      errors: errors,
      details: results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading departments', error: error.message });
  }
});

// Years and Semesters Configuration Routes
router.post('/academic-details/years-semesters', isAdmin, async (req, res) => {
  try {
    const { year, semesters } = req.body;

    // Validate required fields
    if (!year || !semesters || !Array.isArray(semesters) || semesters.length === 0) {
      return res.status(400).json({
        message: 'Year and at least one semester are required'
      });
    }

    // Validate that year is positive
    if (year < 1) {
      return res.status(400).json({
        message: 'Year must be a positive number'
      });
    }

    // Validate semester range (just ensure they are positive numbers)
    const invalidSemesters = semesters.filter(sem => sem < 1);
    if (invalidSemesters.length > 0) {
      return res.status(400).json({
        message: `Invalid semesters ${invalidSemesters.join(', ')}. Semesters must be positive numbers.`
      });
    }

    // Get all departments if not specified
    let departments = [];
    if (req.body.department) {
      departments = [req.body.department];
    } else {
      const allDepartments = await AcademicDetail.distinct('department');
      departments = allDepartments;
    }

    if (departments.length === 0) {
      return res.status(400).json({
        message: 'No departments found. Please create at least one department first.'
      });
    }

    // Create or update academic details for each department and semester
    const results = await Promise.all(
      departments.flatMap(department =>
        semesters.map(async (semester) => {
          try {
            return await AcademicDetail.findOneAndUpdate(
              { department, year, semester },
              { 
                department,
                year,
                semester,
                sections: 'A', // Default section
                subjects: '',
                credits: 3
              },
              { 
                new: true, 
                upsert: true, 
                runValidators: true,
                setDefaultsOnInsert: true 
              }
            );
          } catch (error) {
            console.error(`Error creating/updating academic detail for ${department} year ${year} semester ${semester}:`, error);
            throw new Error(`Failed to create/update academic detail for ${department} year ${year} semester ${semester}: ${error.message}`);
          }
        })
      )
    );

    res.status(201).json(results);
  } catch (error) {
    console.error('Error saving year/semester configuration:', error);
    res.status(500).json({ 
      message: 'Error saving year/semester configuration', 
      error: error.message 
    });
  }
});

router.delete('/academic-details/years-semesters/:department/:year', isAdmin, async (req, res) => {
  try {
    const { department, year } = req.params;
    
    // Delete all academic details for the given department and year
    const result = await AcademicDetail.deleteMany({
      department,
      year: parseInt(year)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: 'No academic details found for the given department and year'
      });
    }

    res.json({
      message: 'Year configuration deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting year/semester configuration:', error);
    res.status(500).json({ 
      message: 'Error deleting year/semester configuration', 
      error: error.message 
    });
  }
});

// Get all departments, sections, and subjects
router.get('/academic-structure', auth, authorize('admin'), async (req, res) => {
  try {
    const academicDetails = await AcademicDetail.find().sort({ department: 1, year: 1, semester: 1 });
    
    // Process academic details to get unique departments and organized structure
    const structure = academicDetails.reduce((acc, detail) => {
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
        acc[detail.department].years[detail.year].semesters[detail.semester] = {
          sections: detail.sections.split(',').map(s => s.trim()),
          subjects: detail.subjects.split(',').map(s => {
            const match = s.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
            return {
              name: match[1].trim(),
              code: match[2]
            };
          })
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

// Get all sections for a department and year
router.get('/sections/:department/:year', auth, authorize('admin'), async (req, res) => {
  try {
    const { department, year } = req.params;
    const academicDetails = await AcademicDetail.find({
      department,
      year: parseInt(year)
    });

    // Get unique sections across all semesters
    const sections = new Set();
    academicDetails.forEach(detail => {
      detail.sections.split(',').forEach(section => {
        sections.add(section.trim());
      });
    });

    res.json(Array.from(sections).sort());
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all subjects for a department, year, and semester
router.get('/subjects/:department/:year/:semester', auth, authorize('admin'), async (req, res) => {
  try {
    const { department, year, semester } = req.params;
    const academicDetail = await AcademicDetail.findOne({
      department,
      year: parseInt(year),
      semester: parseInt(semester)
    });

    if (!academicDetail) {
      return res.json([]);
    }

    const subjects = academicDetail.subjects.split(',').map(s => {
      const match = s.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
      return {
        name: match[1].trim(),
        code: match[2]
      };
    });

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get admin dashboard statistics
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();

    // Get counts in parallel
    const [
      totalUsers,
      totalQuizzes,
      totalSubmissions,
      activeQuizzes
    ] = await Promise.all([
      User.countDocuments(),
      Quiz.countDocuments(),
      QuizSubmission.countDocuments(),
      Quiz.countDocuments({
        startTime: { $lte: now },
        endTime: { $gte: now }
      })
    ]);

    res.json({
      totalUsers,
      totalQuizzes,
      totalSubmissions,
      activeQuizzes
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 