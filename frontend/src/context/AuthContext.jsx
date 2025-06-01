import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';

// Create the auth context
const AuthContext = createContext(null);

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found in localStorage');
          setUser(null);
          setLoading(false);
          return;
        }

        console.log('Verifying token and fetching user data...');
        // Make API call to verify token and get user data
        const response = await api.get('/api/auth/me');
        
        // Handle both response structures (direct or nested in data)
        const userData = response.data?.user || response.user;
        
        if (userData) {
          console.log('User data received:', {
            id: userData.id,
            role: userData.role,
            department: userData.department,
            year: userData.year,
            section: userData.section
          });
          setUser(userData);
        } else {
          console.log('No user data received, clearing auth state');
          // If no user data, clear token and user state
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        // Only clear auth if it's an auth error (401/403)
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('Auth error - clearing user state');
          localStorage.removeItem('token');
          setUser(null);
        }
        setAuthError(error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up interval to periodically check token validity
    const authCheckInterval = setInterval(checkAuth, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(authCheckInterval);
  }, [navigate]);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      setLoading(true);
      
      console.log('Attempting login for:', email);
      // Make the API request
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      
      // Extract token and user data from response
      const { token, user } = response.data || response;
      
      if (!token || !user) {
        throw new Error('Invalid credentials');
      }
      
      console.log('Login successful:', {
        userId: user.id,
        role: user.role,
        department: user.department,
        year: user.year,
        section: user.section
      });
      
      // Store token and update user state
      localStorage.setItem('token', token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      const errorMessage = error.response?.data?.message || error.message || 'Failed to login';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  // Provide auth state and methods to consuming components
  const value = {
    user,
    loading,
    authError,
    login,
    logout,
    setAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;