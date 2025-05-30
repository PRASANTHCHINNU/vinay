import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress,
  Alert,
  ButtonGroup,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Tooltip,
  Paper
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import ClassIcon from '@mui/icons-material/Class';

const COLORS = {
  excellent: '#4caf50',
  good: '#2196f3',
  average: '#ff9800',
  poor: '#f44336',
  submitted: '#4caf50',
  notSubmitted: '#f44336'
};

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [filters, setFilters] = useState({
    department: '',
    year: '',
    semester: '',
    section: '',
    subject: '',
    status: ''
  });

  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    submittedCount: 0,
    averageScore: 0,
    scoreDistribution: {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0
    }
  });

  const [detailedStats, setDetailedStats] = useState({
    subjectWiseStats: {},
    departmentWiseStats: {},
    yearWiseStats: {}
  });

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchQuizzes();
    fetchDepartments();
    fetchSections();
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      calculateStatistics();
    }
  }, [quizzes, submissions]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDetailedStatistics();
    }
  }, [filters]);

  // Add a focus effect to refresh data when tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      fetchQuizzes();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the correct endpoint for all roles
      const response = await api.get('/api/quiz');
      
      // Ensure response is an array
      const quizData = Array.isArray(response) ? response : [];
      console.log('Quiz data:', quizData);
      setQuizzes(quizData);
      
      // For students, fetch their submissions
      if (user.role === 'student') {
        const submissionPromises = quizData.map(quiz =>
          api.get(`/api/quiz/${quiz._id}/submission`)
            .then(res => ({ quizId: quiz._id, ...res }))
            .catch((err) => {
              // Silently handle 404 errors (no submission found)
              if (err.response?.status === 404) {
                return {
                  quizId: quiz._id,
                  status: 'not_attempted'
                };
              }
              console.error(`Error fetching submission for quiz ${quiz._id}:`, err);
              return {
                quizId: quiz._id,
                status: 'not_attempted'
              };
            })
        );
        const submissions = await Promise.all(submissionPromises);
        const submissionMap = {};
        submissions.forEach(sub => {
          if (sub) submissionMap[sub.quizId] = sub;
        });
        setSubmissions(submissionMap);
      }
      
      // For admin, fetch all submissions for statistics
      if (user.role === 'admin') {
        console.log('Fetching admin statistics...');
        const allSubmissions = await api.get('/api/quiz/all-submissions');
        console.log('Admin submissions response:', allSubmissions);
        setSubmissions(allSubmissions || {});
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch quizzes');
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/academic-details/faculty-structure');
      const structure = response.data;
      const departments = Object.keys(structure);
      setDepartments(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSections = async () => {
    try {
      if (!selectedDepartment || !selectedYear) {
        setSections([]);
        return;
      }
      const response = await api.get(`/api/academic-details/sections?department=${selectedDepartment}&year=${selectedYear}&semester=1`);
      setSections(response.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      setSections([]);
    }
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

  const calculateStatistics = () => {
    if (!quizzes || !submissions) return;

    const stats = {
      totalStudents: 0,
      submittedCount: 0,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      }
    };

    quizzes.forEach(quiz => {
      if (!quiz) return;

      // Use the actual authorized student count from the backend
      stats.totalStudents += quiz.totalAuthorizedStudents || 0;
      
      // Calculate submission statistics
      const quizSubmissions = submissions[quiz._id] || [];
      stats.submittedCount += Array.isArray(quizSubmissions) ? quizSubmissions.length : 0;
      
      // Calculate score distribution
      if (Array.isArray(quizSubmissions)) {
        quizSubmissions.forEach(submission => {
          if (!submission?.answers) return;
          
          const score = submission.answers.reduce((total, ans) => total + (ans?.marks || 0), 0);
          const percentage = quiz.totalMarks > 0 ? (score / quiz.totalMarks) * 100 : 0;
          
          if (percentage > 90) stats.scoreDistribution.excellent++;
          else if (percentage > 70) stats.scoreDistribution.good++;
          else if (percentage > 50) stats.scoreDistribution.average++;
          else stats.scoreDistribution.poor++;
          
          stats.averageScore += score;
        });
      }
    });

    // Calculate final average
    if (stats.submittedCount > 0) {
      stats.averageScore = stats.averageScore / stats.submittedCount;
    }

    setStatistics(stats);
  };

  const fetchDetailedStatistics = async () => {
    try {
      if (user.role !== 'admin') return;

      console.log('Fetching detailed statistics with filters:', filters);
      const response = await api.get('/quiz/statistics', {
        params: {
          department: filters.department !== 'all' ? filters.department : undefined,
          year: filters.year !== 'all' ? filters.year : undefined,
          section: filters.section !== 'all' ? filters.section : undefined,
          subject: filters.subject !== 'all' ? filters.subject : undefined
        }
      });
      console.log('Statistics response:', response.data);

      if (response.data) {
        setDetailedStats({
          subjectWiseStats: response.data.subjectWiseStats || {},
          departmentWiseStats: response.data.departmentWiseStats || {},
          yearWiseStats: response.data.yearWiseStats || {}
        });

        // Update overall statistics
        setStatistics({
          totalStudents: response.data.totalStudents || 0,
          submittedCount: response.data.submittedCount || 0,
          averageScore: response.data.averageScore || 0,
          scoreDistribution: {
            excellent: response.data.scoreDistribution?.excellent || 0,
            good: response.data.scoreDistribution?.good || 0,
            average: response.data.scoreDistribution?.average || 0,
            poor: response.data.scoreDistribution?.poor || 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch statistics');
    }
  };

  const getQuizStatus = (quiz, submission) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    console.log('Quiz Status Check:', {
      quiz: quiz.title,
      now: now.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isBeforeStart: now < startTime,
      isDuringQuiz: now >= startTime && now <= endTime,
      isAfterEnd: now > endTime,
      hasSubmission: !!submission,
      submissionStatus: submission?.status
    });

    if (submission && submission.status === 'evaluated') {
      return { label: 'Completed', color: 'success' };
    } else if (now < startTime) {
      return { label: 'Upcoming', color: 'info' };
    } else if (now > endTime) {
      return { label: 'Expired', color: 'error' };
    } else {
      return { label: 'Active', color: 'primary' };
    }
  };

  const getButtonConfig = (quiz, status, submission) => {
    if (submission) {
      return {
        text: 'Review Answers',
        icon: <AssessmentIcon />,
        action: () => navigate(`/quizzes/${quiz._id}/review`),
        disabled: false,
        color: 'primary'
      };
    }

    switch (status.label) {
      case 'Active':
        return {
          text: 'Start Quiz',
          action: () => navigate(`/quizzes/${quiz._id}`),
          disabled: false,
          color: 'primary'
        };
      case 'Upcoming':
        return {
          text: 'Not Started Yet',
          action: () => {},
          disabled: true,
          color: 'info'
        };
      case 'Expired':
        return {
          text: 'Quiz Expired',
          action: () => {},
          disabled: true,
          color: 'error'
        };
      default:
        return {
          text: 'View Details',
          action: () => navigate(`/quizzes/${quiz._id}`),
          disabled: true,
          color: 'default'
        };
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await api.delete(`/api/quiz/${quizToDelete._id}`);
      setDeleteDialog(false);
      setQuizToDelete(null);
      // Update the quizzes state instead of reloading
      setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz._id !== quizToDelete._id));
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
    setQuizToDelete(null);
  };

  const getFilteredQuizzes = () => {
    console.log('Current pathname:', window.location.pathname);
    console.log('All quizzes before filtering:', quizzes.map(q => ({
      title: q.title,
      startTime: q.startTime,
      endTime: q.endTime
    })));

    return quizzes.filter(quiz => {
      const now = new Date();
      const startTime = new Date(quiz.startTime);
      const endTime = new Date(quiz.endTime);
      
      const isUpcoming = now < startTime;
      const isActive = startTime <= now && now <= endTime;

      console.log('Filtering quiz:', {
        title: quiz.title,
        now: now.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        isUpcoming,
        isActive,
        pathname: window.location.pathname,
        role: user.role
      });

      // For student view, filter based on route
      if (user.role === 'student') {
        const path = window.location.pathname;
        const shouldShow = path === '/student/upcoming-quizzes' ? isUpcoming : isActive;
        console.log('Student filter result:', {
          quiz: quiz.title,
          path,
          isUpcoming,
          isActive,
          shouldShow
        });
        if (path === '/student/upcoming-quizzes') {
          return isUpcoming;
        } else if (path === '/student/quizzes') {
          return isActive;
        }
      }

      // For faculty/admin view, apply regular filters
      const departmentMatch = !filters.department || quiz.allowedGroups.some(g => g.department === filters.department);
      const yearMatch = !filters.year || quiz.allowedGroups.some(g => g.year === Number(filters.year));
      const semesterMatch = !filters.semester || quiz.allowedGroups.some(g => g.semester === Number(filters.semester));
      const sectionMatch = !filters.section || quiz.allowedGroups.some(g => g.section === filters.section);
      const subjectMatch = !filters.subject || 
        (quiz.subject?._id === filters.subject || quiz.subject?.code === filters.subject);
      const statusMatch = !filters.status || getQuizStatus(quiz).label.toLowerCase() === filters.status.toLowerCase();
      
      return departmentMatch && yearMatch && semesterMatch && sectionMatch && subjectMatch && statusMatch;
    });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
    setSelectedSection(''); // Reset section when department changes
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
    setSelectedSection(''); // Reset section when year changes
  };

  const handleSectionChange = (event) => {
    setSelectedSection(event.target.value);
  };

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon /> Filters
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Department</InputLabel>
            <Select
              value={selectedDepartment}
              onChange={handleDepartmentChange}
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
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              onChange={handleYearChange}
              label="Year"
              disabled={!selectedDepartment}
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
            <InputLabel>Section</InputLabel>
            <Select
              value={selectedSection}
              onChange={handleSectionChange}
              label="Section"
              disabled={!selectedYear}
            >
              <MenuItem value="">All</MenuItem>
              {sections.map((section) => (
                <MenuItem key={section} value={section}>
                  Section {section}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Subject</InputLabel>
            <Select
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              label="Subject"
            >
              <MenuItem value="">All</MenuItem>
              {quizzes
                .map(quiz => quiz.subject)
                .filter((subject, index, self) => 
                  subject && // Filter out null/undefined
                  index === self.findIndex(s => 
                    (s?._id === subject?._id) || // Compare objects
                    (typeof s === 'string' && s === subject) // Compare strings
                  )
                )
                .map(subject => (
                  <MenuItem 
                    key={typeof subject === 'string' ? subject : subject?._id} 
                    value={typeof subject === 'string' ? subject : subject?._id}
                  >
                    {typeof subject === 'string' ? subject : subject?.name || subject?.code || 'N/A'}
                  </MenuItem>
                ))
              }
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="upcoming">Upcoming</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setFilters({
              department: '',
              year: '',
              semester: '',
              section: '',
              subject: '',
              status: ''
            })}
            disabled={!selectedDepartment && !selectedYear && !selectedSection && !filters.subject && !filters.status}
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderStatisticsCharts = () => {
    // Prepare data for submission status pie chart
    const submissionData = [
      { 
        name: 'Submitted', 
        value: statistics?.submittedCount || 0, 
        color: COLORS.submitted 
      },
      { 
        name: 'Not Submitted', 
        value: (statistics?.totalStudents || 0) - (statistics?.submittedCount || 0),
        color: COLORS.notSubmitted 
      }
    ].filter(item => item.value > 0); // Only show non-zero values

    // Prepare data for score distribution pie chart
    const scoreDistributionData = [
      { 
        name: 'Excellent', 
        value: statistics?.scoreDistribution?.excellent || 0, 
        color: COLORS.excellent 
      },
      { 
        name: 'Good', 
        value: statistics?.scoreDistribution?.good || 0, 
        color: COLORS.good 
      },
      { 
        name: 'Average', 
        value: statistics?.scoreDistribution?.average || 0, 
        color: COLORS.average 
      },
      { 
        name: 'Poor', 
        value: statistics?.scoreDistribution?.poor || 0, 
        color: COLORS.poor 
      }
    ].filter(item => item.value > 0); // Only show non-zero values

    // Don't render charts if no data
    if (submissionData.length === 0 && scoreDistributionData.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No statistics available yet. Start creating quizzes and collecting submissions to see analytics.
        </Alert>
      );
    }

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {submissionData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Submission Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={submissionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {submissionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
        
        {scoreDistributionData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Score Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={scoreDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {scoreDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderDetailedStatistics = () => {
    // Check if we have any detailed statistics
    if (!detailedStats || 
        (!Object.keys(detailedStats.subjectWiseStats || {}).length && 
         !Object.keys(detailedStats.departmentWiseStats || {}).length && 
         !Object.keys(detailedStats.yearWiseStats || {}).length)) {
      return null;
    }

    // Prepare data for bar charts
    const subjectData = Object.entries(detailedStats.subjectWiseStats || {})
      .map(([id, data]) => ({
        name: data.code || 'Unknown',
        submissions: data.totalSubmissions || 0,
        average: parseFloat((data.averageScore || 0).toFixed(1))
      }))
      .filter(item => item.submissions > 0);

    const departmentData = Object.entries(detailedStats.departmentWiseStats || {})
      .map(([dept, data]) => ({
        name: dept || 'Unknown',
        submissions: data.totalSubmissions || 0,
        average: parseFloat((data.averageScore || 0).toFixed(1))
      }))
      .filter(item => item.submissions > 0);

    const yearData = Object.entries(detailedStats.yearWiseStats || {})
      .map(([year, data]) => ({
        name: `Year ${year}`,
        submissions: data.totalSubmissions || 0,
        average: parseFloat((data.averageScore || 0).toFixed(1))
      }))
      .filter(item => item.submissions > 0);

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {/* Subject-wise Statistics */}
        {subjectData.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom align="center">
                Subject-wise Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="submissions" name="Submissions" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="average" name="Average Score %" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Department-wise Statistics */}
        {departmentData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom align="center">
                Department-wise Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="submissions" name="Submissions" fill="#8884d8" />
                  <Bar dataKey="average" name="Average Score %" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Year-wise Statistics */}
        {yearData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom align="center">
                Year-wise Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="submissions" name="Submissions" fill="#8884d8" />
                  <Bar dataKey="average" name="Average Score %" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderQuizCard = (quiz) => {
    const status = getQuizStatus(quiz, submissions[quiz._id]);
    const buttonConfig = getButtonConfig(quiz, status, submissions[quiz._id]);

    // Helper function to get subject display text
    const getSubjectDisplay = (subject) => {
      if (!subject) return 'N/A';
      if (typeof subject === 'string') return subject;
      if (subject.code && subject.name) {
        if (subject.code === subject.name) return subject.code;
        return `${subject.name} (${subject.code})`;
      }
      if (subject.name) return subject.name;
      if (subject.code) return subject.code;
      return 'N/A';
    };

    return (
      <Card 
        key={quiz._id} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100%',
          maxWidth: '100%'
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom noWrap>
              {quiz.title}
            </Typography>
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ClassIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Subject: {getSubjectDisplay(quiz.subject)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTimeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Duration: {quiz.duration} minutes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  {quiz.allowedGroups?.map(group => 
                    `${group.department} - Year ${group.year} - Semester ${group.semester || 'N/A'} - Section ${group.section}`
                  ).join(', ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start: {formatDateTime(quiz.startTime)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  End: {formatDateTime(quiz.endTime)}
                </Typography>
                {status && (
                  <Typography 
                    variant="body2" 
                    color={status.color + '.main'}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    Status: {status.label}
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
          {user?.role === 'faculty' ? (
            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/faculty/quizzes/${quiz._id}/edit`)}
                size="small"
                fullWidth
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteClick(quiz)}
                size="small"
                fullWidth
              >
                Delete
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AssessmentIcon />}
                onClick={() => navigate(`/faculty/quizzes/${quiz._id}/submissions`)}
                size="small"
                fullWidth
              >
                Results
              </Button>
            </Stack>
          ) : (
            <Button
              fullWidth
              variant={buttonConfig.variant || 'contained'}
              color={buttonConfig.color || 'primary'}
              onClick={buttonConfig.action}
              startIcon={buttonConfig.icon}
              disabled={buttonConfig.disabled}
              size="small"
            >
              {buttonConfig.text}
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

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
    <Container 
      maxWidth="xl" 
      sx={{ 
        mt: 4, 
        mb: 4,
        px: { xs: 2, sm: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <Box sx={{ width: '100%', maxWidth: '1200px' }}>
        <Typography variant="h4">
          {user.role === 'student' 
            ? window.location.pathname === '/student/upcoming-quizzes'
              ? 'Upcoming Quizzes'
              : 'Available Quizzes'
            : 'Quizzes'
          }
        </Typography>
        <br />

        {/* Show filters and statistics only for admin */}
        {user?.role === 'admin' && (
          <>
            <Box sx={{ width: '100%' }}>
              {renderFilters()}
            </Box>
            {renderStatisticsCharts()}
            {renderDetailedStatistics()}
          </>
        )}

        {/* Show simple filters for faculty */}
        {user?.role === 'faculty' && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <FilterListIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Filters</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Department</InputLabel>
                    <Select
                      name="department"
                      value={selectedDepartment}
                      onChange={handleDepartmentChange}
                      label="Department"
                    >
                      <MenuItem value="">All</MenuItem>
                      {user?.assignments && [...new Set(user.assignments.map(a => a.department))].map(dept => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Year</InputLabel>
                    <Select
                      name="year"
                      value={selectedYear}
                      onChange={handleYearChange}
                      label="Year"
                      disabled={!selectedDepartment}
                    >
                      <MenuItem value="">All</MenuItem>
                      {user?.assignments && [...new Set(
                        user.assignments
                          .filter(a => !selectedDepartment || a.department === selectedDepartment)
                          .map(a => a.year)
                      )].sort().map(year => (
                        <MenuItem key={year} value={year}>Year {year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Section</InputLabel>
                    <Select
                      name="section"
                      value={selectedSection}
                      onChange={handleSectionChange}
                      label="Section"
                      disabled={!selectedYear}
                    >
                      <MenuItem value="">All</MenuItem>
                      {user?.assignments && [...new Set(
                        user.assignments
                          .filter(a => 
                            (!selectedDepartment || a.department === selectedDepartment) &&
                            (!selectedYear || a.year === selectedYear)
                          )
                          .map(a => a.sections)
                      )].sort().map(section => (
                        <MenuItem key={section} value={section}>Section {section}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={filters.status}
                      onChange={(e) => handleFilterChange(e)}
                      label="Status"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="upcoming">Upcoming</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setFilters({
                        department: '',
                        year: '',
                        semester: '',
                        section: '',
                        subject: '',
                        status: ''
                      });
                    }}
                    disabled={!selectedDepartment && !selectedYear && !selectedSection && !filters.status}
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}

        <Box 
          sx={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <Grid 
            container 
            spacing={{ xs: 2, sm: 2 }}
            columns={{ xs: 12, sm: 12, md: 12, lg: 12 }}
            sx={{ 
              width: '100%',
              justifyContent: 'center'
            }}
          >
            {getFilteredQuizzes().length === 0 ? (
              <Grid item xs={12}>
                <Alert severity="info">
                  No quizzes available for the selected filters.
                </Alert>
              </Grid>
            ) : (
              getFilteredQuizzes().map((quiz) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={quiz._id} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ width: '100%', maxWidth: '320px' }}>
                    {renderQuizCard(quiz)}
                  </Box>
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Quiz</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the quiz "{quizToDelete?.title}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizList; 