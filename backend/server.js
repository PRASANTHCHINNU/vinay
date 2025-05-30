const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Debug: Log environment variables
console.log('Environment Variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Exists (hidden for security)' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || 5000);

// Import routes
const authRouter = require('./routes/auth');
const quizRouter = require('./routes/quiz');
const academicDetailsRouter = require('./routes/academicDetails');
const adminRouter = require('./routes/admin');
const eventQuizRouter = require('./routes/eventQuiz');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware for requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

// Use routes
app.use('/api/auth', authRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/academic-details', academicDetailsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/event-quiz', eventQuizRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers
  });
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Something broke!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
const FALLBACK_PORTS = [5001, 5002, 5003];

const startServer = async (port) => {
  try {
    // Direct Atlas URL connection
    const ATLAS_URL = 'mongodb+srv://vinaybuttala:vinay123@cluster0.za6yh4j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Attempting to connect to MongoDB Atlas...');
    
    await mongoose.connect(ATLAS_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Successfully connected to MongoDB Atlas!');
    console.log('Database name:', mongoose.connection.name);
    console.log('Database host:', mongoose.connection.host);

    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`CORS enabled for origins:`, corsOptions.origin);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying next port...`);
        const nextPort = FALLBACK_PORTS.shift();
        if (nextPort) {
          startServer(nextPort);
        } else {
          console.error('No available ports found');
          process.exit(1);
        }
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

startServer(PORT); 