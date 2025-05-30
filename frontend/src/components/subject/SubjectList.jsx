import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Upload as UploadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    year: '',
    semester: '',
    section: ''
  });

  const years = [
    { value: 1, label: 'First Year' },
    { value: 2, label: 'Second Year' },
    { value: 3, label: 'Third Year' },
    { value: 4, label: 'Fourth Year' }
  ];

  const getSemestersByYear = (year) => {
    switch (parseInt(year)) {
      case 1: return [
        { value: 1, label: 'First Semester' },
        { value: 2, label: 'Second Semester' }
      ];
      case 2: return [
        { value: 3, label: 'Third Semester' },
        { value: 4, label: 'Fourth Semester' }
      ];
      case 3: return [
        { value: 5, label: 'Fifth Semester' },
        { value: 6, label: 'Sixth Semester' }
      ];
      case 4: return [
        { value: 7, label: 'Seventh Semester' },
        { value: 8, label: 'Eighth Semester' }
      ];
      default: return [];
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
    fetchSections();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, subjects]);

  const fetchSubjects = async () => {
    try {
      const response = await api.get('/api/subjects');
      setSubjects(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch subjects');
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

  const fetchSections = async () => {
    try {
      const response = await api.get('/api/settings/sections');
      if (response && Array.isArray(response.sections)) {
        setSections(response.sections);
      } else {
        console.error('Invalid sections data:', response);
        setSections([]);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...subjects];

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(subject => 
        subject.name.toLowerCase().includes(searchTerm) ||
        subject.code.toLowerCase().includes(searchTerm)
      );
    }

    // Apply department filter
    if (filters.department) {
      filtered = filtered.filter(subject => 
        subject.department === filters.department
      );
    }

    // Apply year filter
    if (filters.year) {
      filtered = filtered.filter(subject => 
        subject.year === parseInt(filters.year)
      );
    }

    // Apply semester filter
    if (filters.semester) {
      filtered = filtered.filter(subject => 
        subject.semester === parseInt(filters.semester)
      );
    }

    setSubjects(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      department: '',
      year: '',
      semester: '',
      section: ''
    });
  };

  const formatYearSemester = (year, semester) => {
    const yearNames = ['First', 'Second', 'Third', 'Fourth'];
    const semesterNames = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
    return `${yearNames[year-1]} Year - ${semesterNames[semester-1]} Semester`;
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/subjects/${id}`);
      fetchSubjects();
      setSubjectToDelete(null);
    } catch (error) {
      setError('Failed to delete subject');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate and transform the data
          const subjects = jsonData.map(row => ({
            code: row.Code || row.code,
            name: row.Name || row.name,
            department: row.Department || row.department,
            year: parseInt(row.Year || row.year),
            semester: parseInt(row.Semester || row.semester),
            credits: parseInt(row.Credits || row.credits),
            description: row.Description || row.description || ''
          }));

          // Validate each subject
          subjects.forEach(subject => {
            if (!subject.code || !subject.name || !subject.department || 
                !subject.year || !subject.semester || !subject.credits) {
              throw new Error('Missing required fields in Excel data');
            }
            if (!departments.some(d => d.name === subject.department)) {
              throw new Error(`Invalid department: ${subject.department}`);
            }
            if (subject.year < 1 || subject.year > 4) {
              throw new Error(`Invalid year: ${subject.year}`);
            }
            if (subject.semester < 1 || subject.semester > 8) {
              throw new Error(`Invalid semester: ${subject.semester}`);
            }
          });

          // Upload subjects
          await Promise.all(subjects.map(subject => 
            api.post('/api/subjects', subject)
          ));

          setOpenUploadDialog(false);
          fetchSubjects();
        } catch (error) {
          console.error('Error processing Excel file:', error);
          setUploadError(error.message || 'Failed to process Excel file');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setUploadError('Failed to read Excel file');
    }
  };

  const getFilteredSubjects = () => {
    return subjects.filter(subject => {
      const searchMatch = !filters.search || 
        subject.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        subject.code.toLowerCase().includes(filters.search.toLowerCase());
      const departmentMatch = !filters.department || subject.department === filters.department;
      const yearMatch = !filters.year || subject.year === parseInt(filters.year);
      const semesterMatch = !filters.semester || subject.semester === parseInt(filters.semester);
      return searchMatch && departmentMatch && yearMatch && semesterMatch;
    });
  };

  const getAvailableSections = (department, year, semester) => {
    if (!department || !year || !semester) return [];
    const matchingSection = sections.find(section => 
      section.department === department && 
      section.year.toString() === year.toString() &&
      section.semester.toString() === semester.toString()
    );
    return matchingSection ? matchingSection.sections : [];
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Subjects
        </Typography>
        {user.role === 'admin' && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setOpenUploadDialog(true)}
            >
              Upload Excel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/subjects/new')}
            >
              Add Subject
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon /> Filters
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name or code"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value, year: '', semester: '', section: '' })}
                label="Department"
              >
                <MenuItem value="">All</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept._id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Year</InputLabel>
              <Select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value, semester: '', section: '' })}
                label="Year"
                disabled={!filters.department}
              >
                <MenuItem value="">All</MenuItem>
                {[1, 2, 3, 4].map(year => (
                  <MenuItem key={year} value={year}>Year {year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Semester</InputLabel>
              <Select
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value, section: '' })}
                label="Semester"
                disabled={!filters.year}
              >
                <MenuItem value="">All</MenuItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Section</InputLabel>
              <Select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                label="Section"
                disabled={!filters.department || !filters.year || !filters.semester}
              >
                <MenuItem value="">All</MenuItem>
                {getAvailableSections(filters.department, filters.year, filters.semester).map(section => (
                  <MenuItem key={section} value={section}>
                    Section {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setFilters({ search: '', department: '', year: '', semester: '', section: '' })}
              disabled={!filters.search && !filters.department && !filters.year && !filters.semester && !filters.section}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Year & Semester</TableCell>
              <TableCell>Credits</TableCell>
              {user.role === 'admin' && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredSubjects().length === 0 ? (
              <TableRow>
                <TableCell colSpan={user.role === 'admin' ? 6 : 5} align="center">
                  No subjects found matching the filters
                </TableCell>
              </TableRow>
            ) : (
              getFilteredSubjects().map((subject) => (
                <TableRow key={subject._id}>
                  <TableCell>{subject.code}</TableCell>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.department}</TableCell>
                  <TableCell>{formatYearSemester(subject.year, subject.semester)}</TableCell>
                  <TableCell>{subject.credits}</TableCell>
                  {user.role === 'admin' && (
                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/subjects/${subject._id}/edit`)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => {
                          setSubjectToDelete(subject._id);
                          setOpenDeleteDialog(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" id="delete-dialog-description" gutterBottom>
            Are you sure you want to delete this subject?
          </Typography>
          {subjectToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Subject Details:
              </Typography>
              {subjects.filter(s => s._id === subjectToDelete).map(subject => (
                <Box key={subject._id}>
                  <Typography variant="body2">
                    Code: {subject.code}
                  </Typography>
                  <Typography variant="body2">
                    Name: {subject.name}
                  </Typography>
                  <Typography variant="body2">
                    Department: {subject.department}
                  </Typography>
                  <Typography variant="body2">
                    Year & Semester: {formatYearSemester(subject.year, subject.semester)}
                  </Typography>
                  <Typography variant="body2">
                    Credits: {subject.credits}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              handleDelete(subjectToDelete);
              setOpenDeleteDialog(false);
            }} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)}>
        <DialogTitle>Upload Subject Data</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Upload an Excel file containing subject information. Please ensure your file follows this format:
          </Typography>
          
          <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Required Excel Columns:</Typography>
            <Typography variant="body2" component="div">
              <ul>
                <li><strong>Code</strong>: Unique subject code (e.g., CS101)</li>
                <li><strong>Name</strong>: Subject name</li>
                <li><strong>Department</strong>: Must match an existing department name exactly</li>
                <li><strong>Year</strong>: Study year (1-4)</li>
                <li><strong>Semester</strong>: Semester number (1-8)</li>
                <li><strong>Credits</strong>: Number of credits</li>
                <li><strong>Description</strong>: Subject description (optional)</li>
              </ul>
            </Typography>
          </Box>

          <Box sx={{ my: 2, p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Example Row:</Typography>
            <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
              Code: CS101<br />
              Name: Introduction to Programming<br />
              Department: Computer Science and Engineering<br />
              Year: 1<br />
              Semester: 1<br />
              Credits: 4<br />
              Description: Basic programming concepts and algorithms
            </Typography>
          </Box>

          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {uploadError}
            </Alert>
          )}

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="excel-upload"
          />
          <label htmlFor="excel-upload">
            <Button variant="contained" component="span">
              Choose File
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenUploadDialog(false);
            setUploadError('');
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubjectList; 