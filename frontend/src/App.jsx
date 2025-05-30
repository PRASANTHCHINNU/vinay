import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import { NavigationProvider } from './context/NavigationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/common/Navigation';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import Navbar from './components/layout/Navbar';
import QuizList from './components/quiz/QuizList';
import QuizCreate from './components/quiz/QuizCreate';
import QuizFileUpload from './components/quiz/QuizFileUpload';
import QuizAttempt from './components/quiz/QuizAttempt';
import QuizReview from './components/quiz/QuizReview';
import QuizSubmissions from './components/quiz/QuizSubmissions';
import QuizEdit from './components/quiz/QuizEdit';
import SubjectList from './components/subject/SubjectList';
import SubjectCreate from './components/subject/SubjectCreate';
import SubjectEdit from './components/subject/SubjectEdit';
import AdmissionRanges from './components/admin/AdmissionRanges';
import QuizOverview from './components/quiz/QuizOverview';
import QuizStatistics from './components/quiz/QuizStatistics';
import AdminRoutes from './routes/AdminRoutes';
import EventQuizAccounts from './components/admin/EventQuizAccounts';
import AdminEventQuizzes from './components/admin/EventQuizzes';
import PublicEventQuizzes from './components/quiz/EventQuizzes';
import AccountManagement from './components/admin/AccountManagement';
import Profile from './components/profile/Profile';
import StudentAccounts from './components/admin/StudentAccounts';
import LandingPage from './components/LandingPage';
import EventPage from './components/event/EventPage';

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e3a8a', // Deep blue for professional look
      light: '#2563eb',
      dark: '#1e40af',
    },
    secondary: {
      main: '#0f766e', // Teal for accent
      light: '#0d9488',
      dark: '#115e59',
    },
    background: {
      default: '#f8fafc', // Light gray background
      paper: '#ffffff',
    },
    error: {
      main: '#dc2626',
    },
    success: {
      main: '#16a34a',
    },
    warning: {
      main: '#d97706',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    button: {
      textTransform: 'none', // Prevents all-caps buttons
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          height: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '2rem',
          paddingBottom: '2rem',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          padding: '0.5rem 1.5rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderRadius: '12px',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
});

// Loader component for showing loading state
const LoadingScreen = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      width: '100%'
    }}
  >
    <CircularProgress />
  </Box>
);

// Improved PrivateRoute component
const PrivateRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return <LoadingScreen />;
  }

  // If no user is found, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user's role doesn't match, redirect to appropriate dashboard
  if (roles.length > 0 && !roles.includes(user.role)) {
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'faculty':
        return <Navigate to="/faculty/dashboard" replace />;
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'event':
        return <Navigate to="/event/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Route component to redirect based on user role
const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'faculty':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    case 'event':
      return <Navigate to="/event/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Root level routing component that handles auth state
const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth status
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <Routes>
        {/* Public Routes - accessible to all */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <RoleBasedRedirect /> : <Login />} />
        <Route path="/register" element={user ? <RoleBasedRedirect /> : <Register />} />
        <Route path="/events" element={<PublicEventQuizzes />} />

        {/* Event Routes */}
        <Route path="/event/*" element={
          <PrivateRoute roles={['event']}>
            <Navigation>
              <Routes>
                <Route path="/dashboard" element={<EventPage />} />
                <Route path="*" element={<Navigate to="/event/dashboard" replace />} />
              </Routes>
            </Navigation>
          </PrivateRoute>
        } />

        {/* Student Routes */}
        <Route path="/student/*" element={
          <PrivateRoute roles={['student']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quizzes" element={<QuizList />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
              </Routes>
            </Box>
          </PrivateRoute>
        } />

        {/* Faculty Routes */}
        <Route path="/faculty/*" element={
          <PrivateRoute roles={['faculty']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/quizzes" element={<QuizList />} />
                <Route path="/quizzes/create" element={<QuizCreate />} />
                <Route path="/quizzes/:id/edit" element={<QuizEdit />} />
                <Route path="/quizzes/:id/submissions" element={<QuizSubmissions />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/faculty/dashboard" replace />} />
              </Routes>
            </Box>
          </PrivateRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <PrivateRoute roles={['admin']}>
            <Navigation />
            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <AdminRoutes />
            </Box>
          </PrivateRoute>
        } />

        {/* Default redirect based on role */}
        <Route path="/dashboard" element={<RoleBasedRedirect />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <NavigationProvider>
              <AppRoutes />
            </NavigationProvider>
          </AuthProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;