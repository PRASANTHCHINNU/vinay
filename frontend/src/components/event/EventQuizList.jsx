import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Event as EventIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';

const EventQuizList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openRegister, setOpenRegister] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [registrationData, setRegistrationData] = useState({
    college: '',
    department: '',
    year: ''
  });
  const [registrationError, setRegistrationError] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/event-quiz');
      setQuizzes(response.data);
    } catch (error) {
      setError('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = (quiz) => {
    setSelectedQuiz(quiz);
    setOpenRegister(true);
  };

  const handleRegister = async () => {
    try {
      await api.post(`/api/event-quiz/${selectedQuiz._id}/register`, registrationData);
      setOpenRegister(false);
      setSelectedQuiz(null);
      setRegistrationData({ college: '', department: '', year: '' });
      fetchQuizzes(); // Refresh the list
    } catch (error) {
      setRegistrationError(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleViewRegistrations = (quizId) => {
    navigate(`/event-quiz/${quizId}/registrations`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'published': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
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
      {user?.role === 'eventAdmin' && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/event-quiz/create')}
          >
            Create Event Quiz
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {quizzes.map((quiz) => (
          <Grid item xs={12} md={6} key={quiz._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {quiz.title}
                  </Typography>
                  <Chip
                    label={quiz.status}
                    color={getStatusColor(quiz.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  {quiz.description}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimeIcon fontSize="small" />
                      <Typography variant="body2">
                        Duration: {quiz.duration} minutes
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon fontSize="small" />
                      <Typography variant="body2">
                        {quiz.participantType === 'college' ? 'College Students Only' : 'Any College Students'}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EventIcon fontSize="small" />
                      <Typography variant="body2">
                        {new Date(quiz.startTime).toLocaleString()} - {new Date(quiz.endTime).toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {quiz.maxParticipants > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Registrations: {quiz.registrations?.length || 0} / {quiz.maxParticipants}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions>
                {user?.role === 'eventAdmin' ? (
                  <>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/event-quiz/${quiz._id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PeopleIcon />}
                      onClick={() => handleViewRegistrations(quiz._id)}
                    >
                      View Registrations
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="small"
                      onClick={() => handleRegisterClick(quiz)}
                      disabled={!quiz.registrationEnabled || quiz.status !== 'published'}
                    >
                      Register
                    </Button>
                    <Button size="small" color="primary">
                      Learn More
                    </Button>
                  </>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Registration Dialog */}
      <Dialog open={openRegister} onClose={() => setOpenRegister(false)}>
        <DialogTitle>Register for {selectedQuiz?.title}</DialogTitle>
        <DialogContent>
          {registrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registrationError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="College Name"
            value={registrationData.college}
            onChange={(e) => setRegistrationData(prev => ({ ...prev, college: e.target.value }))}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Department"
            value={registrationData.department}
            onChange={(e) => setRegistrationData(prev => ({ ...prev, department: e.target.value }))}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Year"
            value={registrationData.year}
            onChange={(e) => setRegistrationData(prev => ({ ...prev, year: e.target.value }))}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegister(false)}>Cancel</Button>
          <Button onClick={handleRegister} variant="contained">
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventQuizList; 