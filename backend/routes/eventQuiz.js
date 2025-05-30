const express = require('express');
const router = express.Router();
const EventQuiz = require('../models/EventQuiz');
const { auth, isEventAdmin } = require('../middleware/auth');
const EventQuizAccount = require('../models/EventQuizAccount');
const { encrypt, decrypt } = require('../utils/encryption');

// Create a new event quiz
router.post('/', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = new EventQuiz({
      ...req.body,
      createdBy: req.user._id
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all event quizzes (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, participantType } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (participantType) query.participantType = participantType;

    const quizzes = await EventQuiz.find(query)
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific event quiz
router.get('/:id', async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('questions');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an event quiz
router.put('/:id', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only allow updates if quiz is in draft status or by the creator
    if (quiz.status !== 'draft' && !quiz.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Cannot modify published quiz' });
    }

    Object.assign(quiz, req.body);
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Register for an event quiz
router.post('/:id/register', auth, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if registration is enabled
    if (!quiz.registrationEnabled && !quiz.spotRegistrationEnabled) {
      return res.status(400).json({ message: 'Registration is closed' });
    }

    // Check if quiz is full
    if (quiz.maxParticipants > 0 && quiz.registrations.length >= quiz.maxParticipants) {
      return res.status(400).json({ message: 'Quiz is full' });
    }

    // Check if user is already registered
    if (quiz.registrations.some(reg => reg.student.equals(req.user._id))) {
      return res.status(400).json({ message: 'Already registered' });
    }

    // Add registration
    quiz.registrations.push({
      student: req.user._id,
      name: req.user.name,
      email: req.user.email,
      college: req.body.college,
      department: req.body.department,
      year: req.body.year,
      isSpotRegistration: req.body.isSpotRegistration || false
    });

    await quiz.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get registrations for an event quiz
router.get('/:id/registrations', auth, isEventAdmin, async (req, res) => {
  try {
    const quiz = await EventQuiz.findById(req.params.id)
      .populate('registrations.student', 'name email');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz.registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update quiz status
router.patch('/:id/status', auth, isEventAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const quiz = await EventQuiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    quiz.status = status;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk create event quiz accounts from Excel
router.post('/accounts/bulk', auth, async (req, res) => {
  try {
    const { accounts } = req.body;
    
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ message: 'Invalid data format. Expected an array of accounts.' });
    }

    // Validate all accounts before creating any
    const errors = [];
    const emailSet = new Set();

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      // Check required fields
      if (!account.name) errors.push(`Row ${i + 1}: Name is required`);
      if (!account.email) errors.push(`Row ${i + 1}: Email is required`);
      if (!account.eventType) errors.push(`Row ${i + 1}: Event type is required`);
      if (account.eventType === 'department' && !account.department) {
        errors.push(`Row ${i + 1}: Department is required for department events`);
      }

      // Check for duplicate emails within the upload
      if (emailSet.has(account.email.toLowerCase())) {
        errors.push(`Row ${i + 1}: Duplicate email address ${account.email}`);
      }
      emailSet.add(account.email.toLowerCase());

      // Check for existing emails in database
      const existingAccount = await EventQuizAccount.findOne({ email: account.email.toLowerCase() });
      if (existingAccount) {
        errors.push(`Row ${i + 1}: Email ${account.email} already exists`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    // Process accounts with proper password handling
    const processedAccounts = accounts.map(account => {
      // Generate random password if not provided
      const password = account.password || Math.random().toString(36).slice(-8);
      
      return {
        ...account,
        password,
        originalPassword: encrypt(password), // Store encrypted original password
        createdBy: req.user.userId,
        isActive: true
      };
    });

    // Create all accounts
    const createdAccounts = await EventQuizAccount.create(processedAccounts);

    // Return success response with account details (excluding sensitive data)
    const sanitizedAccounts = createdAccounts.map(account => ({
      _id: account._id,
      name: account.name,
      email: account.email,
      eventType: account.eventType,
      department: account.department,
      password: decrypt(account.originalPassword) // Include original password in response
    }));

    res.status(201).json({
      message: `Successfully created ${createdAccounts.length} accounts`,
      accounts: sanitizedAccounts
    });

  } catch (error) {
    console.error('Error in bulk account creation:', error);
    res.status(500).json({
      message: 'Failed to create accounts',
      error: error.message
    });
  }
});

// Get password for a specific account
router.get('/accounts/passwords/:id', auth, async (req, res) => {
  try {
    const account = await EventQuizAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Decrypt the original password
    const password = account.originalPassword ? decrypt(account.originalPassword) : null;
    
    res.json({ password });
  } catch (error) {
    console.error('Error fetching password:', error);
    res.status(500).json({ message: 'Failed to fetch password' });
  }
});

module.exports = router; 