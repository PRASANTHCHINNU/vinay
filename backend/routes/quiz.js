const express = require('express');
const User = require('../models/User');
const AcademicDetail = require('../models/AcademicDetail');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { auth, authorize } = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const path = require('path');
const imageProcessor = require('../services/imageProcessing');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept excel, images
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel files and images (JPEG, PNG, GIF) are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create a new quiz (faculty only)
router.post('/', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    console.log('Creating quiz with data:', {
      title: req.body.title,
      subject: req.body.subject,
      duration: req.body.duration,
      allowedGroups: req.body.allowedGroups,
      questionCount: req.body.questions?.length
    });

    // Validate required fields
    const requiredFields = ['title', 'subject', 'duration', 'startTime', 'endTime', 'allowedGroups', 'questions'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields', 
        fields: missingFields 
      });
    }

    // Validate subject structure
    if (typeof req.body.subject === 'string') {
      // If subject is a string (legacy format), convert it to object format
      req.body.subject = {
        code: req.body.subject,
        name: req.body.subject // Use code as name for backward compatibility
      };
    } else if (!req.body.subject.code || !req.body.subject.name) {
      return res.status(400).json({
        success: false,
        message: 'Subject must include both code and name'
      });
    }

    // Log authentication info
    console.log('User info:', {
      id: req.user._id,
      role: req.user.role,
      assignments: req.user.assignments
    });

    // For faculty, enforce department restriction
    if (req.user.role === 'faculty') {
      // Check if any group has a different department than the faculty's assignments
      const hasInvalidDepartment = req.body.allowedGroups.some(
        group => !req.user.assignments.some(
          assignment => assignment.department === group.department
        )
      );

      if (hasInvalidDepartment) {
        console.log('Faculty department restriction failed:', {
          allowedGroups: req.body.allowedGroups,
          facultyAssignments: req.user.assignments
        });
        return res.status(403).json({
          success: false,
          message: 'Faculty can only create quizzes for their assigned departments'
        });
      }
    }

    // Validate each allowed group
    for (let i = 0; i < req.body.allowedGroups.length; i++) {
      const group = req.body.allowedGroups[i];
      if (!group.year || !group.department || !group.section || !group.semester ||
          typeof group.year !== 'number' || group.year < 1 ||
          typeof group.semester !== 'number' || group.semester < 1 || group.semester > 8) {
        console.log('Invalid group format:', {
          groupIndex: i,
          group: group,
          validationErrors: {
            year: !group.year || typeof group.year !== 'number' || group.year < 1,
            semester: !group.semester || typeof group.semester !== 'number' || group.semester < 1 || group.semester > 8,
            department: !group.department,
            section: !group.section
          }
        });
        return res.status(400).json({
          success: false,
          message: 'Invalid allowed group format',
          groupIndex: i,
          expected: {
            year: 'number (positive)',
            department: 'string',
            section: 'string',
            semester: 'number (1-8)'
          },
          received: group
        });
      }

      // Convert year and semester to numbers if they're strings
      group.year = Number(group.year);
      group.semester = Number(group.semester);
    }

    // Validate questions array
    if (!Array.isArray(req.body.questions) || req.body.questions.length === 0) {
      console.log('Invalid questions array:', req.body.questions);
      return res.status(400).json({ 
        message: 'Quiz must have at least one question'
      });
    }

    // Validate each question
    for (let i = 0; i < req.body.questions.length; i++) {
      const q = req.body.questions[i];
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
          typeof q.correctAnswer !== 'number' || typeof q.marks !== 'number') {
        console.log('Invalid question format:', {
          questionIndex: i,
          question: q
        });
        return res.status(400).json({
          message: 'Invalid question format',
          questionIndex: i,
          expected: {
            question: 'string',
            options: 'array of 4 strings',
            correctAnswer: 'number',
            marks: 'number'
          },
          received: q
        });
      }
    }

    console.log('Creating new Quiz document...');
    const quiz = new Quiz({
      ...req.body,
      createdBy: req.user._id
    });

    console.log('Saving quiz...');
    await quiz.save();
    console.log('Quiz saved successfully');

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Quiz created successfully'
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to create quiz'
    });
  }
});

// Get all quizzes (faculty) or available quizzes (student)
router.get('/', auth, async (req, res) => {
  try {
    const { department, year, section, subjectCode } = req.query;
    let query = {};
    
    if (req.user.role === 'student') {
      console.log('Fetching quizzes for student:', {
        id: req.user._id,
        name: req.user.name,
        year: req.user.year,
        department: req.user.department,
        section: req.user.section,
        semester: req.user.semester
      });

      // For students, show available and upcoming quizzes for their year and department
      query = {
        isActive: true,
        endTime: { $gte: new Date() }, // End time must be in the future
        allowedGroups: {
          $elemMatch: {
            year: Number(req.user.year),
            department: req.user.department,
            section: req.user.section
          }
        }
      };

      console.log('Student quiz query:', JSON.stringify(query, null, 2));
      
      // Debug: Log all quizzes before filtering
      const allQuizzes = await Quiz.find({}).lean();
      console.log('Total quizzes in system:', allQuizzes.length);
      console.log('Sample quiz structure:', allQuizzes[0]?.allowedGroups);
      
      // Debug: Log matching quizzes with more details
      const matchingQuizzes = await Quiz.find(query).lean();
      console.log('Matching quizzes found:', matchingQuizzes.length);
      
      if (matchingQuizzes.length > 0) {
        console.log('Found quizzes:', matchingQuizzes.map(quiz => ({
          title: quiz.title,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          allowedGroups: quiz.allowedGroups,
          status: quiz.startTime > new Date() ? 'upcoming' : 'active'
        })));
      }
    } else {
      // For faculty/admin, apply filters if provided
      if (department && department !== 'all') {
        query['allowedGroups.department'] = department;
      }
      if (year && year !== 'all') {
        query['allowedGroups.year'] = parseInt(year);
      }
      if (section && section !== 'all') {
        query['allowedGroups.section'] = section;
      }
      if (subjectCode && subjectCode !== 'all') {
        query['subject.code'] = subjectCode;
      }
      
      // If faculty, only show their quizzes
      if (req.user.role === 'faculty') {
        query.createdBy = req.user._id;
      }
    }
    
    const quizzes = await Quiz.find(query)
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    // Transform the data to ensure proper subject format
    const transformedQuizzes = quizzes.map(quiz => {
      // Handle legacy subject format
      if (typeof quiz.subject === 'string') {
        quiz.subject = {
          code: quiz.subject,
          name: quiz.subject
        };
      }
      return quiz;
    });

    // Get actual count of registered students and submissions for each quiz
    const enrichedQuizzes = await Promise.all(transformedQuizzes.map(async (quiz) => {
      try {
        // Get actual count of registered students who match the quiz filters
        const authorizedStudents = await User.find({
          role: 'student',
          department: { $in: quiz.allowedGroups.map(group => group.department) },
          year: { $in: quiz.allowedGroups.map(group => group.year) },
          section: { $in: quiz.allowedGroups.map(group => group.section) }
        }).countDocuments();

        const submissions = await QuizSubmission.find({
          quiz: quiz._id,
          status: 'evaluated'
        });

        const totalScore = submissions.reduce((sum, sub) => {
          return sum + sub.answers.reduce((s, a) => s + (a.marks || 0), 0);
        }, 0);

        return {
          ...quiz,
          totalSubmissions: submissions.length,
          averageScore: submissions.length > 0 ? (totalScore / submissions.length) : 0,
          totalAuthorizedStudents: authorizedStudents
        };
      } catch (error) {
        console.error('Error enriching quiz:', error);
        return quiz;
      }
    }));

    res.json(enrichedQuizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all quizzes (admin)
router.get('/all', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('Fetching all quizzes for admin...');
    console.log('User role:', req.user.role);
    console.log('Query params:', req.query);

    const query = {};
    const { department, year, section, subject, faculty } = req.query;

    // Add filters only if they are not 'all'
    if (department && department !== 'all') {
      query['allowedGroups.department'] = department;
    }
    if (year && year !== 'all') {
      query['allowedGroups.year'] = parseInt(year);
    }
    if (section && section !== 'all') {
      query['allowedGroups.section'] = section;
    }
    if (subject && subject !== 'all') {
      query.subject = subject;
    }
    if (faculty && faculty !== 'all') {
      query.createdBy = faculty;
    }

    console.log('MongoDB query:', query);

    const quizzes = await Quiz.find(query)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();
    
    // Transform the data to match the frontend expectations
    const transformedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      department: quiz.allowedGroups?.[0]?.department || '',
      status: getQuizStatus(quiz),
      submissionCount: 0 // You might want to fetch this from QuizSubmission model
    }));
    
    console.log('Successfully fetched quizzes:', transformedQuizzes.length);
    res.json(transformedQuizzes);
  } catch (error) {
    console.error('Error fetching all quizzes:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Get quiz statistics (MUST be before ID-based routes)
router.get('/statistics', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    console.log('Fetching quiz statistics with query:', req.query);
    
    const { department, year, section, subject } = req.query;
    const now = new Date();
    
    // Build the query based on filters
    const query = {};
    
    // Add filters only if they are not 'all'
    if (department && department !== 'all') {
      query['allowedGroups.department'] = department;
    }
    if (year && year !== 'all') {
      query['allowedGroups.year'] = parseInt(year);
    }
    if (section && section !== 'all') {
      query['allowedGroups.section'] = section;
    }
    if (subject && subject !== 'all') {
      query['subject'] = subject;
    }

    console.log('Constructed MongoDB query:', query);

    // Get all quizzes matching the query
    const quizzes = await Quiz.find(query)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    // Initialize statistics object
    const statistics = {
      totalQuizzes: quizzes.length,
      activeQuizzes: 0,
      completedQuizzes: 0,
      totalStudents: 0,
      totalSubmissions: 0,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0, // > 90%
        good: 0,     // 70-90%
        average: 0,  // 50-70%
        poor: 0      // < 50%
      },
      departmentWiseStats: []
    };

    // Initialize department stats object
    const departmentStats = {};

    // Process each quiz
    for (const quiz of quizzes) {
      try {
        // Count active and completed quizzes
        if (new Date(quiz.endTime) < now) {
          statistics.completedQuizzes++;
        } else if (new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now) {
          statistics.activeQuizzes++;
        }

        // Get actual authorized students for this quiz
        const authorizedStudents = await User.find({
          role: 'student',
          department: { $in: quiz.allowedGroups.map(group => group.department) },
          year: { $in: quiz.allowedGroups.map(group => group.year) },
          section: { $in: quiz.allowedGroups.map(group => group.section) }
        }).countDocuments();

        statistics.totalStudents += authorizedStudents;

        // Initialize department stats for each department in this quiz
        quiz.allowedGroups.forEach(group => {
          if (!departmentStats[group.department]) {
            departmentStats[group.department] = {
              totalStudents: 0,
              totalSubmissions: 0,
              totalScore: 0
            };
          }
          // Add authorized students to department stats
          departmentStats[group.department].totalStudents += authorizedStudents / quiz.allowedGroups.length;
        });

        // Get submissions for this quiz
        const submissions = await QuizSubmission.find({ 
          quiz: quiz._id,
          status: 'evaluated'
        }).populate('student', 'department year').lean();

        statistics.totalSubmissions += submissions.length;

        // Process submissions for this quiz
        let quizTotalScore = 0;
        submissions.forEach(submission => {
          if (!submission.answers || !quiz.totalMarks) return;

          // Calculate total marks for this submission
          const totalMarks = submission.answers.reduce((sum, ans) => sum + (ans.marks || 0), 0);
          const scorePercentage = (totalMarks / quiz.totalMarks) * 100;
          quizTotalScore += scorePercentage;

          // Update score distribution
          if (scorePercentage > 90) statistics.scoreDistribution.excellent++;
          else if (scorePercentage > 70) statistics.scoreDistribution.good++;
          else if (scorePercentage > 50) statistics.scoreDistribution.average++;
          else statistics.scoreDistribution.poor++;

          // Update department stats
          if (submission.student?.department && departmentStats[submission.student.department]) {
            departmentStats[submission.student.department].totalSubmissions++;
            departmentStats[submission.student.department].totalScore += scorePercentage;
          }
        });

        // Update average score
        if (submissions.length > 0) {
          statistics.averageScore += quizTotalScore / submissions.length;
        }
      } catch (error) {
        console.error(`Error processing quiz ${quiz._id}:`, error);
        // Continue with next quiz
        continue;
      }
    }

    // Calculate final average score
    if (statistics.totalSubmissions > 0) {
      statistics.averageScore = statistics.averageScore / quizzes.length;
    }

    // Format department stats
    statistics.departmentWiseStats = Object.entries(departmentStats).map(([dept, stats]) => ({
      name: dept,
      submissionCount: stats.totalSubmissions,
      averageScore: stats.totalSubmissions > 0 ? stats.totalScore / stats.totalSubmissions : 0,
      submissionRate: stats.totalStudents > 0 ? (stats.totalSubmissions / stats.totalStudents) * 100 : 0
    }));

    console.log('Sending statistics:', statistics);
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching quiz statistics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific quiz
router.get('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // For students, check if quiz is available
    if (req.user.role === 'student') {
      const isAvailable = quiz.isActive &&
        quiz.startTime <= new Date() &&
        quiz.endTime >= new Date() &&
        quiz.allowedGroups.some(group =>
          group.year === req.user.year &&
          group.department === req.user.department &&
          group.section === req.user.section
        );

      if (!isAvailable) {
        return res.status(403).json({ message: 'Quiz not available' });
      }
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start a quiz attempt
router.post('/:id/start', auth, authorize('student'), async (req, res) => {
  try {
    console.log('Starting quiz attempt:', {
      quizId: req.params.id,
      studentId: req.user._id,
      studentDetails: {
        department: req.user.department,
        year: req.user.year,
        section: req.user.section
      }
    });

    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      console.log('Quiz not found:', req.params.id);
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is available
    const now = new Date();
    const isAvailable = quiz.isActive &&
      new Date(quiz.startTime) <= now &&
      new Date(quiz.endTime) >= now &&
      quiz.allowedGroups.some(group =>
        group.year === req.user.year &&
        group.department === req.user.department &&
        group.section === req.user.section
      );

    console.log('Quiz availability check:', {
      quizId: quiz._id,
      title: quiz.title,
      isActive: quiz.isActive,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      now: now,
      userYear: req.user.year,
      userDepartment: req.user.department,
      userSection: req.user.section,
      allowedGroups: quiz.allowedGroups,
      isAvailable: isAvailable
    });

    if (!isAvailable) {
      return res.status(403).json({ 
        message: 'Quiz not available',
        details: {
          isActive: quiz.isActive,
          startTime: quiz.startTime,
          endTime: quiz.endTime,
          allowedGroups: quiz.allowedGroups
        }
      });
    }

    // Check if student has already attempted the quiz
    const existingAttempt = await QuizSubmission.findOne({
      quiz: quiz._id,
      student: req.user._id
    });

    if (existingAttempt) {
      console.log('Existing attempt found:', {
        submissionId: existingAttempt._id,
        status: existingAttempt.status,
        startTime: existingAttempt.startTime
      });
      return res.status(400).json({ 
        message: 'Quiz already attempted',
        submissionId: existingAttempt._id,
        status: existingAttempt.status
      });
    }

    // Create new quiz submission
    const submission = new QuizSubmission({
      quiz: quiz._id,
      student: req.user._id,
      startTime: new Date(),
      status: 'started'
    });

    await submission.save();
    console.log('New submission created:', {
      submissionId: submission._id,
      quizId: quiz._id,
      studentId: req.user._id,
      startTime: submission.startTime
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Error in quiz start:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Submit quiz answers
router.post('/:id/submit', auth, authorize('student'), async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({
      quiz: req.params.id,
      student: req.user._id,
      status: 'started'
    });

    if (!submission) {
      return res.status(404).json({ message: 'Quiz submission not found' });
    }

    const quiz = await Quiz.findById(req.params.id);
    
    // Calculate duration in minutes
    const startTime = new Date(submission.startTime);
    const submitTime = new Date();
    const durationInMinutes = Math.ceil((submitTime - startTime) / (1000 * 60));

    // Evaluate answers and calculate total marks
    const answers = req.body.answers.map(answer => {
      const question = quiz.questions.id(answer.questionId);
      const isCorrect = question.correctAnswer === answer.selectedOption;
      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isCorrect: isCorrect,
        marks: isCorrect ? question.marks : 0
      };
    });

    const totalMarks = answers.reduce((sum, ans) => sum + ans.marks, 0);

    // Update submission with duration and other details
    submission.answers = answers;
    submission.submitTime = submitTime;
    submission.duration = durationInMinutes;
    submission.totalMarks = totalMarks;
    submission.status = 'evaluated';
    
    await submission.save();
    console.log('Submission saved with duration:', durationInMinutes, 'minutes');

    res.json(submission);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update quiz (faculty only)
router.put('/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    // Validate dates first
    try {
      Quiz.validateDates(req.body.startTime, req.body.endTime);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    // Convert date strings to Date objects
    const updateData = {
      ...req.body,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime)
    };

    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      updateData,
      { 
        new: true, 
        runValidators: true
      }
    ).populate('subject', 'name code');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : undefined
    });
  }
});

// Get all authorized students with submission status for a quiz
router.get('/:id/authorized-students', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Get all students who are authorized to take this quiz
    const authorizedStudents = await User.find({
      role: 'student',
      department: { $in: quiz.allowedGroups.map(group => group.department) },
      year: { $in: quiz.allowedGroups.map(group => group.year) },
      section: { $in: quiz.allowedGroups.map(group => group.section) }
    }).select('name admissionNumber department year section');
    
    // Get all submissions for this quiz
    const submissions = await QuizSubmission.find({ quiz: req.params.id })
      .select('student status submitTime totalMarks startTime duration answers')
      .lean();

    // Create a map of student IDs to their submission status
    const submissionMap = {};
    submissions.forEach(sub => {
      // Calculate total marks if not already calculated
      const totalMarks = sub.answers ? sub.answers.reduce((sum, ans) => sum + (ans.marks || 0), 0) : 0;
      
      submissionMap[sub.student.toString()] = {
        status: sub.status,
        submitTime: sub.submitTime,
        totalMarks: totalMarks,
        startTime: sub.startTime,
        duration: sub.duration // Duration in minutes
      };
    });

    // Combine student data with submission status
    const result = authorizedStudents.map(student => {
      const submission = submissionMap[student._id.toString()] || null;
      return {
        student: {
          _id: student._id,
          name: student.name,
          admissionNumber: student.admissionNumber,
          department: student.department,
          year: student.year,
          section: student.section
        },
        hasSubmitted: !!submission && submission.status === 'evaluated',
        submissionStatus: submission?.status || 'not attempted',
        submitTime: submission?.submitTime || null,
        totalMarks: submission?.totalMarks || null,
        startTime: submission?.startTime || null,
        duration: submission?.duration || null // Duration in minutes
      };
    });

    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        allowedGroups: quiz.allowedGroups,
        totalMarks: quiz.totalMarks
      },
      students: result
    });

  } catch (error) {
    console.error('Error fetching authorized students:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message
    });
  }
});

// Delete quiz (faculty only)
router.delete('/:id', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz from image
router.post('/upload/image', auth, authorize('faculty'), upload.single('file'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if the file is an image
    if (!req.file.mimetype.startsWith('image/')) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    // Validate required fields
    const requiredFields = ['title', 'subjectCode', 'duration', 'startTime', 'endTime', 'allowedGroups'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    try {
      // Extract questions from image
      console.log('Processing image:', req.file.path);
      const extractedData = await imageProcessor.extractTextFromImage(req.file.path);

      if (!extractedData || !extractedData.questions || extractedData.questions.length === 0) {
        throw new Error('No questions could be extracted from the image');
      }

      console.log('Extracted questions:', extractedData);

      // Create quiz with extracted questions
      const quiz = new Quiz({
        title: req.body.title,
        subject: req.body.subjectCode,
        duration: parseInt(req.body.duration),
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        createdBy: req.user._id,
        questions: extractedData.questions,
        totalMarks: extractedData.totalMarks,
        allowedGroups: JSON.parse(req.body.allowedGroups)
      });

      await quiz.save();

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.status(201).json({
        quiz,
        message: `Successfully extracted ${extractedData.questions.length} questions from image`
      });
    } catch (error) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      throw error;
    }
  } catch (error) {
    console.error('Error creating quiz from image:', error);

    // Handle different types of errors
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid JSON format in request body' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }

    res.status(400).json({ 
      message: error.message || 'Error creating quiz'
    });
  } finally {
    // Clean up OCR worker
    await imageProcessor.cleanup();
  }
});

// Create quiz from Excel file
router.post('/upload/excel', auth, authorize('faculty'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const questions = data.map(row => ({
      question: row.Question,
      options: [row.Option1, row.Option2, row.Option3, row.Option4],
      correctAnswer: parseInt(row.CorrectAnswer) - 1,
      marks: row.Marks || 1,
      explanation: row.Explanation || ''
    }));

    const quiz = new Quiz({
      title: req.body.title,
      subject: req.body.subjectCode,
      duration: req.body.duration,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      createdBy: req.user._id,
      questions: questions
    });

    await quiz.save();

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz from Excel:', error);
    res.status(500).json({ message: 'Error creating quiz', error: error.message });
  }
});

// Get quiz submission
router.get('/:id/submission', auth, async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({
      quiz: req.params.id,
      student: req.user._id
    }).populate('quiz');

    if (!submission) {
      return res.status(404).json({ message: 'Quiz submission not found' });
    }

    // If submission is still in progress and the quiz time has expired
    if (submission.status === 'started') {
      const quiz = await Quiz.findById(req.params.id);
      const endTime = new Date(submission.startTime.getTime() + quiz.duration * 60000);
      if (new Date() > endTime) {
        // Auto-submit with current answers
        submission.status = 'evaluated';
        submission.submitTime = new Date();
        await submission.save();
      }
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching quiz submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions for a quiz (faculty only)
router.get('/:id/submissions', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz (skip check for admin)
    if (req.user.role === 'faculty' && quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    // Get all submissions for this quiz with student details
    const submissions = await QuizSubmission.find({ quiz: req.params.id })
      .populate('student', 'name admissionNumber department year section')
      .select('answers startTime submitTime duration totalMarks status')
      .sort({ submitTime: -1 });

    // Add quiz details to the response
    const response = {
      quiz: {
        title: quiz.title,
        totalMarks: quiz.totalMarks,
        duration: quiz.duration,
        questions: quiz.questions
      },
      submissions: submissions
    };

    res.json(response);
  } catch (error) {
    console.error('Get quiz submissions error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions (admin)
router.get('/all-submissions', auth, authorize('admin'), async (req, res) => {
  try {
    // Get all submissions with populated references
    const submissions = await QuizSubmission.find()
      .populate('student', 'name admissionNumber department year section')
      .populate({
        path: 'quiz',
        select: 'title totalMarks questions createdBy',
        populate: {
          path: 'createdBy',
          select: 'name email department'
        }
      })
      .sort({ submitTime: -1 });

    if (!submissions) {
      return res.status(404).json({ message: 'No submissions found' });
    }

    // Group submissions by quiz
    const submissionsByQuiz = submissions.reduce((acc, submission) => {
      if (!acc[submission.quiz._id]) {
        acc[submission.quiz._id] = [];
      }
      acc[submission.quiz._id].push(submission);
      return acc;
    }, {});
    
    res.json(submissionsByQuiz);
  } catch (error) {
    console.error('Error fetching all submissions:', error);
    res.status(500).json({ 
      message: 'Server error while fetching submissions',
      error: error.message 
    });
  }
});

// Get individual student submission (faculty only)
router.get('/:quizId/submissions/:studentId', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    const submission = await QuizSubmission.findOne({
      quiz: req.params.quizId,
      student: req.params.studentId
    })
    .populate('student', 'name admissionNumber department year section')
    .populate('quiz', 'title totalMarks questions');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching student submission:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get quiz details for faculty view
router.get('/:id/details', auth, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if faculty owns this quiz
    if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not your quiz.' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get event quizzes
router.get('/event', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ type: 'event' })
      .populate('createdBy', 'name email department')
      .sort({ createdAt: -1 })
      .lean();

    res.json(quizzes);
  } catch (error) {
    console.error('Error fetching event quizzes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to determine quiz status
const getQuizStatus = (quiz) => {
  const now = new Date();
  if (!quiz.isActive) return 'inactive';
  if (now < new Date(quiz.startTime)) return 'upcoming';
  if (now > new Date(quiz.endTime)) return 'completed';
  return 'active';
};

module.exports = router; 