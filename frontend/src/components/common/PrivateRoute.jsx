import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login with return path
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Enhanced role-based access check
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log('Access denied:', {
      userRole: user.role,
      allowedRoles,
      path: location.pathname
    });
    
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'faculty':
        return <Navigate to="/dashboard" replace />;
      case 'student':
        return <Navigate to="/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default PrivateRoute; 