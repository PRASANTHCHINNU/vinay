import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const isAdminRegistration = searchParams.get('role') === 'admin';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: isAdminRegistration ? 'admin' : 'faculty',
    department: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If admin registration is requested, verify no admin exists
    if (isAdminRegistration) {
      const checkAdminExists = async () => {
        try {
          const response = await api.get('/api/auth/check-admin');
          if (response.adminExists) {
            navigate('/login');
          }
        } catch (error) {
          console.error('Error checking admin existence:', error);
          navigate('/login');
        }
      };
      checkAdminExists();
    }
  }, [isAdminRegistration, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department
      });

      if (result.success) {
        // Navigation will be handled by the AuthContext
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {isAdminRegistration ? 'Admin Registration' : 'Faculty Registration'}
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          {isAdminRegistration 
            ? 'Register as the system administrator'
            : 'Register as a faculty member to create and manage quizzes'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="Role"
              disabled
            >
              <MenuItem value={isAdminRegistration ? 'admin' : 'faculty'}>
                {isAdminRegistration ? 'Admin' : 'Faculty'}
              </MenuItem>
            </Select>
          </FormControl>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 3 }}
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>
          
          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Already have an account? Sign In
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;