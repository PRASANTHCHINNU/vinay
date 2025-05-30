import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../config/axios';

const QuizManagement = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    subject: '',
    department: '',
    status: 'all'
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, [tabValue]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const type = tabValue === 0 ? 'academic' : 'event';
      const endpoint = type === 'event' ? '/api/quiz/event' : '/api/quiz/all';
      
      console.log('Fetching quizzes from:', endpoint);
      const response = await api.get(endpoint);
      console.log('Quiz response:', response);
      
      // Ensure we have an array of quizzes
      const quizData = Array.isArray(response.data) ? response.data : [];
      setQuizzes(quizData);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError(err.response?.data?.message || 'Failed to fetch quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(''); // Clear any previous errors when switching tabs
  };

  const handleViewResults = (quizId) => {
    // Navigate to quiz results page
    window.location.href = `/admin/quiz/${quizId}/results`;
  };

  const handleEdit = (quiz) => {
    setSelectedQuiz(quiz);
    setOpenDialog(true);
  };

  const handleDelete = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await api.delete(`/api/quiz/${quizId}`);
        fetchQuizzes();
      } catch (err) {
        setError('Failed to delete quiz');
      }
    }
  };

  const handleExportResults = async (quizId) => {
    try {
      const response = await api.get(`/api/admin/quizzes/${quizId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'quiz-results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export results');
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filters.subject || quiz.subject === filters.subject;
    const matchesDepartment = !filters.department || quiz.department === filters.department;
    const matchesStatus = filters.status === 'all' || quiz.status === filters.status;
    return matchesSearch && matchesSubject && matchesDepartment && matchesStatus;
  });

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Quiz Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Academic Quizzes" />
          <Tab label="Event Quizzes" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search Quizzes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  label="Subject"
                >
                  <MenuItem value="">All</MenuItem>
                  {/* Add subjects dynamically */}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  label="Department"
                >
                  <MenuItem value="">All</MenuItem>
                  {/* Add departments dynamically */}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submissions</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredQuizzes.map((quiz) => (
              <TableRow key={quiz._id}>
                <TableCell>{quiz.title}</TableCell>
                <TableCell>{quiz.subject}</TableCell>
                <TableCell>{quiz.department}</TableCell>
                <TableCell>{new Date(quiz.startTime).toLocaleDateString()}</TableCell>
                <TableCell>{quiz.duration} mins</TableCell>
                <TableCell>{quiz.status}</TableCell>
                <TableCell>{quiz.submissionCount}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Results">
                      <IconButton size="small" onClick={() => handleViewResults(quiz._id)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Quiz">
                      <IconButton size="small" onClick={() => handleEdit(quiz)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export Results">
                      <IconButton size="small" onClick={() => handleExportResults(quiz._id)}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Quiz">
                      <IconButton size="small" color="error" onClick={() => handleDelete(quiz._id)}>
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
    </Container>
  );
};

export default QuizManagement; 