import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Grid,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';

const EventQuizCreation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    duration: 30,
    startTime: null,
    endTime: null,
    participantType: 'college', // 'college' or 'any'
    registrationEnabled: true,
    spotRegistrationEnabled: false,
    maxParticipants: 0, // 0 means unlimited
    instructions: '',
    passingMarks: 0,
    totalMarks: 0
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuizData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!quizData.title || !quizData.startTime || !quizData.endTime || !quizData.duration) {
        throw new Error('Please fill in all required fields');
      }

      // Validate times
      if (new Date(quizData.startTime) >= new Date(quizData.endTime)) {
        throw new Error('End time must be after start time');
      }

      const response = await api.post('/api/event-quiz', {
        ...quizData,
        createdBy: user._id
      });

      setSuccess('Quiz created successfully!');
      // Reset form or redirect to quiz list
      setQuizData({
        title: '',
        description: '',
        duration: 30,
        startTime: null,
        endTime: null,
        participantType: 'college',
        registrationEnabled: true,
        spotRegistrationEnabled: false,
        maxParticipants: 0,
        instructions: '',
        passingMarks: 0,
        totalMarks: 0
      });
    } catch (error) {
      setError(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Create Event Quiz
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quiz Title"
                name="title"
                value={quizData.title}
                onChange={handleInputChange}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={quizData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Time"
                value={quizData.startTime}
                onChange={(newValue) => {
                  setQuizData(prev => ({ ...prev, startTime: newValue }));
                }}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="End Time"
                value={quizData.endTime}
                onChange={(newValue) => {
                  setQuizData(prev => ({ ...prev, endTime: newValue }));
                }}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                name="duration"
                value={quizData.duration}
                onChange={handleInputChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Participants (0 for unlimited)"
                name="maxParticipants"
                value={quizData.maxParticipants}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography variant="subtitle2" gutterBottom>
                  Participant Type
                </Typography>
                <RadioGroup
                  name="participantType"
                  value={quizData.participantType}
                  onChange={handleInputChange}
                  row
                >
                  <FormControlLabel
                    value="college"
                    control={<Radio />}
                    label="College Students Only"
                  />
                  <FormControlLabel
                    value="any"
                    control={<Radio />}
                    label="Any College Students"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Registration Settings
              </Typography>
              <Box sx={{ ml: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={quizData.registrationEnabled}
                      onChange={(e) => {
                        setQuizData(prev => ({
                          ...prev,
                          registrationEnabled: e.target.checked
                        }));
                      }}
                    />
                  }
                  label="Enable Registration"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={quizData.spotRegistrationEnabled}
                      onChange={(e) => {
                        setQuizData(prev => ({
                          ...prev,
                          spotRegistrationEnabled: e.target.checked
                        }));
                      }}
                    />
                  }
                  label="Enable Spot Registration"
                />
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Passing Marks"
                name="passingMarks"
                value={quizData.passingMarks}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Total Marks"
                name="totalMarks"
                value={quizData.totalMarks}
                onChange={handleInputChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Instructions"
                name="instructions"
                value={quizData.instructions}
                onChange={handleInputChange}
                multiline
                rows={4}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Quiz'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventQuizCreation; 