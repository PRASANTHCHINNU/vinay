import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/api/auth/profile', {
        name: formData.name,
        email: formData.email
      });

      updateUser(response.data);
      setSuccess('Profile updated successfully');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await api.put('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setSuccess('Password changed successfully');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Profile Settings
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={handleProfileUpdate}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Profile'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" gutterBottom>
          Change Password
        </Typography>

        <Box component="form" onSubmit={handlePasswordChange}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Change Password'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {user?.role === 'student' && (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h5" gutterBottom>
              Academic Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={user.department || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Year"
                  value={user.year || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Section"
                  value={user.section || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Admission Number"
                  value={user.admissionNumber || ''}
                  disabled
                />
              </Grid>
            </Grid>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default Profile; 