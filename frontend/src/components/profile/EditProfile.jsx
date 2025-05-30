import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    year: '',
    semester: '',
    section: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        year: user.year || '',
        semester: user.semester || '',
        section: user.section || '',
        password: ''
      });
    }
    fetchDepartments();
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/settings/departments');
      setDepartments(response.data.departments);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to fetch departments');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/api/profile', formData);
      updateUser(response.data);
      setSuccess('Profile updated successfully');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Edit Profile
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
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
                required
                disabled
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  label="Department"
                >
                  {departments.map(dept => (
                    <MenuItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {user?.role === 'student' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Year</InputLabel>
                    <Select
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      label="Year"
                    >
                      <MenuItem value={1}>First Year</MenuItem>
                      <MenuItem value={2}>Second Year</MenuItem>
                      <MenuItem value={3}>Third Year</MenuItem>
                      <MenuItem value={4}>Fourth Year</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Semester</InputLabel>
                    <Select
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                      label="Semester"
                      disabled={!formData.year}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <MenuItem key={sem} value={sem}>
                          Semester {sem}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Section</InputLabel>
                    <Select
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      label="Section"
                      disabled={!formData.department || !formData.year}
                    >
                      {['A', 'B', 'C', 'D', 'E'].map(section => (
                        <MenuItem key={section} value={section}>
                          Section {section}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                helperText="Leave blank to keep current password"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Update Profile
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditProfile; 