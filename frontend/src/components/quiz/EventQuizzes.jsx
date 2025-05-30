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
  Alert,
  CircularProgress,
  Box,
  Chip
} from '@mui/material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const EventQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/quiz/event');
      setQuizzes(response.data || []);
    } catch (error) {
      console.error('Error fetching event quizzes:', error);
      setError('Failed to fetch event quizzes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = (quizId) => {
    navigate(`/quizzes/${quizId}/attempt`);
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
      <Typography variant="h4" gutterBottom>
        Event Quizzes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {quizzes.map((quiz) => (
          <Grid item xs={12} sm={6} md={4} key={quiz._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {quiz.title}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  Event: {quiz.eventDetails.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Organizer: {quiz.eventDetails.organizer}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Venue: {quiz.eventDetails.venue}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={`${quiz.duration} minutes`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`${quiz.totalMarks} marks`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`${quiz.questions.length} questions`}
                    size="small"
                  />
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => handleStartQuiz(quiz._id)}
                >
                  Start Quiz
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default EventQuizzes; 