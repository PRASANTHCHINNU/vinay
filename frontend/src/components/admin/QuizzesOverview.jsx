import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../config/axios';

const QuizzesOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/quiz/all');
      setQuizzes(response.quizzes || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError('Failed to fetch quizzes');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getFilteredQuizzes = () => {
    if (tabValue === 0) return quizzes;
    return quizzes.filter(quiz => 
      tabValue === 1 ? quiz.type === 'academic' : quiz.type === 'event'
    );
  };

  const handleCreateQuiz = () => {
    navigate('/quizzes/create');
  };

  const handleViewQuiz = (quizId) => {
    navigate(`/quizzes/${quizId}`);
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/quizzes/${quizId}/edit`);
  };

  const handleViewSubmissions = (quizId) => {
    navigate(`/quizzes/${quizId}/submissions`);
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Quizzes Overview</Typography>
          <Button
            variant="contained"
            onClick={handleCreateQuiz}
          >
            Create New Quiz
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="All Quizzes" />
            <Tab label="Academic Quizzes" />
            <Tab label="Event Quizzes" />
          </Tabs>
        </Box>

        <Grid container spacing={3}>
          {getFilteredQuizzes().map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {quiz.title}
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Chip 
                      label={quiz.type === 'academic' ? 'Academic' : 'Event'} 
                      color={quiz.type === 'academic' ? 'primary' : 'secondary'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={quiz.isActive ? 'Active' : 'Inactive'} 
                      color={quiz.isActive ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Duration: {quiz.duration} minutes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Marks: {quiz.totalMarks}
                  </Typography>
                  {quiz.type === 'academic' && quiz.subject && (
                    <Typography variant="body2" color="text.secondary">
                      Subject: {quiz.subject.name}
                    </Typography>
                  )}
                  {quiz.type === 'event' && quiz.eventDetails && (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Event: {quiz.eventDetails.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Venue: {quiz.eventDetails.venue}
                      </Typography>
                    </>
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleViewQuiz(quiz._id)}>
                    View
                  </Button>
                  <Button size="small" onClick={() => handleEditQuiz(quiz._id)}>
                    Edit
                  </Button>
                  <Button size="small" onClick={() => handleViewSubmissions(quiz._id)}>
                    Submissions
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {getFilteredQuizzes().length === 0 && (
          <Alert severity="info">
            No quizzes found. Create a new quiz using the button above.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default QuizzesOverview; 