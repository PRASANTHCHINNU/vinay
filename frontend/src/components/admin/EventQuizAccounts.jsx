import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../config/axios';

const EventQuizAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    eventType: 'department'
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    eventType: 'all',
    department: 'all'
  });

  useEffect(() => {
    fetchAccounts();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/academic-details');
      if (response && Array.isArray(response)) {
        // Extract unique departments
        const uniqueDepartments = [...new Set(
          response
            .filter(detail => detail && detail.department)
            .map(detail => detail.department)
        )].sort();
        setDepartments(uniqueDepartments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to fetch departments');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!newAccount.name.trim()) errors.name = 'Name is required';
    if (!newAccount.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAccount.email)) errors.email = 'Invalid email format';
    if (!newAccount.password) errors.password = 'Password is required';
    else if (newAccount.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (newAccount.eventType === 'department' && !newAccount.department) {
      errors.department = 'Department is required for department events';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/admin/event-quiz-accounts');
      if (Array.isArray(response)) {
        setAccounts(response);
      } else if (response && Array.isArray(response.accounts)) {
        setAccounts(response.accounts);
      } else {
        console.error('Invalid accounts response:', response);
        setError('Invalid response format from server');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to fetch event accounts');
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    try {
      setError('');
      // Check if email already exists
      const response = await api.get('/api/admin/event-quiz-accounts');
      const existingAccounts = response.accounts || [];
      const emailExists = existingAccounts.some(account => account.email === newAccount.email);
      
      if (emailExists) {
        setValidationErrors(prev => ({
          ...prev,
          email: 'This email is already registered'
        }));
        return;
      }

      await api.post('/api/admin/event-quiz-accounts', newAccount);
      setOpenDialog(false); // Close the dialog after successful creation
      setNewAccount({
        name: '',
        email: '',
        password: '',
        department: '',
        eventType: 'department'
      });
      setValidationErrors({});
      await fetchAccounts(); // Added await here
    } catch (error) {
      console.error('Error creating account:', error);
      if (error.response?.data?.message === 'Email already registered') {
        setValidationErrors(prev => ({
          ...prev,
          email: 'This email is already registered'
        }));
      } else {
        setError(error.response?.data?.message || 'Failed to create account');
      }
    }
  };

  const handleDeleteAccount = async (accountId) => {
    try {
      setError('');
      await api.delete(`/api/admin/event-quiz-accounts/${accountId}`);
      fetchAccounts();
      setOpenDeleteDialog(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleDeleteClick = (account) => {
    setAccountToDelete(account);
    setOpenDeleteDialog(true);
  };

  const handleEdit = (account) => {
    setEditingId(account._id);
    setNewAccount({
      name: account.name,
      email: account.email,
      password: '', // Don't show existing password
      department: account.department,
      eventType: account.eventType
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewAccount({
      name: '',
      email: '',
      password: '',
      department: '',
      eventType: 'department'
    });
    setValidationErrors({});
  };

  const handleUpdateAccount = async () => {
    if (!validateForm()) return;

    try {
      setError('');
      // Check if email already exists (excluding the current account)
      const response = await api.get('/api/admin/event-quiz-accounts');
      const existingAccounts = response.accounts || [];
      const emailExists = existingAccounts.some(
        account => account.email === newAccount.email && account._id !== editingId
      );
      
      if (emailExists) {
        setValidationErrors(prev => ({
          ...prev,
          email: 'This email is already registered'
        }));
        return;
      }

      const updateData = {
        name: newAccount.name,
        email: newAccount.email,
        department: newAccount.department,
        eventType: newAccount.eventType
      };
      
      // Only include password if it's been changed
      if (newAccount.password) {
        updateData.password = newAccount.password;
      }

      await api.put(`/api/admin/event-quiz-accounts/${editingId}`, updateData);
      setEditingId(null);
      setNewAccount({
        name: '',
        email: '',
        password: '',
        department: '',
        eventType: 'department'
      });
      setValidationErrors({});
      await fetchAccounts(); // Added await here
    } catch (error) {
      console.error('Error updating account:', error);
      if (error.response?.data?.message === 'Email already registered') {
        setValidationErrors(prev => ({
          ...prev,
          email: 'This email is already registered'
        }));
      } else {
        setError(error.response?.data?.message || 'Failed to update account');
      }
    }
  };

  // Add toggle password visibility function
  const togglePasswordVisibility = async (accountId) => {
    try {
      if (!visiblePasswords[accountId]) {
        // Fetch password only if not already visible
        const response = await api.get(`/api/admin/event-quiz-accounts/passwords/${accountId}`);
        if (response && response.password) {
          setVisiblePasswords(prev => ({
            ...prev,
            [accountId]: response.password
          }));
        } else {
          setError('Failed to fetch password');
        }
      } else {
        // Hide password
        setVisiblePasswords(prev => {
          const newState = { ...prev };
          delete newState[accountId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error fetching password:', error);
      setError('Failed to fetch password');
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Event Quiz Accounts', 14, 15);
    
    // Add timestamp and counts
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Event Quiz Accounts: ${accounts.length}`, 14, 28);
    
    // Prepare table data
    const tableData = accounts.map(account => [
      account.name,
      account.email,
      account.eventType,
      account.department || 'N/A',
      visiblePasswords[account._id] || '********'
    ]);
    
    // Add table
    doc.autoTable({
      startY: 35,
      head: [['Name', 'Email', 'Event Type', 'Department', 'Password']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 71, 71] }
    });
    
    // Save PDF
    doc.save('event-quiz-accounts.pdf');
  };

  // Add file upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadError('');
    setUploadStatus('reading');
    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setUploadProgress(30);
        setUploadStatus('validating');

        // Validate the data structure
        const validationErrors = [];
        const processedData = jsonData.map((row, index) => {
          const errors = [];
          if (!row.Name && !row.name) errors.push('Name is required');
          if (!row.Email && !row.email) errors.push('Email is required');
          if (!row.EventType && !row.eventType) errors.push('EventType is required');
          if ((row.EventType || row.eventType) === 'department' && !row.Department && !row.department) {
            errors.push('Department is required for department events');
          }

          if (errors.length > 0) {
            validationErrors.push(`Row ${index + 1}: ${errors.join(', ')}`);
          }

          return {
            name: row.Name || row.name,
            email: row.Email || row.email,
            password: row.Password || row.password || Math.random().toString(36).slice(-8),
            eventType: row.EventType || row.eventType || 'department',
            department: row.Department || row.department,
            validationErrors: errors
          };
        });

        setUploadProgress(50);

        if (validationErrors.length > 0) {
          setUploadError(`Validation errors found:\n${validationErrors.join('\n')}`);
          setUploadStatus('error');
          return;
        }

        setUploadPreview(processedData);
        setUploadProgress(70);
        setUploadStatus('ready');

      } catch (error) {
        console.error('Error processing Excel file:', error);
        setUploadError('Failed to process Excel file. Please check the format.');
        setUploadStatus('error');
      }
    };

    reader.onerror = () => {
      setUploadError('Failed to read the file. Please try again.');
      setUploadStatus('error');
    };

    reader.readAsArrayBuffer(file);
  };

  // Add confirm upload handler
  const handleConfirmUpload = async () => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(80);

      // Upload the accounts
      const response = await api.post('/api/admin/event-quiz-accounts/bulk', { 
        accounts: uploadPreview
      });

      setUploadProgress(100);
      setUploadStatus('success');
      console.log('Bulk upload response:', response);
      
      // Close dialog and refresh accounts list after short delay
      setTimeout(() => {
        setOpenUploadDialog(false);
        fetchAccounts();
        // Reset upload states
        setUploadedFile(null);
        setUploadPreview([]);
        setUploadProgress(0);
        setUploadStatus('');
      }, 1500);

    } catch (error) {
      console.error('Error uploading accounts:', error);
      setUploadError(error.message || 'Failed to upload accounts');
      setUploadStatus('error');
    }
  };

  // Add filtered accounts getter
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = filters.search === '' || 
      account.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      account.email.toLowerCase().includes(filters.search.toLowerCase());

    const matchesEventType = filters.eventType === 'all' || 
      account.eventType === filters.eventType;

    const matchesDepartment = filters.department === 'all' || 
      account.department === filters.department;

    return matchesSearch && matchesEventType && matchesDepartment;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Event Quiz Accounts
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => setOpenUploadDialog(true)}
          >
            Upload Excel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setOpenDialog(true)}
          >
            Create New Account
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Add Filter Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search by name or email"
              variant="outlined"
              size="small"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filters.eventType}
                label="Event Type"
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  eventType: e.target.value,
                  // Reset department if organization is selected
                  department: e.target.value === 'organization' ? 'all' : prev.department
                }))}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="department">Department</MenuItem>
                <MenuItem value="organization">Organization</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.department}
                label="Department"
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                disabled={filters.eventType === 'organization'}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Count Display */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Typography variant="subtitle1">
              Total Event Quiz Accounts: {accounts.length} (Showing {filteredAccounts.length})
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Event Type</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Password</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAccounts.map((account) => (
              <TableRow key={account._id}>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.email}</TableCell>
                <TableCell>{account.eventType || 'department'}</TableCell>
                <TableCell>{account.department || 'N/A'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>
                      {visiblePasswords[account._id] || '********'}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => togglePasswordVisibility(account._id)}
                    >
                      {visiblePasswords[account._id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(account)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(account)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openDialog} 
        onClose={() => {
          setOpenDialog(false);
          setValidationErrors({});
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Event Quiz Account</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={newAccount.eventType}
                onChange={(e) => setNewAccount({ ...newAccount, eventType: e.target.value, department: e.target.value === 'organization' ? '' : newAccount.department })}
                label="Event Type"
              >
                <MenuItem value="department">Department</MenuItem>
                <MenuItem value="organization">Organization</MenuItem>
              </Select>
            </FormControl>

            {newAccount.eventType === 'department' && (
              <FormControl fullWidth error={!!validationErrors.department}>
                <InputLabel>Department</InputLabel>
                <Select
                  value={newAccount.department}
                  onChange={(e) => setNewAccount({ ...newAccount, department: e.target.value })}
                  label="Department"
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.department && (
                  <Typography color="error" variant="caption">
                    {validationErrors.department}
                  </Typography>
                )}
              </FormControl>
            )}

            <TextField
              label="Name"
              value={newAccount.name}
              onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={newAccount.email}
              onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={newAccount.password}
              onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              setValidationErrors({});
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateAccount} 
            variant="contained" 
            color="primary"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setAccountToDelete(null);
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this event quiz account?
          </Typography>
          {accountToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Account Details:
              </Typography>
              <Typography variant="body2">
                Email: {accountToDelete.email}
              </Typography>
              <Typography variant="body2">
                Department: {accountToDelete.department}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDeleteDialog(false);
            setAccountToDelete(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDeleteAccount(accountToDelete._id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Upload Excel Dialog */}
      <Dialog 
        open={openUploadDialog} 
        onClose={() => {
          if (uploadStatus !== 'uploading') {
            setOpenUploadDialog(false);
            setUploadedFile(null);
            setUploadPreview([]);
            setUploadProgress(0);
            setUploadStatus('');
            setUploadError('');
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Event Quiz Accounts</DialogTitle>
        <DialogContent>
          {/* Instructions Section */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Upload Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" gutterBottom>
                Upload an Excel file containing event quiz account information. The file should follow this structure:
              </Typography>
              
              <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Required Excel Columns:</Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li><strong>Name</strong>: Full name of the account holder</li>
                    <li><strong>Email</strong>: Valid email address</li>
                    <li><strong>Password</strong>: Initial password (optional)</li>
                    <li><strong>EventType</strong>: Either 'department' or 'organization'</li>
                    <li><strong>Department</strong>: Required if EventType is 'department'</li>
                  </ul>
                </Typography>
              </Box>

              {/* Example Format Section */}
              <Box sx={{ my: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Example Excel Format:</Typography>
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>EventType</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Password</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>CSE Events</TableCell>
                        <TableCell>cse.events@college.com</TableCell>
                        <TableCell>department</TableCell>
                        <TableCell>Computer Science and Engineering</TableCell>
                        <TableCell>cse123</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>College Fest</TableCell>
                        <TableCell>fest@college.com</TableCell>
                        <TableCell>organization</TableCell>
                        <TableCell></TableCell>
                        <TableCell>fest123</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Download Template Button */}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      // Create a sample Excel file
                      const ws = XLSX.utils.aoa_to_sheet([
                        ['Name', 'Email', 'EventType', 'Department', 'Password'],
                        ['CSE Events', 'cse.events@college.com', 'department', 'Computer Science and Engineering', 'cse123'],
                        ['College Fest', 'fest@college.com', 'organization', '', 'fest123']
                      ]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Template');
                      XLSX.writeFile(wb, 'event_quiz_accounts_template.xlsx');
                    }}
                  >
                    Download Template
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Upload Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <label htmlFor="excel-upload">
                <Button 
                  variant="contained" 
                  component="span"
                  disabled={uploadStatus === 'uploading'}
                >
                  Choose File
                </Button>
              </label>
              {uploadedFile && (
                <Typography variant="body2" color="textSecondary">
                  Selected: {uploadedFile.name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Progress and Status */}
          {uploadStatus && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {uploadStatus === 'reading' && 'Reading file...'}
                {uploadStatus === 'validating' && 'Validating data...'}
                {uploadStatus === 'ready' && 'Ready to upload'}
                {uploadStatus === 'uploading' && 'Uploading accounts...'}
                {uploadStatus === 'success' && 'Upload successful!'}
                {uploadStatus === 'error' && 'Upload failed'}
              </Typography>
            </Box>
          )}

          {/* Error Display */}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Upload Error:</Typography>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {uploadError}
              </pre>
            </Alert>
          )}

          {/* Preview Section */}
          {uploadPreview.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Preview ({uploadPreview.length} accounts)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Event Type</TableCell>
                      <TableCell>Department</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadPreview.map((account, index) => (
                      <TableRow key={index}>
                        <TableCell>{account.name}</TableCell>
                        <TableCell>{account.email}</TableCell>
                        <TableCell>{account.eventType}</TableCell>
                        <TableCell>{account.department || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenUploadDialog(false);
              setUploadedFile(null);
              setUploadPreview([]);
              setUploadProgress(0);
              setUploadStatus('');
              setUploadError('');
            }}
            disabled={uploadStatus === 'uploading'}
          >
            Cancel
          </Button>
          {uploadPreview.length > 0 && (
            <Button
              onClick={handleConfirmUpload}
              variant="contained"
              color="primary"
              disabled={uploadStatus === 'uploading' || uploadStatus === 'error'}
            >
              Upload {uploadPreview.length} Accounts
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventQuizAccounts; 