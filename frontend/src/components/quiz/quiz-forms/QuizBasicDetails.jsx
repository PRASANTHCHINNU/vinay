import { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  OutlinedInput,
  Alert
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../config/axios';

const QuizBasicDetails = ({ 
  basicDetails, 
  setBasicDetails, 
  error, 
  setError,
  filters,
  setFilters 
}) => {
  const { user } = useAuth();
  const [academicStructure, setAcademicStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  // Memoize handleFilterChange to prevent recreation on every render
  const handleFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    
    setFilters(prev => {
      const newFilters = { ...prev };
      newFilters[name] = value;

      // Reset dependent fields
      if (name === 'department') {
        newFilters.year = '';
        newFilters.semester = '';
        newFilters.sections = [];
      } else if (name === 'year') {
        newFilters.semester = '';
        newFilters.sections = [];
      } else if (name === 'semester') {
        newFilters.sections = [];
      }

      return newFilters;
    });

    // Update basicDetails in a separate effect
    if (name === 'sections') {
      const sections = typeof value === 'string' ? value.split(',') : value;
      if (filters.department && filters.year && filters.semester) {
        const allowedGroups = sections.map(section => ({
          department: filters.department,
          year: parseInt(filters.year),
          semester: parseInt(filters.semester),
          section
        }));
        
        setBasicDetails(prev => ({
          ...prev,
          allowedGroups
        }));
      }
    }
  }, [filters.department, filters.year, filters.semester, setBasicDetails, setFilters]);

  // Fetch academic structure
  useEffect(() => {
    const fetchAcademicStructure = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/academic-details/faculty-structure');
        
        if (response.data && typeof response.data === 'object') {
          setAcademicStructure(response.data);
        }
      } catch (error) {
        console.error('Error fetching academic structure:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicStructure();
  }, []);

  // Auto-select department for faculty
  useEffect(() => {
    if (
      academicStructure && 
      user?.assignments?.length === 1 && 
      !filters.department
    ) {
      const assignment = user.assignments[0];
      const dept = assignment.department;
      if (Object.keys(academicStructure).includes(dept)) {
        setFilters(prev => ({
          ...prev,
          department: dept
        }));
      }
    }
  }, [academicStructure, user?.assignments, filters.department]);

  // Update subjects from academic structure
  useEffect(() => {
    if (!filters.department || !filters.year || !filters.semester || !academicStructure) {
      setSubjects([]);
      return;
    }

    try {
      const semesterData = academicStructure[filters.department]?.years[filters.year]?.semesters[filters.semester];
      if (semesterData?.subjects && Array.isArray(semesterData.subjects)) {
        setSubjects(semesterData.subjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error getting subjects:', error);
      setSubjects([]);
    }
  }, [filters.department, filters.year, filters.semester, academicStructure]);

  const getAvailableYears = () => {
    if (!academicStructure || !filters.department) return [];
    const deptData = academicStructure[filters.department];
    if (!deptData?.years) return [];
    return Object.keys(deptData.years).map(Number).sort((a, b) => a - b);
  };

  const getAvailableSemesters = () => {
    if (!academicStructure || !filters.department || !filters.year) return [];
    const yearData = academicStructure[filters.department]?.years[filters.year];
    if (!yearData?.semesters) return [];
    return Object.keys(yearData.semesters).map(Number).sort((a, b) => a - b);
  };

  const getAvailableSections = () => {
    if (!academicStructure || !filters.department || !filters.year || !filters.semester) return [];
    const semesterData = academicStructure[filters.department]?.years[filters.year]?.semesters[filters.semester];
    return semesterData?.sections || [];
  };

  // Handle basic details changes with enhanced date validation
  const handleBasicDetailsChange = (event) => {
    const { name, value } = event.target;

    // Validate dates if changing start or end time
    if (name === 'startTime' || name === 'endTime') {
      const startTime = name === 'startTime' ? new Date(value) : new Date(basicDetails.startTime);
      const endTime = name === 'endTime' ? new Date(value) : new Date(basicDetails.endTime);
      const now = new Date();

      // Set seconds and milliseconds to 0 for fair comparison
      startTime.setSeconds(0, 0);
      endTime.setSeconds(0, 0);
      now.setSeconds(0, 0);

      // Only validate if both dates are set
      if (basicDetails.startTime && basicDetails.endTime) {
        if (endTime <= startTime) {
          setError('End time must be after start time');
          return;
        }
        
        // Allow start time if it's within 5 minutes of current time
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
        if (startTime < fiveMinutesAgo) {
          setError('Start time must not be more than 5 minutes in the past');
          return;
        }
        
        setError(null); // Clear error if dates are valid
      }
    }

    // For subject selection, ensure we're using both code and name
    if (name === 'subject' && value) {
      const selectedSubject = subjects.find(s => s.code === value);
      if (selectedSubject) {
        setBasicDetails(prev => ({
          ...prev,
          subject: {
            code: selectedSubject.code,
            name: selectedSubject.name
          }
        }));
        return;
      }
    }

    setBasicDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Grid container spacing={2}>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Quiz Title"
          name="title"
          value={basicDetails.title}
          onChange={handleBasicDetailsChange}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Department</InputLabel>
          <Select
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
            disabled={loading}
          >
            {academicStructure && Object.keys(academicStructure).map(dept => (
              <MenuItem key={dept} value={dept}>
                {dept}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Year</InputLabel>
          <Select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            disabled={!filters.department || loading}
          >
            {getAvailableYears().map(year => (
              <MenuItem key={year} value={year}>
                Year {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Semester</InputLabel>
          <Select
            name="semester"
            value={filters.semester}
            onChange={handleFilterChange}
            disabled={!filters.year || loading}
          >
            {getAvailableSemesters().map(semester => (
              <MenuItem key={semester} value={semester}>
                Semester {semester}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Sections</InputLabel>
          <Select
            multiple
            name="sections"
            value={filters.sections}
            onChange={handleFilterChange}
            input={<OutlinedInput label="Sections" />}
            disabled={!filters.semester || loading}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {getAvailableSections().map(section => (
              <MenuItem key={section} value={section}>
                Section {section}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Subject</InputLabel>
          <Select
            name="subject"
            value={basicDetails.subject?.code || basicDetails.subject || ''}
            onChange={handleBasicDetailsChange}
            disabled={!filters.semester || loading}
          >
            {subjects.map(subject => (
              <MenuItem key={subject._id || subject.code} value={subject.code}>
                {subject.name} ({subject.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Duration (minutes)"
          name="duration"
          type="number"
          value={basicDetails.duration}
          onChange={handleBasicDetailsChange}
          inputProps={{ min: 1 }}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Start Time"
          name="startTime"
          type="datetime-local"
          value={basicDetails.startTime}
          onChange={handleBasicDetailsChange}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="End Time"
          name="endTime"
          type="datetime-local"
          value={basicDetails.endTime}
          onChange={handleBasicDetailsChange}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
    </Grid>
  );
};

export default QuizBasicDetails; 