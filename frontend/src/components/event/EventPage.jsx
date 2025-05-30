import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';

const EventPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user exists and has event role
    if (!user || user.role !== 'event') {
      navigate('/login');
      return;
    }
    fetchEventQuizzes();
  }, [user, navigate]);

  const handleApiError = (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Unauthorized or Forbidden - clear session and redirect to login
      logout();
      navigate('/login');
    } else {
      setError('Failed to fetch quizzes. Please try again later.');
    }
  };

  const fetchEventQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First verify the user session is still valid
      try {
        await api.get('/api/auth/me');
      } catch (error) {
        handleApiError(error);
        return;
      }

      // Then fetch the quizzes
      const response = await api.get('/api/event-quiz/quizzes');
      if (Array.isArray(response)) {
        setQuizzes(response);
      } else if (response && Array.isArray(response.quizzes)) {
        setQuizzes(response.quizzes);
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) return 'info'; // Upcoming
    if (now >= startTime && now <= endTime) return 'success'; // Active
    return 'error'; // Ended
  };

  const getStatusText = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) return 'Upcoming';
    if (now >= startTime && now <= endTime) return 'Active';
    return 'Ended';
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Event Quiz Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {user?.department ? `Department: ${user.department}` : 'Organization Events'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {quizzes.map((quiz) => (
          <Grid item xs={12} md={6} lg={4} key={quiz._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {quiz.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Subject: {quiz.subject}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip 
                    label={getStatusText(quiz)}
                    color={getStatusColor(quiz)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    label={`Duration: ${quiz.duration} mins`}
                    variant="outlined"
                    size="small"
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Start: {new Date(quiz.startTime).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    End: {new Date(quiz.endTime).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  onClick={() => {/* TODO: Add view results handler */}}
                >
                  View Results
                </Button>
                <Button 
                  size="small" 
                  color="primary"
                  onClick={() => {/* TODO: Add view details handler */}}
                >
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {quizzes.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No quizzes found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                There are currently no quizzes assigned to your event.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default EventPage; 