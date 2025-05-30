import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../../config/axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalSubmissions: 0,
    activeQuizzes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/stats');
        console.log('Admin stats response:', response);
        
        // Ensure we have default values for all stats
        setStats({
          totalUsers: response?.totalUsers || 0,
          totalQuizzes: response?.totalQuizzes || 0,
          totalSubmissions: response?.totalSubmissions || 0,
          activeQuizzes: response?.activeQuizzes || 0
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to fetch dashboard statistics');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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

  const StatCard = ({ title, value }) => (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        borderRadius: 2,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        {value}
      </Typography>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Admin Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Users" value={stats.totalUsers} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Quizzes" value={stats.totalQuizzes} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Submissions" value={stats.totalSubmissions} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Quizzes" value={stats.activeQuizzes} />
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard; 