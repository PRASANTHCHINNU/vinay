import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import AssessmentIcon from '@mui/icons-material/Assessment';
import api from '../../config/axios';

const QuizOverview = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    department: 'all',
    year: 'all',
    section: 'all',
    subject: 'all',
    semester: 'all'
  });

  const [quizzes, setQuizzes] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchQuizzes();
  }, [filters]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Only include non-"all" filters in the request
      const queryParams = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== 'all') {
          queryParams[key] = value;
        }
      });
      
      // Fetch statistics and quizzes in parallel
      const [statsResponse, quizzesResponse] = await Promise.all([
        api.get('/api/quiz/statistics', { params: queryParams }),
        api.get('/api/quiz', { params: queryParams })
      ]);

      // Ensure we have valid responses
      if (statsResponse) {
        setStatistics(statsResponse);
      }

      if (Array.isArray(quizzesResponse)) {
        setQuizzes(quizzesResponse);
        
        // Extract unique subjects from quizzes
        const uniqueSubjects = quizzesResponse
          .map(quiz => quiz.subject)
          .filter((subject, index, self) => 
            subject && index === self.findIndex(s => s?._id === subject?._id)
          );
        setSubjects(uniqueSubjects);
      } else {
        setQuizzes([]);
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError(error.response?.data?.message || 'Failed to fetch quizzes');
      setQuizzes([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return `${Math.round(value)}%`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Quiz Overview</Typography>
          <Tooltip title="View comprehensive statistics and analytics for all quizzes">
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Filters */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                label="Department"
              >
                <MenuItem value="all">All Departments</MenuItem>
                {['Computer Science', 'ECE', 'EEE', 'MECH', 'CIVIL'].map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Year</InputLabel>
              <Select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                label="Year"
              >
                <MenuItem value="all">All Years</MenuItem>
                {[1, 2, 3, 4].map(year => (
                  <MenuItem key={year} value={year}>Year {year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Semester</InputLabel>
              <Select
                name="semester"
                value={filters.semester}
                onChange={handleFilterChange}
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

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Section</InputLabel>
              <Select
                name="section"
                value={filters.section}
                onChange={handleFilterChange}
                label="Section"
              >
                <MenuItem value="all">All Sections</MenuItem>
                {['A', 'B', 'C', 'D'].map(section => (
                  <MenuItem key={section} value={section}>Section {section}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                name="subject"
                value={filters.subject}
                onChange={handleFilterChange}
                label="Subject"
              >
                <MenuItem value="all">All Subjects</MenuItem>
                {subjects.map(subject => (
                  <MenuItem key={subject._id} value={subject._id}>
                    {subject.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Statistics Summary */}
        {statistics && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Total Quizzes
                </Typography>
                <Typography variant="h4">
                  {statistics.totalQuizzes || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Total Students
                </Typography>
                <Typography variant="h4">
                  {statistics.totalStudents || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Submission Rate
                </Typography>
                <Typography variant="h4">
                  {formatPercentage((statistics.submittedCount / statistics.totalStudents) * 100)}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Average Score
                </Typography>
                <Typography variant="h4">
                  {formatPercentage(statistics.averageScore)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Quizzes Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Quiz Title</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Year</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell align="right">Submission %</TableCell>
                  <TableCell align="right">Non-Submission %</TableCell>
                  <TableCell align="right">Average Score %</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quizzes.map((quiz) => {
                  // Extract unique departments, years, and sections from allowedGroups
                  const departments = Array.from(new Set(quiz.allowedGroups?.map(group => group.department) || []));
                  const years = Array.from(new Set(quiz.allowedGroups?.map(group => group.year) || []));
                  const sections = Array.from(new Set(quiz.allowedGroups?.map(group => group.section) || []));
                  
                  // Calculate total authorized students
                  const totalAuthorized = (quiz.allowedGroups?.length || 0) * 60; // Assuming 60 students per group
                  
                  const submissionRate = quiz.totalSubmissions ? (quiz.totalSubmissions / totalAuthorized) * 100 : 0;
                  const nonSubmissionRate = 100 - submissionRate;

                  return (
                    <TableRow key={quiz._id}>
                      <TableCell>{quiz.title}</TableCell>
                      <TableCell>{departments.join(', ') || 'N/A'}</TableCell>
                      <TableCell>{years.join(', ') || 'N/A'}</TableCell>
                      <TableCell>{sections.join(', ') || 'N/A'}</TableCell>
                      <TableCell align="right">{formatPercentage(submissionRate)}</TableCell>
                      <TableCell align="right">{formatPercentage(nonSubmissionRate)}</TableCell>
                      <TableCell align="right">{formatPercentage(quiz.averageScore)}</TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<AssessmentIcon />}
                          onClick={() => navigate(`/quiz-statistics/${quiz._id}`)}
                          size="small"
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {quizzes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No quizzes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default QuizOverview; 