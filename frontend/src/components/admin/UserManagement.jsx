import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../../config/axios';

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];
const YEARS = [1, 2, 3, 4];
const SECTIONS = ['A', 'B', 'C', 'D'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    department: '',
    year: '',
    section: '',
    admissionNumber: '',
    isLateral: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/students');
      
      if (response?.data) {
        setUsers(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateAdmissionNumber = async (admissionNumber, department, year, isLateral) => {
    try {
      const response = await api.post('/api/admin/validate-admission', {
        admissionNumber,
        department,
        year,
        isLateral
      });
      return response.data.isValid;
    } catch (err) {
      console.error('Error validating admission number:', err);
      throw new Error(err.response?.data?.message || 'Failed to validate admission number');
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        year: user.year || '',
        section: user.section || '',
        admissionNumber: user.admissionNumber || '',
        isLateral: user.isLateral || false
      });
    } else {
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'student',
        department: '',
        year: '',
        section: '',
        admissionNumber: '',
        isLateral: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');

      // Validate admission number against ranges if it's a student
      if (formData.role === 'student') {
        const isValid = await validateAdmissionNumber(
          formData.admissionNumber,
          formData.department,
          formData.year,
          formData.isLateral
        );

        if (!isValid) {
          setError('Invalid admission number. The number is not within the allowed ranges for the selected department and year.');
          return;
        }
      }

      if (selectedUser) {
        await api.put(`/api/admin/users/${selectedUser._id}`, formData);
      } else {
        await api.post('/api/admin/users', formData);
      }
      fetchUsers();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setError('');
        await api.delete(`/api/admin/users/${userId}`);
        fetchUsers();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleOpenDialog()}
        >
          Add New User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Section</TableCell>
              <TableCell>Admission No.</TableCell>
              <TableCell>Entry Type</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.department || '-'}</TableCell>
                <TableCell>{user.year || '-'}</TableCell>
                <TableCell>{user.section || '-'}</TableCell>
                <TableCell>{user.admissionNumber || '-'}</TableCell>
                <TableCell>{user.isLateral ? 'Lateral' : 'Regular'}</TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenDialog(user)} size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(user._id)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    label="Role"
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="faculty">Faculty</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {formData.role === 'student' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        label="Department"
                        required
                      >
                        {DEPARTMENTS.map(dept => (
                          <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        label="Year"
                        required
                      >
                        {YEARS.map(year => (
                          <MenuItem key={year} value={year}>Year {year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Section</InputLabel>
                      <Select
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                        label="Section"
                        required
                      >
                        {SECTIONS.map(section => (
                          <MenuItem key={section} value={section}>Section {section}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Entry Type</InputLabel>
                      <Select
                        value={formData.isLateral}
                        onChange={(e) => setFormData({ ...formData, isLateral: e.target.value })}
                        label="Entry Type"
                        required
                      >
                        <MenuItem value={false}>Regular</MenuItem>
                        <MenuItem value={true}>Lateral</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Admission Number"
                      value={formData.admissionNumber}
                      onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                      required
                      helperText="Format: y22cs001 (Regular) or l22cs001 (Lateral)"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement; 