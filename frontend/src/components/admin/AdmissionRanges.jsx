import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Grid,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Tabs,
  Tab
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import FilterListIcon from '@mui/icons-material/FilterList';
import api from '../../config/axios';

const sections = ['A', 'B', 'C', 'D', 'E'];
const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const AdmissionRanges = () => {
  const [ranges, setRanges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [formData, setFormData] = useState({
    department: '',
    year: '',
    section: '',
    minRange: '',
    maxRange: ''
  });

  useEffect(() => {
    fetchRanges();
    fetchDepartments();
  }, []);

  const fetchRanges = async () => {
    try {
      const response = await api.get('/api/admin/admission-ranges');
      setRanges(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch admission ranges');
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

  const handleOpenDialog = (range = null) => {
    if (range) {
      setSelectedRange(range);
      setFormData({
        department: range.department,
        year: range.year,
        section: range.section,
        minRange: range.minRange,
        maxRange: range.maxRange
      });
    } else {
      setSelectedRange(null);
      setFormData({
        department: '',
        year: '',
        section: '',
        minRange: '',
        maxRange: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRange(null);
    setFormData({
      department: '',
      year: '',
      section: '',
      minRange: '',
      maxRange: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedRange) {
        await api.put(`/api/admin/admission-ranges/${selectedRange._id}`, formData);
      } else {
        await api.post('/api/admin/admission-ranges', formData);
      }
      fetchRanges();
      handleCloseDialog();
    } catch (error) {
      setError('Failed to save admission range');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this admission range?')) {
      try {
        await api.delete(`/api/admin/admission-ranges/${id}`);
        fetchRanges();
      } catch (error) {
        setError('Failed to delete admission range');
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Admission Ranges</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Range
          </Button>
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
                  <TableCell>Department</TableCell>
                  <TableCell>Year</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Min Range</TableCell>
                  <TableCell>Max Range</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ranges.map((range) => (
                  <TableRow key={range._id}>
                    <TableCell>{range.department}</TableCell>
                    <TableCell>{range.year}</TableCell>
                    <TableCell>{range.section}</TableCell>
                    <TableCell>{range.minRange}</TableCell>
                    <TableCell>{range.maxRange}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDialog(range)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(range._id)}>
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
          {selectedRange ? 'Edit Admission Range' : 'Add New Admission Range'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  label="Department"
                  required
                >
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
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
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
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
                  {sections.map((section) => (
                    <MenuItem key={section} value={section}>
                      Section {section}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min Range"
                type="number"
                value={formData.minRange}
                onChange={(e) => setFormData({ ...formData, minRange: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max Range"
                type="number"
                value={formData.maxRange}
                onChange={(e) => setFormData({ ...formData, maxRange: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedRange ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdmissionRanges; 