# College Quiz System

A web-based quiz system for colleges, supporting multiple years and departments. Built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

## Features

- User authentication for students and faculty
- Support for different departments and years
- Subject-wise quiz organization
- Automatic quiz evaluation
- Real-time quiz timer
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4 or higher)
- npm or yarn package manager

## Project Structure

```
college-quiz/
├── backend/           # Backend server code
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   ├── middleware/   # Custom middleware
│   └── server.js     # Server entry point
└── frontend/         # Frontend React application
    ├── src/
    │   ├── components/  # React components
    │   ├── context/     # Context providers
    │   └── App.jsx     # Main application component
    └── index.html
```

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd college-quiz
   ```

2. Install dependencies for both frontend and backend:
   ```bash
   npm run install-deps
   ```

3. Create a `.env` file in the backend directory with the following content:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/college_quiz
   JWT_SECRET=your_jwt_secret_key_here
   ```

## Running the Application

1. Start MongoDB:
   ```bash
   mongod
   ```

2. Start both frontend and backend servers with a single command:
   ```bash
   npm start
   ```

   This will start:
   - Frontend at http://localhost:5173
   - Backend API at http://localhost:5000

   You can also use:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Quizzes
- GET `/api/quiz` - Get all quizzes (filtered by role)
- POST `/api/quiz` - Create a new quiz (faculty only)
- GET `/api/quiz/:id` - Get quiz details
- POST `/api/quiz/:id/start` - Start a quiz attempt
- POST `/api/quiz/:id/submit` - Submit quiz answers

### Subjects
- GET `/api/subject` - Get all subjects
- POST `/api/subject` - Create a new subject (admin only)
- PUT `/api/subject/:id` - Update a subject (admin only)
- DELETE `/api/subject/:id` - Delete a subject (admin only)

## User Roles

1. Students:
   - Can view and attempt available quizzes
   - Can view their quiz history and scores

2. Faculty:
   - Can create and manage quizzes
   - Can view student submissions
   - Can manage their subjects

3. Admin:
   - Can manage subjects
   - Can manage all users
   - Has access to all system features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 