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
  Grid,
  Chip,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  CalendarMonth as CalendarIcon,
  Class as ClassIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../config/axios';

const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const FacultyAccounts = () => {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [filters, setFilters] = useState({
    department: '',
    email: '',
    name: '',
    year: '',
    semester: '',
    section: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    departments: [],
    years: [],
    semesters: [],
    sections: [],
    password: '',
    facultyList: [],
    assignments: []
  });
  const [dialogError, setDialogError] = useState('');
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [facultyInput, setFacultyInput] = useState('');
  const [currentSelections, setCurrentSelections] = useState({
    department: '',
    year: '',
    semester: '',
  });
  const [sectionInput, setSectionInput] = useState('');
  const [sectionsByKey, setSectionsByKey] = useState({});
  const [sectionInputs, setSectionInputs] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [assignedSections, setAssignedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [academicDetails, setAcademicDetails] = useState([]);
  const [years, setYears] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  const getKey = (dept, year, sem) => `${dept}-${year}-${sem}`;

  const handleSectionInput = (dept, year, sem, value) => {
    const key = getKey(dept, year, sem);
    setSectionInputs(prev => ({
      ...prev,
      [key]: value
    }));

    if (value.trim()) {
      const sections = value
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);

      setSectionsByKey(prev => ({
        ...prev,
        [key]: sections
      }));

      const allSections = Object.values(sectionsByKey).flat();
      setFormData(prev => ({
        ...prev,
        sections: allSections,
        departments: [...new Set([...prev.departments, dept])],
        years: [...new Set([...prev.years, year])],
        semesters: [...new Set([...prev.semesters, sem])]
      }));
    }
  };

  const removeSection = (dept, year, sem, sectionToRemove) => {
    const key = getKey(dept, year, sem);
    const updatedSections = sectionsByKey[key].filter(s => s !== sectionToRemove);
    
    setSectionsByKey(prev => ({
      ...prev,
      [key]: updatedSections
    }));

    setSectionInputs(prev => ({
      ...prev,
      [key]: updatedSections.join(', ')
    }));

    const allSections = Object.values({
      ...sectionsByKey,
      [key]: updatedSections
    }).flat();

    setFormData(prev => ({
      ...prev,
      sections: allSections
    }));
  };

  const fetchAcademicDetails = async () => {
    try {
      const response = await api.get('/api/academic-details');
      console.log('Academic details response:', response);
      
      if (response && Array.isArray(response)) {
        setAcademicDetails(response);
        
        // Extract unique departments
        const uniqueDepartments = [...new Set(response.map(detail => detail.department))];
        setDepartments(uniqueDepartments);
      } else {
        console.error('Invalid academic details data:', response);
        setAcademicDetails([]);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching academic details:', error);
      setError('Failed to fetch academic details');
      setAcademicDetails([]);
      setDepartments([]);
    }
  };

  // Update available years when department changes
  useEffect(() => {
    if (selectedDepartment) {
      const departmentYears = [...new Set(
        academicDetails
          .filter(detail => detail.department === selectedDepartment)
          .map(detail => detail.year)
      )].sort((a, b) => a - b);
      
      console.log('Available years for department:', departmentYears);
      setYears(departmentYears);
    } else {
      setYears([]);
    }
  }, [selectedDepartment, academicDetails]);

  // Update available semesters when year changes
  useEffect(() => {
    if (selectedDepartment && selectedYear) {
      const availableSems = [...new Set(
        academicDetails
          .filter(detail => 
            detail.department === selectedDepartment && 
            detail.year === parseInt(selectedYear)
          )
          .map(detail => detail.semester)
      )].sort((a, b) => a - b);
      
      console.log('Available semesters:', availableSems);
      setAvailableSemesters(availableSems);
    } else {
      setAvailableSemesters([]);
    }
  }, [selectedDepartment, selectedYear, academicDetails]);

  // Update available sections when semester changes
  useEffect(() => {
    if (selectedDepartment && selectedYear && selectedSemester) {
      const detail = academicDetails.find(d => 
        d.department === selectedDepartment && 
        d.year === parseInt(selectedYear) && 
        d.semester === parseInt(selectedSemester)
      );

      const sections = detail?.sections ? detail.sections.split(',').map(s => s.trim()) : [];
      console.log('Available sections:', sections);
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
    }
  }, [selectedDepartment, selectedYear, selectedSemester, academicDetails]);

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching faculty accounts...');
      
      // Get faculty accounts specifically
      const response = await api.get('/api/admin/accounts?role=faculty');
      console.log('Faculty response:', response);

      // Check if response exists and has the expected structure
      if (!response || !response.accounts || !Array.isArray(response.accounts)) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }

      // Process faculty accounts
      const facultyAccounts = response.accounts.map(faculty => ({
        ...faculty,
        departments: Array.isArray(faculty.departments) ? faculty.departments : [],
        years: Array.isArray(faculty.years) ? faculty.years : [],
        semesters: Array.isArray(faculty.semesters) ? faculty.semesters : [],
        sections: Array.isArray(faculty.sections) ? faculty.sections : []
      }));

      setFaculty(facultyAccounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching faculty:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = 'Failed to fetch faculty. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please check your authentication.';
      } else if (error.response?.status === 403) {
        errorMessage += 'You do not have permission to view faculty.';
      } else if (error.response?.status === 404) {
        errorMessage += 'The faculty list is not available at this time.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (!navigator.onLine) {
        errorMessage += 'Please check your internet connection.';
      } else {
        errorMessage += 'Please try again later.';
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await api.get('/api/academic-details');
      if (response && Array.isArray(response.data)) {
        // Extract all sections from academic details
        const allSections = response.data.reduce((acc, detail) => {
          const sectionArray = detail.sections.split(',').map(s => s.trim());
          return [...new Set([...acc, ...sectionArray])];
        }, []);
        setSections(allSections);
      } else {
        console.error('Invalid sections data:', response);
        setSections([]);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
  };

  useEffect(() => {
    fetchAcademicDetails();
    fetchFaculty();
  }, []);

  const handleOpenDialog = (faculty = null) => {
    if (faculty) {
      setSelectedFaculty(faculty);
      setFormData({
        name: faculty.name,
        email: faculty.email,
        departments: faculty.departments || [],
        years: faculty.years || [],
        semesters: faculty.semesters || [],
        sections: faculty.sections || [],
        password: '',
        facultyList: faculty.facultyList || [],
        assignments: faculty.assignments || []
      });
    } else {
      setSelectedFaculty(null);
      setFormData({
        name: '',
        email: '',
        departments: [],
        years: [],
        semesters: [],
        sections: [],
        password: '',
        facultyList: [],
        assignments: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFaculty(null);
    setDialogError('');
    setFormData({
      name: '',
      email: '',
      departments: [],
      years: [],
      semesters: [],
      sections: [],
      password: '',
      facultyList: [],
      assignments: []
    });
  };

  const checkUserExists = async (email) => {
    try {
      const response = await api.get('/api/admin/accounts');
      return response.accounts && response.accounts.some(account => account.email === email);
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  };

  const handleFacultyInputChange = (e) => {
    const newValue = e.target.value;
    setFacultyInput(newValue);
    
    // Convert input to faculty array
    if (newValue.trim()) {
      const facultyNames = newValue
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      // Create email suggestions based on names
      const facultyData = facultyNames.map(name => ({
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        password: `${name.toLowerCase().replace(/\s+/g, '')}123`
      }));
      
      setFormData({
        ...formData,
        facultyList: facultyData
      });
    } else {
      setFormData({
        ...formData,
        facultyList: []
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setDialogError('');
      setError('');

      // Basic validation
      if (!formData.facultyList.length) {
        setDialogError('Please add at least one faculty member');
        return;
      }

      const hasAnySections = Object.values(assignedSections).some(sections => sections.length > 0);
      if (!hasAnySections) {
        setDialogError('Please add at least one section to any semester');
        return;
      }

      // Create faculty accounts
      for (const faculty of formData.facultyList) {
        try {
          // Email format validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(faculty.email)) {
            setDialogError(`Invalid email format for faculty member: ${faculty.name}`);
            return;
          }

          // Check if user exists
          const exists = await checkUserExists(faculty.email);
          if (exists) {
            setDialogError(`A user with email ${faculty.email} already exists`);
            return;
          }

          // Get all assignments and ensure they're not empty
          const validAssignments = Object.entries(assignedSections)
            .filter(([_, sections]) => sections && sections.length > 0)
            .map(([key, sections]) => {
              const [dept, year, sem] = key.split('-');
              return {
                department: dept,
                year: year,
                semester: sem,
                sections: sections
              };
            });

          if (!validAssignments.length) {
            setDialogError('No valid assignments found');
            return;
          }

          // Collect all unique values
          const uniqueDepartments = [...new Set(validAssignments.map(a => a.department))];
          const uniqueYears = [...new Set(validAssignments.map(a => a.year))];
          const uniqueSemesters = [...new Set(validAssignments.map(a => a.semester))];
          const uniqueSections = [...new Set(validAssignments.reduce((acc, curr) => [...acc, ...curr.sections], []))];

          // Ensure we have at least one of each required field
          if (!uniqueDepartments.length || !uniqueYears.length || !uniqueSections.length) {
            setDialogError('Please ensure at least one department, year, and section is assigned');
            return;
          }

          // Format the data to match server expectations
          const dataToSend = {
            name: faculty.name,
            email: faculty.email,
            password: faculty.password || `${faculty.name.toLowerCase().replace(/\s+/g, '')}123`,
            role: 'faculty',
            // Primary assignment data
            department: uniqueDepartments[0],
            year: uniqueYears[0],
            semester: validAssignments[0].semester,
            section: uniqueSections[0],
            // Arrays of all assigned values (required by backend validation)
            departments: uniqueDepartments,
            years: uniqueYears,
            semesters: uniqueSemesters,
            sections: uniqueSections,
            // Additional data
            assignments: validAssignments,
            isEventQuizAccount: false
          };

          // Log the exact data being sent
          console.log('Sending faculty data:', JSON.stringify(dataToSend, null, 2));

          // Make the API call
          const response = await api.post('/api/admin/accounts', dataToSend);

          if (!response || response.error) {
            throw new Error(response?.error || 'Failed to create faculty account');
          }

          console.log('Faculty account created successfully:', response);
        } catch (error) {
          console.error('Error creating faculty account:', error);
          if (error.response?.data?.message) {
            throw new Error(`Failed to create account for ${faculty.name}: ${error.response.data.message}`);
          } else {
            throw new Error(`Failed to create account for ${faculty.name}: ${error.message}`);
          }
        }
      }

      // If we get here, all accounts were created successfully
      handleCloseDialog();
      fetchFaculty();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setDialogError(error.message || 'An unexpected error occurred while creating faculty accounts');
    }
  };

  const handleDelete = async (facultyId) => {
    try {
      await api.delete(`/api/admin/accounts/${facultyId}`);
      fetchFaculty();
      setOpenDeleteDialog(false);
      setFacultyToDelete(null);
    } catch (error) {
      setError('Failed to delete faculty account');
    }
  };

  const handleDeleteClick = (faculty) => {
    setFacultyToDelete(faculty);
    setOpenDeleteDialog(true);
  };

  const processYearSemSec = (yearSemSec) => {
    const assignments = [];
    const pairs = yearSemSec.split(';');
    
    pairs.forEach(pair => {
      const [yearSem, sections] = pair.split(':');
      const [year, semester] = yearSem.split('-');
      const sectionList = sections.split(',').map(s => s.trim());
      
      assignments.push({
        year: year.trim(),
        semester: semester.trim(),
        sections: sectionList
      });
    });
    
    return assignments;
  };

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
          if (!row.Department && !row.department) errors.push('Department is required');
          if (!row.Year_Sem_Sec && !row.year_sem_sec) errors.push('Year_Sem_Sec is required');

          const yearSemSec = row.Year_Sem_Sec || row.year_sem_sec;
          let assignments = [];
          
          try {
            assignments = processYearSemSec(yearSemSec);
          } catch (e) {
            errors.push('Invalid Year_Sem_Sec format');
          }

          // Get unique years, semesters, and sections from assignments
          const years = [...new Set(assignments.map(a => a.year))];
          const semesters = [...new Set(assignments.map(a => a.semester))];
          const sections = [...new Set(assignments.flatMap(a => a.sections))];

          return {
            name: row.Name || row.name,
            email: row.Email || row.email,
            password: row.Password || row.password || Math.random().toString(36).slice(-8),
            departments: [row.Department || row.department],
            years,
            semesters,
            sections,
            assignments,
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

  const handleConfirmUpload = async () => {
    try {
      setUploadStatus('uploading');
      setUploadProgress(80);

      // Upload the faculty accounts
      const response = await api.post('/api/admin/accounts/bulk', { 
        accounts: uploadPreview.map(faculty => ({
          ...faculty,
          role: 'faculty',
          isEventQuizAccount: false
        }))
      });

      setUploadProgress(100);
      setUploadStatus('success');
      console.log('Bulk upload response:', response);
      
      // Close dialog and refresh faculty list after short delay
      setTimeout(() => {
        setOpenUploadDialog(false);
        fetchFaculty();
        // Reset upload states
        setUploadedFile(null);
        setUploadPreview([]);
        setUploadProgress(0);
        setUploadStatus('');
      }, 1500);

    } catch (error) {
      console.error('Error uploading faculty data:', error);
      setUploadError(error.message || 'Failed to upload faculty data');
      setUploadStatus('error');
    }
  };

  const getFilteredFaculty = () => {
    return faculty.filter(member => {
      const departmentMatch = !filters.department || 
        (member.departments && Array.isArray(member.departments) && 
         member.departments.includes(filters.department));
      const emailMatch = !filters.email || 
        (member.email && member.email.toLowerCase().includes(filters.email.toLowerCase()));
      const nameMatch = !searchQuery || 
        (member.name && member.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return departmentMatch && emailMatch && nameMatch;
    });
  };

  // Add helper function to group faculty by department
  const getFacultyByDepartment = () => {
    const groupedFaculty = {};
    departments.forEach(dept => {
      groupedFaculty[dept.name] = faculty.filter(member => 
        member.departments.includes(dept.name)
      );
    });
    return groupedFaculty;
  };

  // Add a retry button component
  const RetryButton = () => (
    <Button 
      variant="contained" 
      onClick={fetchFaculty}
      sx={{ mt: 2 }}
    >
      Retry Loading
    </Button>
  );

  // Add toggleAllPasswords function
  const toggleAllPasswords = async () => {
    try {
      if (!showAllPasswords) {
        // Fetch all passwords at once
        const response = await api.get('/api/admin/accounts/passwords?role=faculty');
        setVisiblePasswords(response.passwords);
      } else {
        // Clear all visible passwords
        setVisiblePasswords({});
      }
      setShowAllPasswords(!showAllPasswords);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    }
  };

  // Add helper function to get available sections
  const getAvailableSections = (department, year, semester) => {
    if (!department || !year || !semester) return [];
    const matchingSection = sections.find(section => 
      section.department === department && 
      section.year.toString() === year.toString() &&
      section.semester.toString() === semester.toString()
    );
    return matchingSection ? matchingSection.sections : [];
  };

  // Add helper function to add assignment
  const handleAddAssignment = async (facultyId, type, value) => {
    try {
      const facultyToUpdate = faculty.find(f => f._id === facultyId);
      if (!facultyToUpdate) return;

      let updateData = { ...facultyToUpdate };

      // Update the specific array based on type
      switch (type) {
        case 'department':
          updateData.departments = [...new Set([...updateData.departments, value])];
          break;
        case 'year':
          updateData.years = [...new Set([...updateData.years, value])];
          break;
        case 'semester':
          updateData.semesters = [...new Set([...updateData.semesters, value])];
          break;
        case 'section':
          updateData.sections = [...new Set([...updateData.sections, value])];
          break;
        default:
          return;
      }

      // Update assignments array
      if (type === 'section') {
        // Find matching department-year-semester combinations
        const relevantAssignments = updateData.assignments || [];
        const existingAssignment = relevantAssignments.find(a => 
          a.sections.includes(value)
        );

        if (!existingAssignment) {
          // Add new assignment if it doesn't exist
          updateData.assignments = [
            ...(updateData.assignments || []),
            {
              department: updateData.departments[0],
              year: updateData.years[0],
              semester: updateData.semesters[0],
              sections: [value]
            }
          ];
        }
      }

      // Make API call to update faculty
      await api.put(`/api/admin/faculty/${facultyId}`, updateData);

      // Update local state
      setFaculty(prevFaculty => 
        prevFaculty.map(f => 
          f._id === facultyId ? { ...f, ...updateData } : f
        )
      );
    } catch (error) {
      console.error('Error updating faculty assignments:', error);
      setError('Failed to update faculty assignments');
    }
  };

  // Add helper function to remove assignment
  const handleRemoveAssignment = async (facultyId, type, value) => {
    try {
      const facultyToUpdate = faculty.find(f => f._id === facultyId);
      if (!facultyToUpdate) return;

      let updateData = { ...facultyToUpdate };

      // Update the specific array based on type
      switch (type) {
        case 'department':
          updateData.departments = updateData.departments.filter(d => d !== value);
          // Remove assignments for this department
          updateData.assignments = (updateData.assignments || []).filter(a => a.department !== value);
          break;
        case 'year':
          updateData.years = updateData.years.filter(y => y !== value);
          // Remove assignments for this year
          updateData.assignments = (updateData.assignments || []).filter(a => a.year !== value);
          break;
        case 'semester':
          updateData.semesters = updateData.semesters.filter(s => s !== value);
          // Remove assignments for this semester
          updateData.assignments = (updateData.assignments || []).filter(a => a.semester !== value);
          break;
        case 'section':
          updateData.sections = updateData.sections.filter(s => s !== value);
          // Remove this section from assignments
          updateData.assignments = (updateData.assignments || []).map(a => ({
            ...a,
            sections: a.sections.filter(s => s !== value)
          })).filter(a => a.sections.length > 0);
          break;
        default:
          return;
      }

      // Make API call to update faculty
      await api.put(`/api/admin/faculty/${facultyId}`, updateData);

      // Update local state
      setFaculty(prevFaculty => 
        prevFaculty.map(f => 
          f._id === facultyId ? { ...f, ...updateData } : f
        )
      );
    } catch (error) {
      console.error('Error removing faculty assignment:', error);
      setError('Failed to remove faculty assignment');
    }
  };

  // Helper function to handle section input
  const handleAddSection = () => {
    if (!sectionInput.trim() || !selectedDepartment || !selectedYear || !selectedSemester) return;

    const key = getKey(selectedDepartment, selectedYear, selectedSemester);
    const sections = sectionInput
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    setAssignedSections(prev => ({
      ...prev,
      [key]: [...new Set([...(prev[key] || []), ...sections])]
    }));

    setSectionInput('');

    // Update formData
    const allSections = Object.values(assignedSections).flat();
    setFormData(prev => ({
      ...prev,
      departments: [...new Set([...prev.departments, selectedDepartment])],
      years: [...new Set([...prev.years, selectedYear])],
      semesters: [...new Set([...prev.semesters, selectedSemester])],
      sections: allSections
    }));
  };

  // Add function to toggle password visibility
  const togglePasswordVisibility = async (facultyId) => {
    try {
      if (!visiblePasswords[facultyId]) {
        // Fetch password only if not already visible
        const response = await api.get(`/api/admin/accounts/${facultyId}/password`);
        if (response && response.password) {
          setVisiblePasswords(prev => ({
            ...prev,
            [facultyId]: response.password
          }));
        } else {
          setError('Failed to fetch password');
        }
      } else {
        // Hide password
        setVisiblePasswords(prev => {
          const newState = { ...prev };
          delete newState[facultyId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error fetching password:', error);
      setError('Failed to fetch password');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // First fetch all passwords
      const response = await api.get('/api/admin/accounts/passwords?role=faculty');
      const passwords = response.passwords || {};

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Faculty Accounts', 14, 15);
      
      // Add timestamp and counts
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
      doc.text(`Total Faculty: ${faculty.length}`, 14, 28);
      doc.text(`Filtered Faculty: ${getFilteredFaculty().length}`, 14, 34);
      
      // Add filter information if any filters are active
      let filterText = '';
      if (filters.department) filterText += `Department: ${filters.department} `;
      if (searchQuery) filterText += `Search: "${searchQuery}"`;
      
      if (filterText) {
        doc.text(`Filters Applied: ${filterText}`, 14, 40);
      }
      
      // Prepare table data with original passwords
      const tableData = getFilteredFaculty().map(facultyMember => [
        facultyMember.name || '',
        facultyMember.email || '',
        facultyMember.departments?.join(', ') || '',
        facultyMember.years?.join(', ') || '',
        passwords[facultyMember._id] || '********'  // Use fetched password
      ]);
      
      // Add table using autoTable
      autoTable(doc, {
        startY: 25,
        head: [['Name', 'Email', 'Departments', 'Years', 'Password']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 71, 71] },
        columnStyles: {
          0: { cellWidth: 40 }, // Name
          1: { cellWidth: 50 }, // Email
          2: { cellWidth: 40 }, // Departments
          3: { cellWidth: 30 }, // Years
          4: { cellWidth: 30 }  // Password
        }
      });
      
      // Save PDF
      doc.save('faculty-accounts.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading faculty...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          action={<RetryButton />}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Faculty Accounts</Typography>
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
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Faculty
            </Button>
          </Box>
        </Box>

        {faculty.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No faculty accounts found. Use the "Add Faculty" button above to create faculty accounts.
          </Alert>
        ) : (
          <>
            {/* Search and Filters Section */}
            <Paper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                {/* Search Field */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search by Faculty Name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <SearchIcon color="action" sx={{ mr: 1 }} />
                      ),
                    }}
                    placeholder="Type to search..."
                  />
                </Grid>

                {/* Existing Filters */}
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={filters.department}
                      onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                      label="Department"
                    >
                      <MenuItem value="">All</MenuItem>
                      {departments.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setFilters({ department: '', email: '', name: '' });
                      setSearchQuery('');
                    }}
                    disabled={!filters.department && !filters.email && !searchQuery}
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>

              {/* Search Results Count */}
              {searchQuery && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Found {getFilteredFaculty().length} matching faculty members
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Count Display */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1">
                    Showing {getFilteredFaculty().length} out of {faculty.length} faculty members
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    {filters.department && `Department: ${filters.department}`}
                    {searchQuery && ` • Search: "${searchQuery}"`}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Table Section */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Password</strong></TableCell>
                    <TableCell><strong>Departments</strong></TableCell>
                    <TableCell><strong>Years</strong></TableCell>
                    <TableCell><strong>Semesters</strong></TableCell>
                    <TableCell><strong>Sections</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredFaculty().map((member) => (
                    <TableRow key={member._id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      
                      {/* Password Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {visiblePasswords[member._id] ? 
                              visiblePasswords[member._id] : 
                              '••••••••'
                            }
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => togglePasswordVisibility(member._id)}
                            sx={{ ml: 1 }}
                          >
                            {visiblePasswords[member._id] ? 
                              <VisibilityOffIcon fontSize="small" /> : 
                              <VisibilityIcon fontSize="small" />
                            }
                          </IconButton>
                        </Box>
                      </TableCell>

                      {/* Departments Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {member.departments.map((dept) => (
                            <Chip
                              key={dept}
                              label={dept}
                              size="small"
                              onDelete={() => handleRemoveAssignment(member._id, 'department', dept)}
                            />
                          ))}
                          <FormControl size="small" sx={{ minWidth: 120, ml: 1 }}>
                            <Select
                              value=""
                              displayEmpty
                              size="small"
                              onChange={(e) => handleAddAssignment(member._id, 'department', e.target.value)}
                              sx={{ height: '32px' }}
                            >
                              <MenuItem value="" disabled>
                                <AddIcon fontSize="small" /> Add
                              </MenuItem>
                              {departments
                                .filter(dept => !member.departments.includes(dept.name))
                                .map((dept) => (
                                  <MenuItem key={dept._id} value={dept.name}>
                                    {dept.name}
                                  </MenuItem>
                                ))
                              }
                            </Select>
                          </FormControl>
                        </Box>
                      </TableCell>

                      {/* Years Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {member.years.map((year) => (
                            <Chip
                              key={year}
                              label={`Year ${year}`}
                              size="small"
                              onDelete={() => handleRemoveAssignment(member._id, 'year', year)}
                            />
                          ))}
                          <FormControl size="small" sx={{ minWidth: 100, ml: 1 }}>
                            <Select
                              value=""
                              displayEmpty
                              size="small"
                              onChange={(e) => handleAddAssignment(member._id, 'year', e.target.value)}
                              sx={{ height: '32px' }}
                            >
                              <MenuItem value="" disabled>
                                <AddIcon fontSize="small" /> Add
                              </MenuItem>
                              {years
                                .filter(year => !member.years.includes(year))
                                .map((year) => (
                                  <MenuItem key={year} value={year}>
                                    Year {year}
                                  </MenuItem>
                                ))
                              }
                            </Select>
                          </FormControl>
                        </Box>
                      </TableCell>

                      {/* Semesters Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {member.semesters.map((semester) => (
                            <Chip
                              key={semester}
                              label={`Sem ${semester}`}
                              size="small"
                              onDelete={() => handleRemoveAssignment(member._id, 'semester', semester)}
                            />
                          ))}
                          <FormControl size="small" sx={{ minWidth: 100, ml: 1 }}>
                            <Select
                              value=""
                              displayEmpty
                              size="small"
                              onChange={(e) => handleAddAssignment(member._id, 'semester', e.target.value)}
                              sx={{ height: '32px' }}
                            >
                              <MenuItem value="" disabled>
                                <AddIcon fontSize="small" /> Add
                              </MenuItem>
                              {SEMESTERS
                                .filter(sem => !member.semesters.includes(sem))
                                .map((semester) => (
                                  <MenuItem key={semester} value={semester}>
                                    Sem {semester}
                                  </MenuItem>
                                ))
                              }
                            </Select>
                          </FormControl>
                        </Box>
                      </TableCell>

                      {/* Sections Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                          {member.sections.map((section) => (
                            <Chip
                              key={section}
                              label={`Sec ${section}`}
                              size="small"
                              onDelete={() => handleRemoveAssignment(member._id, 'section', section)}
                            />
                          ))}
                          <FormControl size="small" sx={{ minWidth: 100, ml: 1 }}>
                            <Select
                              value=""
                              displayEmpty
                              size="small"
                              onChange={(e) => handleAddAssignment(member._id, 'section', e.target.value)}
                              sx={{ height: '32px' }}
                            >
                              <MenuItem value="" disabled>
                                <AddIcon fontSize="small" /> Add
                              </MenuItem>
                              {SECTIONS
                                .filter(sec => !member.sections.includes(sec))
                                .map((section) => (
                                  <MenuItem key={section} value={section}>
                                    Sec {section}
                                  </MenuItem>
                                ))
                              }
                            </Select>
                          </FormControl>
                        </Box>
                      </TableCell>

                      {/* Actions Cell */}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Faculty">
                            <IconButton 
                              size="small"
                              onClick={() => handleOpenDialog(member)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Faculty">
                            <IconButton 
                              size="small"
                              color="error"
                              onClick={() => {
                                setFacultyToDelete(member);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Show message when no results found */}
            {getFilteredFaculty().length === 0 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  No faculty members found matching your search criteria.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Faculty Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedFaculty ? 'Edit Faculty' : 'Add Faculty'}
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Faculty Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Faculty Information</Typography>
              <TextField
                fullWidth
                label="Faculty Names (comma-separated)"
                value={facultyInput}
                onChange={handleFacultyInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && facultyInput.trim()) {
                    e.preventDefault();
                    const newValue = facultyInput + ', ';
                    setFacultyInput(newValue);
                  }
                }}
                helperText="Enter faculty names separated by commas (e.g., John Doe, Jane Smith)"
                placeholder="Type faculty names and press Enter or add commas"
                multiline
                rows={2}
              />
            </Grid>

            {formData.facultyList && formData.facultyList.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Faculty Details:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.facultyList.map((faculty, index) => (
                    <Box key={index} sx={{ 
                      border: '1px solid #ddd', 
                      borderRadius: 1, 
                      p: 1, 
                      bgcolor: '#f5f5f5', 
                      width: '100%' 
                    }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Name"
                            value={faculty.name}
                            onChange={(e) => {
                              const updatedList = [...formData.facultyList];
                              updatedList[index].name = e.target.value;
                              setFormData({ ...formData, facultyList: updatedList });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Email"
                            value={faculty.email}
                            onChange={(e) => {
                              const updatedList = [...formData.facultyList];
                              updatedList[index].email = e.target.value;
                              setFormData({ ...formData, facultyList: updatedList });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Password"
                            value={faculty.password}
                            onChange={(e) => {
                              const updatedList = [...formData.facultyList];
                              updatedList[index].password = e.target.value;
                              setFormData({ ...formData, facultyList: updatedList });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const updatedList = formData.facultyList.filter((_, i) => i !== index);
                              setFormData({ ...formData, facultyList: updatedList });
                              setFacultyInput(updatedList.map(f => f.name).join(', '));
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </Box>
              </Grid>
            )}

            {/* Department Assignment */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Class Assignment</Typography>
              
              {/* Department Selection */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Select Department</Typography>
                <FormControl fullWidth>
                  <Select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedYear('');
                      setSelectedSemester('');
                      setSectionInput('');
                    }}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select a department</em>
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>

              {/* Year Selection - Only show if department is selected */}
              {selectedDepartment && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Select Year</Typography>
                  <Grid container spacing={2}>
                    {years.map((year) => (
                      <Grid item xs={6} sm={3} key={year}>
                        <Button
                          fullWidth
                          variant={selectedYear === year.toString() ? "contained" : "outlined"}
                          onClick={() => {
                            setSelectedYear(year.toString());
                            setSelectedSemester('');
                            setSectionInput('');
                          }}
                        >
                          Year {year}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* Semester Selection - Only show if year is selected */}
              {selectedYear && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Select Semester</Typography>
                  <Grid container spacing={2}>
                    {availableSemesters.map((semester) => (
                      <Grid item xs={6} sm={3} key={semester}>
                        <Button
                          fullWidth
                          variant={selectedSemester === semester.toString() ? "contained" : "outlined"}
                          onClick={() => {
                            setSelectedSemester(semester.toString());
                            setSectionInput('');
                          }}
                        >
                          Semester {semester}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* Section Selection - Only show if semester is selected */}
              {selectedSemester && (
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Select Sections</Typography>
                  <Grid container spacing={2}>
                    {availableSections.map((section) => (
                      <Grid item xs={6} sm={3} key={section}>
                        <Button
                          fullWidth
                          variant={
                            assignedSections[getKey(selectedDepartment, selectedYear, selectedSemester)]?.includes(section)
                              ? "contained"
                              : "outlined"
                          }
                          onClick={() => {
                            const key = getKey(selectedDepartment, selectedYear, selectedSemester);
                            const currentSections = assignedSections[key] || [];
                            const newSections = currentSections.includes(section)
                              ? currentSections.filter(s => s !== section)
                              : [...currentSections, section];
                            
                            setAssignedSections(prev => ({
                              ...prev,
                              [key]: newSections
                            }));
                          }}
                        >
                          Section {section}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* Show final submit section if any sections are added */}
              {Object.values(assignedSections).some(sections => sections.length > 0) && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: '#e3f2fd' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      Review and Submit Assignments
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmit}
                      disabled={!formData.facultyList.length}
                    >
                      Submit All Assignments
                    </Button>
                  </Box>
                  
                  {/* Summary of assignments */}
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Assignment Summary:</Typography>
                    {Object.entries(assignedSections).map(([key, sections]) => {
                      if (sections.length === 0) return null;
                      const [dept, year, sem] = key.split('-');
                      return (
                        <Typography key={key} variant="body2" color="textSecondary">
                          • {dept} - Year {year} - Semester {sem}: {sections.join(', ')}
                        </Typography>
                      );
                    })}
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {Object.values(assignedSections).some(sections => sections.length > 0) && (
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.facultyList.length}
            >
              {selectedFaculty ? 'Update' : 'Add Faculty'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Upload Excel Dialog */}
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
        <DialogTitle>Upload Faculty Data</DialogTitle>
        <DialogContent>
          {/* Instructions Section */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Upload Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" gutterBottom>
                Upload an Excel file containing faculty information. The file should follow this structure:
              </Typography>
              
              <Box sx={{ my: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Required Excel Columns:</Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li><strong>Name</strong>: Full name of the faculty member</li>
                    <li><strong>Email</strong>: Valid email address</li>
                    <li><strong>Password</strong>: Initial password (optional)</li>
                    <li><strong>Department</strong>: Department name</li>
                    <li><strong>Year_Sem_Sec</strong>: Semester-specific section assignments in format:
                      <pre style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '8px', 
                        borderRadius: '4px',
                        marginTop: '8px'
                      }}>
                        Year-Semester:Sections
                      </pre>
                      Example: "1-1:A,B;1-2:B,C" means:
                      <ul>
                        <li>Year 1, Semester 1: Sections A and B</li>
                        <li>Year 1, Semester 2: Sections B and C</li>
                      </ul>
                    </li>
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
                        <TableCell>Department</TableCell>
                        <TableCell>Year_Sem_Sec</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>John Doe</TableCell>
                        <TableCell>john.doe@example.com</TableCell>
                        <TableCell>Computer Science</TableCell>
                        <TableCell>1-1:A,B;1-2:B,C</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Jane Smith</TableCell>
                        <TableCell>jane.smith@example.com</TableCell>
                        <TableCell>Electronics</TableCell>
                        <TableCell>2-1:B,C;2-2:A,B</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Understanding Year_Sem_Sec Format:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" component="div">
                    • Format: Year-Semester:Sections;Year-Semester:Sections<br />
                    • Example: "1-1:A,B;1-2:B,C" means:<br />
                    &nbsp;&nbsp;- Year 1, Semester 1: Sections A and B<br />
                    &nbsp;&nbsp;- Year 1, Semester 2: Sections B and C<br />
                    • Use semicolon (;) to separate different semester assignments<br />
                    • Use comma (,) to separate sections within a semester<br />
                    • Use colon (:) to separate semester from its sections
                  </Typography>
                </Box>
              </Box>

              {/* Download Template Button */}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    // Create a sample Excel file
                    const ws = XLSX.utils.aoa_to_sheet([
                      ['Name', 'Email', 'Password', 'Department', 'Year_Sem_Sec'],
                      ['John Doe', 'john.doe@example.com', 'password123', 'Computer Science', '1-1:A,B;1-2:B,C'],
                      ['Jane Smith', 'jane.smith@example.com', 'password456', 'Electronics', '2-1:B,C;2-2:A,B']
                    ]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Template');
                    XLSX.writeFile(wb, 'faculty_upload_template.xlsx');
                  }}
                >
                  Download Template
                </Button>
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
                {uploadStatus === 'uploading' && 'Uploading faculty data...'}
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
                Preview ({uploadPreview.length} faculty members)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Departments</TableCell>
                      <TableCell>Years</TableCell>
                      <TableCell>Sections</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadPreview.map((faculty, index) => (
                      <TableRow key={index}>
                        <TableCell>{faculty.name}</TableCell>
                        <TableCell>{faculty.email}</TableCell>
                        <TableCell>{faculty.departments.join(', ')}</TableCell>
                        <TableCell>{faculty.years.join(', ')}</TableCell>
                        <TableCell>{faculty.sections.join(', ')}</TableCell>
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
              Upload {uploadPreview.length} Faculty Members
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setFacultyToDelete(null);
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this faculty account?
          </Typography>
          {facultyToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Faculty Details:
              </Typography>
              <Typography variant="body2">
                Name: {facultyToDelete.name}
              </Typography>
              <Typography variant="body2">
                Email: {facultyToDelete.email}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDeleteDialog(false);
            setFacultyToDelete(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(facultyToDelete._id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FacultyAccounts; 