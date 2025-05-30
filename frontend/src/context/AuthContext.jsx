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
          setUser(null);
          setLoading(false);
          return;
        }

        // Make API call to verify token and get user data
        const response = await api.get('/api/auth/me');
        
        // Handle both response structures (direct or nested in data)
        const userData = response.data?.user || response.user;
        
        if (userData) {
          setUser(userData);
        } else {
          // If no user data, clear token and user state
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Only clear auth if it's an auth error (401/403)
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          setUser(null);
          navigate('/login');
        }
        setAuthError(error.message);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      setLoading(true);
      
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
      
      // Store token and update user state
      localStorage.setItem('token', token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to login';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
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