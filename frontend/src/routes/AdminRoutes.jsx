import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/admin/Dashboard';
import QuizManagement from '../components/admin/QuizManagement';
import ResultAnalysis from '../components/admin/ResultAnalysis';
import DepartmentManagement from '../components/admin/DepartmentManagement';
import UserManagement from '../components/admin/UserManagement';
import FacultyAccounts from '../components/admin/FacultyAccounts';
import StudentAccounts from '../components/admin/StudentAccounts';
import EventQuizAccounts from '../components/admin/EventQuizAccounts';
import CollegeSettings from '../components/admin/CollegeSettings';
import { useAuth } from '../context/AuthContext';

const AdminRoutes = () => {
  const { user } = useAuth();

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="quizzes" element={<QuizManagement />} />
      <Route path="results" element={<ResultAnalysis />} />
      <Route path="departments" element={<DepartmentManagement />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="faculty-accounts" element={<FacultyAccounts />} />
      <Route path="student-accounts" element={<StudentAccounts />} />
      <Route path="event-accounts" element={<EventQuizAccounts />} />
      <Route path="college-settings" element={<CollegeSettings />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default AdminRoutes; 