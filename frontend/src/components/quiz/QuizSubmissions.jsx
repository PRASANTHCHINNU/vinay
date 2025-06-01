import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const QuizAuthorizedStudents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL'];
  const [filters, setFilters] = useState({
    admissionNumber: '',
    scoreRange: 'all',
    submissionStatus: 'all',
    department: 'all',
    year: 'all',
    section: 'all',
    semester: 'all'
  });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch quiz details and submissions in parallel
      const [quizResponse, submissionsResponse] = await Promise.all([
        api.get(`api/quiz/${id}`),
        api.get(`api/quiz/${id}/submissions`)
      ]);

      if (!quizResponse || !quizResponse.title) {
        throw new Error('Failed to fetch quiz details');
      }

      setQuiz(quizResponse);

      if (!submissionsResponse || !submissionsResponse.submissions) {
        throw new Error('Failed to fetch submissions');
      }

      // Transform submissions data to include all necessary details
      const transformedStudents = submissionsResponse.submissions.map(submission => ({
        student: {
          _id: submission.student?._id,
          name: submission.student?.name || 'N/A',
          admissionNumber: submission.student?.admissionNumber || 'N/A',
          department: submission.student?.department || 'N/A',
          year: submission.student?.year || 'N/A',
          section: submission.student?.section || 'N/A'
        },
        hasSubmitted: submission.status === 'evaluated',
        submissionStatus: submission.status || 'not-submitted',
        totalMarks: submission.totalMarks || 0,
        duration: submission.duration || null,
        startTime: submission.startTime || null,
        submitTime: submission.submitTime || null,
        answers: submission.answers || []
      }));

      setStudents(transformedStudents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load data';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      admissionNumber: '',
      scoreRange: 'all',
      submissionStatus: 'all',
      department: 'all',
      year: 'all',
      section: 'all',
      semester: 'all'
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper function to format duration
  const formatDuration = (durationInMinutes) => {
    if (!durationInMinutes && durationInMinutes !== 0) return 'Not submitted';
    
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Helper function to calculate score percentage
  const calculateScorePercentage = (score, totalMarks) => {
    if (score === undefined || totalMarks === 0) return 0;
    return (score / totalMarks) * 100;
  };

  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    
    return students.filter(student => {
      if (!student || !student.student) return false;

      // Admission number filter
      if (filters.admissionNumber && 
          !student.student.admissionNumber.toLowerCase().includes(filters.admissionNumber.toLowerCase())) {
        return false;
      }

      // Score range filter
      if (filters.scoreRange !== 'all') {
        const scorePercentage = calculateScorePercentage(student.totalMarks, quiz?.totalMarks || 0);
        const [min, max] = filters.scoreRange.split('-').map(Number);
        
        if (!student.hasSubmitted) {
          return min === 0;
        }
        
        if (scorePercentage < min || scorePercentage > max) return false;
      }

      // Submission status filter
      if (filters.submissionStatus !== 'all') {
        if (filters.submissionStatus === 'submitted' && !student.hasSubmitted) return false;
        if (filters.submissionStatus === 'not-submitted' && student.hasSubmitted) return false;
        if (filters.submissionStatus !== 'submitted' &&
            filters.submissionStatus !== 'not-submitted' &&
            student.submissionStatus !== filters.submissionStatus) {
          return false;
        }
      }

      // Department filter
      if (filters.department !== 'all' && student.student.department !== filters.department) {
        return false;
      }

      // Year filter
      if (filters.year !== 'all' && student.student.year !== parseInt(filters.year)) {
        return false;
      }

      // Section filter
      if (filters.section !== 'all' && student.student.section !== filters.section) {
        return false;
      }

      // Semester filter
      if (filters.semester !== 'all' && student.student.semester !== filters.semester) {
        return false;
      }

      return true;
    });
  }, [students, filters, quiz?.totalMarks]);

  const sortedStudents = useMemo(() => {
    if (!filteredStudents || !Array.isArray(filteredStudents)) return [];
    
    const sortableStudents = [...filteredStudents];
    if (!sortConfig.key) return sortableStudents;

    return sortableStudents.sort((a, b) => {
      if (!a || !b || !a.student || !b.student) return 0;

      switch (sortConfig.key) {
        case 'admissionNumber':
          return sortConfig.direction === 'asc'
            ? a.student.admissionNumber.localeCompare(b.student.admissionNumber)
            : b.student.admissionNumber.localeCompare(a.student.admissionNumber);
        
        case 'score':
          if (!a.hasSubmitted && !b.hasSubmitted) return 0;
          if (!a.hasSubmitted) return sortConfig.direction === 'asc' ? -1 : 1;
          if (!b.hasSubmitted) return sortConfig.direction === 'asc' ? 1 : -1;
          
          const scoreA = calculateScorePercentage(a.totalMarks, quiz?.totalMarks || 0);
          const scoreB = calculateScorePercentage(b.totalMarks, quiz?.totalMarks || 0);
          return sortConfig.direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        
        case 'submissionStatus':
          return sortConfig.direction === 'asc'
            ? (a.submissionStatus || '').localeCompare(b.submissionStatus || '')
            : (b.submissionStatus || '').localeCompare(a.submissionStatus || '');
        
        case 'name':
          return sortConfig.direction === 'asc'
            ? a.student.name.localeCompare(b.student.name)
            : b.student.name.localeCompare(a.student.name);
        
        case 'duration':
          if (!a.duration && !b.duration) return 0;
          if (!a.duration) return sortConfig.direction === 'asc' ? -1 : 1;
          if (!b.duration) return sortConfig.direction === 'asc' ? 1 : -1;
          return sortConfig.direction === 'asc' ? a.duration - b.duration : b.duration - a.duration;
        
        default:
          return 0;
      }
    });
  }, [filteredStudents, sortConfig, quiz]);

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>

          <Typography variant="h4" gutterBottom>
            {quiz?.title} - Submissions
          </Typography>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                Total Students: {students.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                Submitted: {students.filter(s => s.hasSubmitted).length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                Average Score: {
                  students.length > 0 
                    ? (students.reduce((acc, s) => acc + (s.totalMarks || 0), 0) / students.length).toFixed(2)
                    : 0
                }
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Admission Number"
              value={filters.admissionNumber}
              onChange={(e) => handleFilterChange('admissionNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Score Range</InputLabel>
              <Select
                value={filters.scoreRange}
                onChange={(e) => handleFilterChange('scoreRange', e.target.value)}
                label="Score Range"
              >
                <MenuItem value="all">All Scores</MenuItem>
                <MenuItem value="0-0">Not Submitted</MenuItem>
                <MenuItem value="0-50">Below 50%</MenuItem>
                <MenuItem value="50-70">50% - 70%</MenuItem>
                <MenuItem value="70-90">70% - 90%</MenuItem>
                <MenuItem value="90-100">Above 90%</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.submissionStatus}
                onChange={(e) => handleFilterChange('submissionStatus', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="not-submitted">Not Submitted</MenuItem>
                <MenuItem value="evaluated">Evaluated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Semester</InputLabel>
              <Select
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
                label="Semester"
              >
                <MenuItem value="all">All Semesters</MenuItem>
                <MenuItem value={1}>Semester 1</MenuItem>
                <MenuItem value={2}>Semester 2</MenuItem>
                <MenuItem value={3}>Semester 3</MenuItem>
                <MenuItem value={4}>Semester 4</MenuItem>
                <MenuItem value={5}>Semester 5</MenuItem>
                <MenuItem value={6}>Semester 6</MenuItem>
                <MenuItem value={7}>Semester 7</MenuItem>
                <MenuItem value={8}>Semester 8</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>

        {/* Results Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'admissionNumber'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('admissionNumber')}
                  >
                    Admission No.
                  </TableSortLabel>
                </TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Section</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'score'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submit Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedStudents.map((studentData) => (
                <TableRow key={studentData.student._id}>
                  <TableCell>{studentData.student.name}</TableCell>
                  <TableCell>{studentData.student.admissionNumber}</TableCell>
                  <TableCell>{studentData.student.department}</TableCell>
                  <TableCell>{studentData.student.year}</TableCell>
                  <TableCell>{studentData.student.section}</TableCell>
                  <TableCell>
                    {studentData.hasSubmitted ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>
                          {studentData.totalMarks} / {quiz?.totalMarks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({calculateScorePercentage(studentData.totalMarks, quiz?.totalMarks).toFixed(1)}%)
                        </Typography>
                      </Box>
                    ) : (
                      'Not submitted'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={studentData.submissionStatus}
                      color={
                        studentData.submissionStatus === 'evaluated' ? 'success' :
                        studentData.submissionStatus === 'submitted' ? 'primary' :
                        studentData.submissionStatus === 'started' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {studentData.submitTime ? new Date(studentData.submitTime).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatDuration(studentData.duration)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/faculty/quizzes/${id}/submissions/${studentData.student._id}`)}
                      disabled={!studentData.hasSubmitted}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No submissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default QuizAuthorizedStudents;