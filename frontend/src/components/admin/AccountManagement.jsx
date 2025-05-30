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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../../config/axios';

const YEARS = [1, 2, 3, 4];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const AccountManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    year: '',
    section: '',
    admissionNumber: ''
  });

  useEffect(() => {
    fetchAccounts();
    fetchDepartments();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/accounts');
      setAccounts(response.accounts);
    } catch (error) {
      setError('Failed to fetch accounts');
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/settings/departments');
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to fetch departments');
    }
  };

  const handleOpenDialog = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        email: account.email,
        password: '',
        department: account.department,
        year: account.year,
        section: account.section,
        admissionNumber: account.admissionNumber
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        department: '',
        year: '',
        section: '',
        admissionNumber: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAccount(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      department: '',
      year: '',
      section: '',
      admissionNumber: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.put(`/api/admin/accounts/${editingAccount._id}`, formData);
      } else {
        await api.post('/api/admin/accounts', formData);
      }
      fetchAccounts();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save account');
    }
  };

  const handleDelete = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await api.delete(`/api/admin/accounts/${accountId}`);
        fetchAccounts();
      } catch (error) {
        setError('Failed to delete account');
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate and format the data
        const accounts = jsonData.map(row => ({
          name: row.Name || row.name,
          email: row.Email || row.email,
          password: row.Password || row.password || Math.random().toString(36).slice(-8),
          department: row.Department || row.department,
          year: parseInt(row.Year || row.year),
          section: row.Section || row.section,
          admissionNumber: row['Admission Number'] || row.admissionNumber
        }));

        // Upload the accounts
        await api.post('/api/admin/accounts/bulk', { accounts });
        fetchAccounts();
      } catch (error) {
        setError('Failed to process Excel file');
        console.error('Error processing Excel file:', error);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Account Management</Typography>
          <Box>
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="excel-upload"
              onChange={handleFileUpload}
            />
            <label htmlFor="excel-upload">
              <Button
                component="span"
                variant="outlined"
                startIcon={<UploadIcon />}
                sx={{ mr: 2 }}
              >
                Upload Excel
              </Button>
            </label>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Account
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Year</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account._id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.department}</TableCell>
                    <TableCell>{account.year}</TableCell>
                    <TableCell>{account.section}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(account)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(account._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          {editingAccount ? 'Edit Account' : 'Add New Account'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
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
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingAccount}
                helperText={editingAccount ? "Leave blank to keep current password" : ""}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  label="Department"
                  required
                >
                  {departments.map(dept => (
                    <MenuItem key={dept._id} value={dept.name}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
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
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  label="Section"
                  required
                >
                  {SECTIONS.map(section => (
                    <MenuItem key={section} value={section}>Section {section}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAccount ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AccountManagement; 