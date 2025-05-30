import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Box,
  Tab,
  Tabs,
  Alert,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  Grid as MuiGrid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import * as XLSX from 'xlsx';

const CollegeSettings = () => {
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [openDeptDialog, setOpenDeptDialog] = useState(false);
  const [openSectionDialog, setOpenSectionDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [deptFormData, setDeptFormData] = useState({ 
    name: '', 
    code: '', 
    description: '',
    years: [
      {
        year: 1,
        semesters: 2
      }
    ]
  });
  const [sectionFormData, setSectionFormData] = useState({
    names: [],
    department: '',
    year: 1,
    semester: 1
  });
  const [uploadMode, setUploadMode] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [openSubjectDialog, setOpenSubjectDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectFormData, setSubjectFormData] = useState({
    code: '',
    name: '',
    department: '',
    year: '',
    semester: '',
    credits: '',
    description: ''
  });
  const [semesterSubjects, setSemesterSubjects] = useState([]);
  
  // New state for dialogs
  const [errorDialog, setErrorDialog] = useState({ open: false, message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  const [academicDetails, setAcademicDetails] = useState([]);
  const [deptExcelFile, setDeptExcelFile] = useState(null);
  const [uploadDeptError, setUploadDeptError] = useState('');
  const [uploadDeptSuccess, setUploadDeptSuccess] = useState('');
  
  const [openYearSemDialog, setOpenYearSemDialog] = useState(false);
  const [yearSemFormData, setYearSemFormData] = useState({
    year: 1,
    semesters: [1, 2]
  });
  
  const [openUploadDialog, setOpenUploadDialog] = useState(false);

  useEffect(() => {
    fetchAcademicDetails();
  }, []);

  const fetchAcademicDetails = async () => {
    try {
      const response = await api.get('/api/academic-details');
      console.log('Raw API response:', response);
      console.log('Response type:', typeof response);

      // The data is directly in the response object
      let academicData = Array.isArray(response) ? response : [];
      console.log('Processed academic details:', academicData);
      
      // Set the academic details state
      setAcademicDetails(academicData);
      
      // Extract unique departments
      const uniqueDepartments = [...new Set(
        academicData
          .filter(detail => detail && detail.department)
          .map(detail => detail.department)
      )];
      console.log('Unique departments:', uniqueDepartments);
      
      // Set departments state with proper object structure
      const departmentObjects = uniqueDepartments.map(deptName => ({
        name: deptName,
        _id: academicData.find(detail => detail.department === deptName)?._id
      }));
      console.log('Department objects:', departmentObjects);
      setDepartments(departmentObjects);

      // Group sections by department, year, semester
      const groupedSections = {};
      academicData.forEach(detail => {
        if (detail && detail.department && detail.year && detail.semester) {
          const key = `${detail.department}-${detail.year}-${detail.semester}`;
          if (!groupedSections[key]) {
            groupedSections[key] = {
              _id: detail._id,
              department: detail.department,
              year: detail.year,
              semester: detail.semester,
              sections: detail.sections ? detail.sections.split(',').map(s => s.trim()).filter(Boolean) : []
            };
          }
        }
      });
      console.log('Grouped sections:', groupedSections);
      setSections(Object.values(groupedSections));

      // Process subjects
      const allSubjects = [];
      academicData.forEach(detail => {
        if (detail && detail.subjects) {
          const subjectsArray = detail.subjects.trim() 
            ? detail.subjects.split(',').filter(s => s.trim())
            : [];
          
          subjectsArray.forEach(subject => {
            const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
            if (match) {
              allSubjects.push({
                _id: detail._id,
                name: match[1].trim(),
                code: match[2],
                department: detail.department,
                year: detail.year || 1,
                semester: detail.semester || 1,
                credits: detail.credits || 3
              });
            }
          });
        }
      });
      console.log('Extracted subjects:', allSubjects);
      setSubjects(allSubjects);
      
    } catch (error) {
      console.error('Error fetching academic details:', error);
      const errorMessage = error.response?.message || 
                         error.message || 
                         'Failed to fetch academic details';
      setErrorDialog({
        open: true,
        message: errorMessage
      });
      // Reset all state on error
      setAcademicDetails([]);
      setDepartments([]);
      setSections([]);
      setSubjects([]);
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!deptFormData.name || !deptFormData.code) {
        showError('Department name and code are required');
        return;
      }

      if (selectedDept) {
        await api.put(`/api/admin/settings/departments/${selectedDept._id}`, deptFormData);
      } else {
        await api.post('/api/admin/settings/departments', deptFormData);
      }

      await fetchDepartments();
      setOpenDeptDialog(false);
      setDeptFormData({ name: '', code: '', description: '' });
      setSelectedDept(null);
    } catch (error) {
      console.error('Error saving department:', error);
      showError(error.response?.data?.message || 'Error saving department');
    }
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!sectionFormData.department || !sectionFormData.year || !sectionFormData.semester) {
        showError('Please fill in all required fields');
        return;
      }

      // Find existing academic detail
      const existingDetail = academicDetails.find(detail => 
        detail.department === sectionFormData.department &&
        detail.year === Number(sectionFormData.year) &&
        detail.semester === Number(sectionFormData.semester)
      );

      const payload = {
        department: sectionFormData.department,
        year: Number(sectionFormData.year),
        semester: Number(sectionFormData.semester),
        sections: sectionFormData.names.join(','),
        subjects: existingDetail?.subjects || '',
        credits: existingDetail?.credits || 3
      };

      let response;
      if (existingDetail) {
        // Update existing academic detail
        response = await api.put(`/api/academic-details/${existingDetail._id}`, payload);
        console.log('Section update response:', response);
      } else {
        // Create new academic detail
        response = await api.post('/api/academic-details', payload);
        console.log('Section creation response:', response);
      }

      // Refresh the data
      await fetchAcademicDetails();
      
      // Close dialog and reset form
      setOpenSectionDialog(false);
      setSectionFormData({
        names: [],
        department: '',
        year: 1,
        semester: 1
      });
      setSelectedSection(null);
      
    } catch (error) {
      console.error('Error saving sections:', error);
      showError(error.response?.data?.message || 'Error saving sections');
    }
  };

  const handleSubjectSubmit = async () => {
    try {
      if (!subjectFormData.name || !subjectFormData.code) {
        showError('Please fill in all required subject fields');
        return;
      }

      const newSubject = `${subjectFormData.name.trim()}(${subjectFormData.code.trim()})`;
      
      // Find existing academic detail
      const existingDetail = academicDetails.find(detail => 
        detail.department === subjectFormData.department &&
        detail.year === Number(subjectFormData.year) &&
        detail.semester === Number(subjectFormData.semester)
      );

      if (!existingDetail) {
        showError('Please select a valid department, year, and semester first');
        return;
      }

      // Check if subject code already exists in any academic detail
      const subjectCodeExists = academicDetails.some(detail => {
        if (!detail.subjects) return false;
        return detail.subjects.split(',')
          .some(subject => {
            const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
            if (!match) return false;
            return match[2] === subjectFormData.code && 
                   (!selectedSubject || subject.trim() !== selectedSubject);
          });
      });

      if (subjectCodeExists) {
        showError(`Subject code ${subjectFormData.code} already exists. Please use a unique code.`);
        return;
      }

      // Get current subjects and add the new one
      const currentSubjects = existingDetail.subjects ? 
        existingDetail.subjects.split(',').filter(s => s.trim()) : 
        [];

      let updatedSubjects;
      if (selectedSubject) {
        // Update existing subject
        updatedSubjects = currentSubjects.map(s => 
          s.trim() === selectedSubject ? newSubject : s
        );
      } else {
        // Add new subject
        updatedSubjects = [...currentSubjects, newSubject];
      }

      // Update the academic detail
      const response = await api.put(`/api/academic-details/${existingDetail._id}`, {
        ...existingDetail,
        subjects: updatedSubjects.join(','),
        credits: subjectFormData.credits || existingDetail.credits || 3
      });

      if (response) {
        await fetchAcademicDetails();
        setOpenSubjectDialog(false);
        setSubjectFormData({
          name: '',
          code: '',
          department: '',
          year: '',
          semester: '',
          credits: '',
          description: ''
        });
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      showError(error.response?.data?.message || 'Error saving subject');
    }
  };

  const handleDeleteDepartment = async (id) => {
    showConfirmation(
      'Are you sure you want to delete this department? This will also delete all associated academic details.',
      async () => {
        try {
          await api.delete(`/api/admin/settings/departments/${id}`);
          await fetchDepartments();
          await fetchAcademicDetails();
        } catch (error) {
          console.error('Error deleting department:', error);
          showError('Error deleting department');
        }
      }
    );
  };

  const handleDeleteSection = async (detail, sectionIndex) => {
    try {
      if (!detail || !detail._id) {
        showError('Invalid academic detail');
        return;
      }

      const sections = detail.sections.split(',').map(s => s.trim());
      sections.splice(sectionIndex, 1);
      const updatedSections = sections.join(',');

      const response = await api.put(`/api/academic-details/${detail._id}`, {
        ...detail,
        sections: updatedSections
      });

      if (response) {
        await fetchAcademicDetails();
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      showError(error.response?.data?.message || 'Error deleting section');
    }
  };

  const handleDeleteSubject = async (detail, subjectIndex) => {
    try {
      if (!detail || !detail._id) {
        showError('Invalid academic detail');
        return;
      }

      const subjects = detail.subjects.split(',').map(s => s.trim());
      subjects.splice(subjectIndex, 1);
      const updatedSubjects = subjects.join(',');

      const response = await api.put(`/api/academic-details/${detail._id}`, {
        ...detail,
        subjects: updatedSubjects
      });

      if (response) {
        await fetchAcademicDetails();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      showError(error.response?.data?.message || 'Error deleting subject');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setUploadError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setExcelFile(file);
      setUploadError('');
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Department', 'Year', 'Semester', 'Sections', 'Subjects', 'Credits'],
      ['Computer Science', '1', '1', 'A,B,C', 'Programming Fundamentals(CS101),Digital Logic(CS102)', '4'],
      ['Computer Science', '1', '2', 'A,B,C', 'Data Structures(CS201),OOP(CS202)', '3'],
      ['Electronics', '2', '3', 'A,B', 'Circuit Theory(EC201),Electronic Devices(EC202)', '4']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Academic Details Template');
    XLSX.writeFile(wb, 'academic_details_template.xlsx');
  };

  const handleExcelUpload = async () => {
    try {
      if (!excelFile) {
        setUploadError('Please select a file first');
        return;
      }

      const formData = new FormData();
      formData.append('file', excelFile);

      const response = await api.post('/api/settings/upload-academic-details', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadSuccess('Academic details uploaded successfully');
      fetchSections();
      fetchSubjects();
      setExcelFile(null);
      setOpenSectionDialog(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error.response?.data?.message || 'Error uploading file. Please try again.');
    }
  };

  const handleUploadExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/api/academic-details/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Refresh the data
      fetchAcademicDetails();
      setUploadSuccess('Academic details uploaded successfully');
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Error uploading academic details');
    }
  };

  const handleDeleteAcademicDetail = async (id) => {
    try {
      showConfirmation(
        'Are you sure you want to delete this academic detail? This action cannot be undone.',
        async () => {
          const response = await api.delete(`/api/academic-details/${id}`);
          if (response) {
            await fetchAcademicDetails();
          }
        }
      );
    } catch (error) {
      console.error('Error deleting academic detail:', error);
      showError(error.response?.data?.message || 'Error deleting academic detail');
    }
  };

  // Function to show error dialog
  const showError = (message) => {
    setErrorDialog({ open: true, message });
  };

  // Function to show confirmation dialog
  const showConfirmation = (message, onConfirm) => {
    setConfirmDialog({ open: true, message, onConfirm });
  };

  const getAvailableSemesters = (department, year) => {
    if (!department || !year) return [];
    
    // Get all semesters configured for this department and year
    const semesters = academicDetails
      .filter(detail => detail.department === department && detail.year === Number(year))
      .map(detail => detail.semester)
      .sort((a, b) => a - b);
    
    return semesters;
  };

  // Function to download department template
  const downloadDeptTemplate = () => {
    const template = [
      ['Department Name', 'Department Code', 'Description'],
      ['Computer Science and Engineering', 'CSE', 'Description for CSE'],
      ['Electronics and Communication Engineering', 'ECE', 'Description for ECE']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments Template');
    XLSX.writeFile(wb, 'departments_template.xlsx');
  };

  // Function to handle department file upload
  const handleDeptFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setUploadDeptError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setDeptExcelFile(file);
      setUploadDeptError('');
    }
  };

  // Function to handle department excel upload
  const handleDeptExcelUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', deptExcelFile);

      const response = await api.post('/api/admin/settings/departments/upload', formData);
      
      if (response.success > 0) {
        setUploadDeptSuccess(`Successfully uploaded ${response.success} departments`);
        fetchDepartments();
      }
      
      if (response.errors?.length > 0) {
        setUploadDeptError(response.errors.join('\n'));
      }

      setTimeout(() => {
        setOpenUploadDialog(false);
        setDeptExcelFile(null);
        setUploadDeptError('');
        setUploadDeptSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error uploading departments:', error);
      setUploadDeptError(error.response?.data?.message || 'Error uploading departments');
    }
  };

  const handleYearSemSubmit = async () => {
    try {
      if (!yearSemFormData.year || yearSemFormData.semesters.length === 0) {
        showError('Please fill in all required fields');
        return;
      }

      const response = await api.post('/api/admin/academic-details/years-semesters', yearSemFormData);
      if (response) {
        await fetchAcademicDetails();
        setOpenYearSemDialog(false);
        setYearSemFormData({
          year: 1,
          semesters: [1, 2]
        });
        setSelectedDept(null);
      }
    } catch (error) {
      console.error('Error saving year/semester configuration:', error);
      showError(error.response?.data?.message || 'Error saving year/semester configuration');
    }
  };

  const handleDeleteYearConfig = async (department, year) => {
    showConfirmation(
      `Are you sure you want to delete the configuration for ${department} in Year ${year}? This action cannot be undone.`,
      async () => {
        try {
          const response = await api.delete(`/api/admin/academic-details/years-semesters/${department}/${year}`);
          if (response) {
            await fetchAcademicDetails();
          }
        } catch (error) {
          console.error('Error deleting year/semester configuration:', error);
          showError('Error deleting year/semester configuration');
        }
      }
    );
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/admin/settings/departments');
      if (response && response.departments) {
        setDepartments(response.departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      showError('Error fetching departments');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Top Row with Years/Semesters and Departments */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Years and Semesters Configuration</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedDept(null);
                  setYearSemFormData({
                    year: 1,
                    semesters: [1, 2]
                  });
                  setOpenYearSemDialog(true);
                }}
              >
                Add Year Configuration
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                    <TableCell><strong>Semesters</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((dept) => {
                    const yearConfigs = academicDetails
                      .filter(detail => detail.department === dept.name)
                      .reduce((acc, detail) => {
                        const year = detail.year;
                        if (!acc[year]) {
                          acc[year] = new Set();
                        }
                        acc[year].add(detail.semester);
                        return acc;
                      }, {});

                    return Object.entries(yearConfigs).map(([year, semesters]) => (
                      <TableRow key={`${dept.name}-${year}`}>
                        <TableCell>{dept.name}</TableCell>
                        <TableCell>Year {year}</TableCell>
                        <TableCell>
                          {Array.from(semesters).sort((a, b) => a - b).map((sem) => (
                            <Chip
                              key={sem}
                              label={`Semester ${sem}`}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          ))}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedDept(dept);
                                setDeptFormData({
                                  name: dept.name,
                                  code: dept.code,
                                  description: dept.description,
                                  year: Number(year),
                                  semesters: Array.from(semesters)
                                });
                                setOpenYearSemDialog(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleDeleteYearConfig(dept.name, Number(year))}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Departments */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Departments</Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setOpenUploadDialog(true)}
                  sx={{ mr: 1 }}
                >
                  Upload Excel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedDept(null);
                    setDeptFormData({ name: '', code: '', description: '' });
                    setOpenDeptDialog(true);
                  }}
                >
                  Add Department
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept._id}>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>{dept.code}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedDept(dept);
                              setDeptFormData({
                                name: dept.name,
                                code: dept.code,
                                description: dept.description
                              });
                              setOpenDeptDialog(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteDepartment(dept._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Academic Details */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Academic Details</Typography>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => {
                    setUploadMode(true);
                    setOpenSectionDialog(true);
                  }}
                >
                  Upload Excel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedSection(null);
                    setSectionFormData({
                      names: [],
                      department: '',
                      year: 1,
                      semester: 1
                    });
                    setSubjectFormData({
                      code: '',
                      name: '',
                      department: '',
                      year: '',
                      semester: '',
                      credits: ''
                    });
                    setUploadMode(false);
                    setOpenSectionDialog(true);
                  }}
                >
                  Add Academic Details
                </Button>
              </Box>
            </Box>

            {/* Filters */}
            <Stack direction="row" spacing={2} mb={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Department</InputLabel>
                <Select
                  value={filterDepartment || ''}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Filter by Department"
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Filter by Year</InputLabel>
                <Select
                  value={filterYear || ''}
                  onChange={(e) => setFilterYear(e.target.value)}
                  label="Filter by Year"
                >
                  <MenuItem value="">All Years</MenuItem>
                  {Array.from(new Set(academicDetails.map(detail => detail.year))).sort((a, b) => a - b).map((year) => (
                    <MenuItem key={year} value={year}>
                      Year {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Filter by Semester</InputLabel>
                <Select
                  value={filterSemester || ''}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  label="Filter by Semester"
                >
                  <MenuItem value="">All Semesters</MenuItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <MenuItem key={sem} value={sem}>
                      Semester {sem}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Academic Details Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Department</strong></TableCell>
                    <TableCell><strong>Year</strong></TableCell>
                    <TableCell><strong>Semester</strong></TableCell>
                    <TableCell><strong>Subjects</strong></TableCell>
                    <TableCell><strong>Sections</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {academicDetails.length > 0 ? (
                    academicDetails
                      .filter(detail => {
                        if (!detail) return false;
                        if (filterDepartment && detail.department !== filterDepartment) return false;
                        if (filterYear && detail.year !== Number(filterYear)) return false;
                        if (filterSemester && detail.semester !== Number(filterSemester)) return false;
                        return true;
                      })
                      .map((detail) => (
                        <TableRow key={detail._id}>
                          <TableCell>{detail.department}</TableCell>
                          <TableCell>Year {detail.year}</TableCell>
                          <TableCell>Semester {detail.semester}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {detail.subjects?.split(',')
                                .filter(subject => subject.trim())
                                .map((subject, idx) => {
                                  const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
                                  if (!match) return null;
                                  
                                  return (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip
                                        label={`${match[1].trim()} (${match[2]})`}
                                        size="small"
                                        variant="outlined"
                                        onDelete={() => handleDeleteSubject(detail, idx)}
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setSelectedSection(detail);
                                          setSectionFormData({
                                            names: detail.sections ? detail.sections.split(',').map(s => s.trim()) : [],
                                            department: detail.department,
                                            year: detail.year,
                                            semester: detail.semester
                                          });
                                          setSubjectFormData({
                                            name: match[1].trim(),
                                            code: match[2],
                                            department: detail.department,
                                            year: detail.year,
                                            semester: detail.semester,
                                            credits: detail.credits || 3
                                          });
                                          setSelectedSubject(subject.trim());
                                          setOpenSectionDialog(true);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  );
                                })}
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  icon={<AddIcon />}
                                  label="Add Subject"
                                  color="primary"
                                  variant="outlined"
                                  onClick={() => {
                                    setSelectedSection(detail);
                                    setSectionFormData({
                                      names: detail.sections ? detail.sections.split(',').map(s => s.trim()) : [],
                                      department: detail.department,
                                      year: detail.year,
                                      semester: detail.semester
                                    });
                                    setSubjectFormData({
                                      name: '',
                                      code: '',
                                      department: detail.department,
                                      year: detail.year,
                                      semester: detail.semester,
                                      credits: detail.credits || 3
                                    });
                                    setSelectedSubject(null);
                                    setOpenSectionDialog(true);
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {detail.sections?.split(',').map((section, idx) => (
                                  section.trim() && (
                                    <Chip
                                      key={idx}
                                      label={section.trim()}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      onDelete={() => handleDeleteSection(detail, idx)}
                                    />
                                  )
                                ))}
                              </Box>
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  icon={<AddIcon />}
                                  label="Add Section"
                                  color="primary"
                                  variant="outlined"
                                  onClick={() => {
                                    setSelectedSection(detail);
                                    setSectionFormData({
                                      names: detail.sections ? detail.sections.split(',').map(s => s.trim()) : [],
                                      department: detail.department,
                                      year: detail.year,
                                      semester: detail.semester
                                    });
                                    setUploadMode(false);
                                    setOpenSectionDialog(true);
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedSection(detail);
                                  setSectionFormData({
                                    names: detail.sections ? detail.sections.split(',').map(s => s.trim()) : [],
                                    department: detail.department,
                                    year: detail.year,
                                    semester: detail.semester
                                  });
                                  setUploadMode(false);
                                  setOpenSectionDialog(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDeleteAcademicDetail(detail._id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No academic details found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Year/Semester Configuration Dialog */}
        <Dialog
          open={openYearSemDialog}
          onClose={() => setOpenYearSemDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedDept ? 'Edit Year Configuration' : 'Add Year Configuration'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth margin="normal">
                <TextField
                  fullWidth
                  type="number"
                  label="Year"
                  value={yearSemFormData.year}
                  onChange={(e) => setYearSemFormData({
                    ...yearSemFormData,
                    year: parseInt(e.target.value) || ''
                  })}
                  inputProps={{ min: 1 }}
                  required
                />
              </FormControl>

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Semesters
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <Chip
                    key={sem}
                    label={`Semester ${sem}`}
                    color={yearSemFormData.semesters.includes(sem) ? "primary" : "default"}
                    onClick={() => {
                      const newSemesters = yearSemFormData.semesters.includes(sem)
                        ? yearSemFormData.semesters.filter(s => s !== sem)
                        : [...yearSemFormData.semesters, sem].sort();
                      setYearSemFormData({
                        ...yearSemFormData,
                        semesters: newSemesters
                      });
                    }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenYearSemDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleYearSemSubmit}
              disabled={!yearSemFormData.year || yearSemFormData.semesters.length === 0}
            >
              {selectedDept ? 'Update' : 'Add'} Configuration
            </Button>
          </DialogActions>
        </Dialog>

        {/* Department Upload Dialog */}
        <Dialog
          open={openUploadDialog}
          onClose={() => setOpenUploadDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Upload Departments</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Upload an Excel file with the following columns:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                <ul>
                  <li>Department Name (required)</li>
                  <li>Department Code (required)</li>
                  <li>Description (optional)</li>
                </ul>
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Choose Excel File
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={(e) => setDeptExcelFile(e.target.files[0])}
                />
              </Button>
              {deptExcelFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {deptExcelFile.name}
                </Typography>
              )}
              {uploadDeptError && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {uploadDeptError}
                </Typography>
              )}
              {uploadDeptSuccess && (
                <Typography color="success.main" variant="body2" sx={{ mt: 1 }}>
                  {uploadDeptSuccess}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenUploadDialog(false);
              setDeptExcelFile(null);
              setUploadDeptError('');
              setUploadDeptSuccess('');
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleDeptExcelUpload}
              disabled={!deptExcelFile}
            >
              Upload
            </Button>
          </DialogActions>
        </Dialog>

        {/* Department Form Dialog */}
        <Dialog
          open={openDeptDialog}
          onClose={() => setOpenDeptDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedDept ? 'Edit Department' : 'Add Department'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Department Name"
                value={deptFormData.name}
                onChange={(e) => setDeptFormData({
                  ...deptFormData,
                  name: e.target.value
                })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Department Code"
                value={deptFormData.code}
                onChange={(e) => setDeptFormData({
                  ...deptFormData,
                  code: e.target.value
                })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                value={deptFormData.description}
                onChange={(e) => setDeptFormData({
                  ...deptFormData,
                  description: e.target.value
                })}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeptDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleDeptSubmit}
              disabled={!deptFormData.name || !deptFormData.code}
            >
              {selectedDept ? 'Update' : 'Add'} Department
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Academic Details Dialog */}
        <Dialog 
          open={openSectionDialog} 
          onClose={() => {
            setOpenSectionDialog(false);
            setUploadMode(false);
            setExcelFile(null);
            setUploadError('');
            setUploadSuccess('');
            setSectionFormData({
              names: [],
              department: '',
              year: 1,
              semester: 1
            });
            setSubjectFormData({
              code: '',
              name: '',
              department: '',
              year: '',
              semester: '',
              credits: '',
              description: ''
            });
            setSelectedSection(null);
            setSelectedSubject(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {uploadMode ? 'Upload Academic Details' : selectedSection ? 'Edit Academic Details' : 'Add Academic Details'}
          </DialogTitle>
          <DialogContent>
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {uploadError}
              </Alert>
            )}
            {uploadSuccess && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                {uploadSuccess}
              </Alert>
            )}

            {uploadMode ? (
              // Upload mode content
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Excel File with Academic Details
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Department</strong></TableCell>
                        <TableCell><strong>Year</strong></TableCell>
                        <TableCell><strong>Semester</strong></TableCell>
                        <TableCell><strong>Sections</strong></TableCell>
                        <TableCell><strong>Subjects</strong></TableCell>
                        <TableCell><strong>Credits</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Computer Science</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell>A,B,C</TableCell>
                        <TableCell>Programming Fundamentals(CS101),Digital Logic(CS102)</TableCell>
                        <TableCell>4</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                  <strong>Note:</strong> For subjects, use the format: subject_name(subject_code),next_subject_name(next_subject_code)
                  <br />
                  Example: Programming Fundamentals(CS101),Digital Logic(CS102)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadTemplate}
                  >
                    Download Template
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<UploadIcon />}
                    >
                      Choose File
                    </Button>
                  </label>
                </Box>
                {excelFile && (
                  <Typography variant="body2" color="text.secondary">
                    Selected file: {excelFile.name}
                  </Typography>
                )}
              </Box>
            ) : (
              // Add/Edit mode content
              <Box sx={{ mt: 2 }}>
                {/* Department Selection */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={sectionFormData.department}
                    onChange={(e) => {
                      setSectionFormData({
                        ...sectionFormData,
                        department: e.target.value,
                        year: '',
                        semester: '',
                        names: []
                      });
                      setSubjectFormData({
                        ...subjectFormData,
                        department: e.target.value,
                        year: '',
                        semester: ''
                      });
                    }}
                    label="Department"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.name} value={dept.name}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Year Selection */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={sectionFormData.year}
                    onChange={(e) => {
                      setSectionFormData({
                        ...sectionFormData,
                        year: Number(e.target.value),
                        semester: '',
                        names: []
                      });
                      setSubjectFormData({
                        ...subjectFormData,
                        year: Number(e.target.value),
                        semester: ''
                      });
                    }}
                    label="Year"
                    disabled={!sectionFormData.department}
                  >
                    {[1, 2, 3, 4].map((year) => (
                      <MenuItem key={year} value={year}>
                        Year {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Semester Selection */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={sectionFormData.semester}
                    onChange={(e) => {
                      setSectionFormData({
                        ...sectionFormData,
                        semester: Number(e.target.value),
                        names: []
                      });
                      setSubjectFormData({
                        ...subjectFormData,
                        semester: Number(e.target.value)
                      });
                    }}
                    label="Semester"
                    disabled={!sectionFormData.year}
                  >
                    {getAvailableSemesters(sectionFormData.department, sectionFormData.year)
                      .map((sem) => (
                        <MenuItem key={sem} value={sem}>
                          Semester {sem}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {/* Section Input */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sections
                  </Typography>
                  <TextField
                    fullWidth
                    label="Enter Sections (comma-separated)"
                    value={sectionInput}
                    onChange={(e) => {
                      const input = e.target.value.toUpperCase();
                      setSectionInput(input);
                      
                      // Convert input to array of sections
                      const sections = input
                        .split(/[,\s]+/) // Split by comma or whitespace
                        .map(s => s.trim())
                        .filter(s => s && /^[A-Z]$/.test(s)); // Only keep valid sections
                      
                      setSectionFormData({
                        ...sectionFormData,
                        names: sections
                      });
                    }}
                    helperText="Enter sections as single uppercase letters separated by commas (e.g., A, B, C)"
                    disabled={!sectionFormData.department || !sectionFormData.year || !sectionFormData.semester}
                  />
                  {sectionFormData.names.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {sectionFormData.names.map((section, index) => (
                        <Chip
                          key={index}
                          label={section}
                          onDelete={() => {
                            const updatedNames = sectionFormData.names.filter((_, i) => i !== index);
                            setSectionFormData({
                              ...sectionFormData,
                              names: updatedNames
                            });
                            setSectionInput(updatedNames.join(', '));
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>

                {/* Subject Input */}
                {sectionFormData.department && sectionFormData.year && sectionFormData.semester && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Subject Details
                    </Typography>
                    <MuiGrid container spacing={2}>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Subject Name"
                          value={subjectFormData.name}
                          onChange={(e) => setSubjectFormData({
                            ...subjectFormData,
                            name: e.target.value
                          })}
                          required
                          error={!subjectFormData.name}
                          helperText={!subjectFormData.name ? 'Subject name is required' : ''}
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Subject Code"
                          value={subjectFormData.code}
                          onChange={(e) => {
                            const code = e.target.value.toUpperCase();
                            if (/^[A-Z]{0,2}\d{0,3}$/.test(code)) {
                              setSubjectFormData({
                                ...subjectFormData,
                                code: code
                              });
                            }
                          }}
                          required
                          error={!subjectFormData.code}
                          helperText={!subjectFormData.code ? 'Subject code is required (Format: XX999)' : 'Format: XX999 (e.g., CS101)'}
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Credits"
                          type="number"
                          value={subjectFormData.credits}
                          onChange={(e) => setSubjectFormData({
                            ...subjectFormData,
                            credits: e.target.value
                          })}
                          inputProps={{ min: 1, max: 6 }}
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Department"
                          value={subjectFormData.department}
                          disabled
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Year"
                          value={`Year ${subjectFormData.year}`}
                          disabled
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Semester"
                          value={`Semester ${subjectFormData.semester}`}
                          disabled
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSubjectSubmit}
                          disabled={!subjectFormData.name || !subjectFormData.code}
                        >
                          {selectedSubject ? 'Update Subject' : 'Add Subject'}
                        </Button>
                      </MuiGrid>
                    </MuiGrid>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenSectionDialog(false);
              setUploadMode(false);
              setExcelFile(null);
              setUploadError('');
              setUploadSuccess('');
              setSectionFormData({
                names: [],
                department: '',
                year: 1,
                semester: 1
              });
              setSubjectFormData({
                code: '',
                name: '',
                department: '',
                year: '',
                semester: '',
                credits: '',
                description: ''
              });
              setSelectedSection(null);
              setSelectedSubject(null);
            }}>
              Cancel
            </Button>
            {uploadMode ? (
              <Button
                variant="contained"
                onClick={handleExcelUpload}
                disabled={!excelFile}
              >
                Upload
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSectionSubmit}
                disabled={!sectionFormData.department || !sectionFormData.year || !sectionFormData.semester || sectionFormData.names.length === 0}
              >
                {selectedSection ? 'Update' : 'Add'} Academic Details
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Subject Dialog */}
        <Dialog
          open={openSubjectDialog}
          onClose={() => {
            setOpenSubjectDialog(false);
            setSubjectFormData({
              code: '',
              name: '',
              department: '',
              year: '',
              semester: '',
              credits: '',
              description: ''
            });
            setSelectedSubject(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{selectedSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Subject Name"
                value={subjectFormData.name}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                margin="dense"
                required
              />
              <TextField
                fullWidth
                label="Subject Code"
                value={subjectFormData.code}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value })}
                margin="dense"
                required
                helperText="Format: XX111 (Dept code + Year + Semester + Sequence)"
              />
              <TextField
                fullWidth
                label="Credits"
                type="number"
                value={subjectFormData.credits}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, credits: e.target.value })}
                margin="dense"
                required
                inputProps={{ min: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenSubjectDialog(false);
              setSubjectFormData({
                code: '',
                name: '',
                department: '',
                year: '',
                semester: '',
                credits: '',
                description: ''
              });
              setSelectedSubject(null);
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  if (selectedSubject) {
                    await api.put(`/api/subject/${selectedSubject._id}`, subjectFormData);
                  } else {
                    await api.post('/api/subject', subjectFormData);
                  }
                  fetchSubjects();
                  setOpenSubjectDialog(false);
                  setSubjectFormData({
                    code: '',
                    name: '',
                    department: '',
                    year: '',
                    semester: '',
                    credits: '',
                    description: ''
                  });
                  setSelectedSubject(null);
                } catch (error) {
                  setErrorDialog({
                    open: true,
                    message: error.response?.data?.message || 'Failed to save subject'
                  });
                }
              }}
              disabled={!subjectFormData.name || !subjectFormData.code || !subjectFormData.credits}
            >
              {selectedSubject ? 'Update' : 'Save'} Subject
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Dialog */}
        <Dialog
          open={errorDialog.open}
          onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        >
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <Typography>{errorDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setErrorDialog({ ...errorDialog, open: false })} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        >
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <Typography>{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="primary">
              Cancel
            </Button>
            <Button
              onClick={() => {
                confirmDialog.onConfirm?.();
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Grid>
    </Container>
  );
};

export default CollegeSettings; 