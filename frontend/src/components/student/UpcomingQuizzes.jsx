import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SubjectIcon from '@mui/icons-material/Subject';
import TimerIcon from '@mui/icons-material/Timer';

const UpcomingQuizzes = () => {
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get('/api/quiz');
        const now = new Date();
        // Filter for upcoming quizzes (start time is in the future)
        const upcoming = response.data.filter(quiz => new Date(quiz.startTime) > now);
        setUpcomingQuizzes(upcoming);
      } catch (error) {
        console.error('Error fetching upcoming quizzes:', error);
      }
    };

    fetchQuizzes();
    // Refresh every minute to update status
    const interval = setInterval(fetchQuizzes, 60000);
    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start - now;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Upcoming Quizzes
      </Typography>
      
      {upcomingQuizzes.length === 0 ? (
        <Typography variant="body1" color="textSecondary">
          No upcoming quizzes scheduled.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {upcomingQuizzes.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6,
                    cursor: 'pointer'
                  }
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {quiz.title}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      icon={<SubjectIcon />}
                      label={quiz.subject.name || quiz.subject}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip 
                      icon={<TimerIcon />}
                      label={`${quiz.duration} minutes`}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccessTimeIcon sx={{ mr: 1, fontSize: 'small' }} />
                    <Typography variant="body2">
                      Starts: {format(new Date(quiz.startTime), 'MMM d, yyyy h:mm a')}
                    </Typography>
                  </Box>

                  <Typography 
                    variant="subtitle2" 
                    color="primary"
                    sx={{ mt: 1 }}
                  >
                    {getTimeRemaining(quiz.startTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default UpcomingQuizzes; 