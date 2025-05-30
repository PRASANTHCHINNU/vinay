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
  IconButton,
  Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import api from '../../config/axios';
import { useNavigate } from 'react-router-dom';

const EventQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/quiz/event');
      setQuizzes(response.data || []);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch event quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await api.delete(`/api/quiz/${quizId}`);
        fetchQuizzes();
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to delete quiz');
      }
    }
  };

  const handleViewSubmissions = (quizId) => {
    navigate(`/quizzes/${quizId}/submissions`);
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/quizzes/${quizId}/edit`);
  };

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
          Event Quizzes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/quizzes/event/create')}
        >
          Create Event Quiz
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Event Name</TableCell>
              <TableCell>Organizer</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Total Marks</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quizzes.map((quiz) => (
              <TableRow key={quiz._id}>
                <TableCell>{quiz.title}</TableCell>
                <TableCell>{quiz.eventDetails?.name || 'N/A'}</TableCell>
                <TableCell>{quiz.eventDetails?.organizer || 'N/A'}</TableCell>
                <TableCell>{quiz.duration} minutes</TableCell>
                <TableCell>{quiz.totalMarks}</TableCell>
                <TableCell>
                  <Chip
                    label={quiz.isActive ? 'Active' : 'Inactive'}
                    color={quiz.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleViewSubmissions(quiz._id)}
                    title="View Submissions"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    color="primary"
                    onClick={() => handleEditQuiz(quiz._id)}
                    title="Edit Quiz"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteQuiz(quiz._id)}
                    title="Delete Quiz"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default EventQuizzes; 