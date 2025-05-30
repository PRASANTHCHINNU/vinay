import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Navigation from './components/common/Navigation';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import StudentAccounts from './components/admin/StudentAccounts';
import FacultyAccounts from './components/admin/FacultyAccounts';
import EventQuizAccounts from './components/admin/EventQuizAccounts';
import QuizList from './components/quiz/QuizList';
import QuizCreate from './components/quiz/QuizCreate';
import QuizEdit from './components/quiz/QuizEdit';
import QuizAttempt from './components/quiz/QuizAttempt';
import QuizReview from './components/quiz/QuizReview';
import Profile from './components/profile/Profile';
import AdminRoutes from './routes/AdminRoutes';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <PrivateRoute>
                <Navigation />
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            } />

            <Route path="/dashboard" element={
              <PrivateRoute>
                <Navigation />
                <Dashboard />
              </PrivateRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/*" element={
              <PrivateRoute allowedRoles={['admin']}>
                <Navigation />
                <AdminRoutes />
              </PrivateRoute>
            } />

            {/* Quiz Routes */}
            <Route path="/quizzes" element={
              <PrivateRoute>
                <Navigation />
                <QuizList />
              </PrivateRoute>
            } />

            {/* Profile Route */}
            <Route path="/profile" element={<Profile />} />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; 