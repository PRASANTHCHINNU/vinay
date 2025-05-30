import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Alert
} from '@mui/material';

import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    upcomingQuizzes: 0,
    completedQuizzes: 0,
    activeQuizzes: 0,
    averageScore: 0,
    submissions: []
  });
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError('');
        // Get quizzes
        const quizzesResponse = await api.get('/api/quiz');
        const quizzes = Array.isArray(quizzesResponse) ? quizzesResponse : [];

        // For students, fetch their submissions
        let submissions = [];
        if (user?.role === 'student' && quizzes.length > 0) {
          const submissionPromises = quizzes.map(quiz =>
            api.get(`/api/quiz/${quiz._id}/submission`)
              .then(res => {
                if (!res) return null;
                return {
                  quizId: quiz._id,
                  quiz: quiz,
                  ...res,
                  totalScore: Array.isArray(res.answers) 
                    ? res.answers.reduce((total, ans) => total + (Number(ans.marks) || 0), 0)
                    : 0
                };
              })
              .catch((err) => {
                // Silently handle 404 errors (no submission found)
                if (err.response?.status === 404) {
                  return {
                    quizId: quiz._id,
                    quiz: quiz,
                    status: 'not_attempted',
                    totalScore: 0
                  };
                }
                // Log other errors but don't break the dashboard
                console.error(`Error fetching submission for quiz ${quiz._id}:`, err);
                return null;
              })
          );
          
          try {
            submissions = (await Promise.all(submissionPromises))
              .filter(sub => sub !== null)
              .sort((a, b) => {
                // Sort by status (evaluated first, then not_attempted)
                if (a.status === 'evaluated' && b.status !== 'evaluated') return -1;
                if (b.status === 'evaluated' && a.status !== 'evaluated') return 1;
                // For evaluated submissions, sort by submitTime
                if (a.status === 'evaluated' && b.status === 'evaluated') {
                  return new Date(b.submitTime) - new Date(a.submitTime);
                }
                return 0;
              });
          } catch (error) {
            console.error('Error processing submissions:', error);
            submissions = [];
          }
        }

        // Calculate statistics
        const now = new Date();
        const stats = {
          totalQuizzes: quizzes.length,
          upcomingQuizzes: quizzes.filter(quiz => new Date(quiz.startTime) > now).length,
          activeQuizzes: quizzes.filter(quiz => 
            new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now
          ).length,
          completedQuizzes: submissions.filter(sub => sub.status === 'evaluated').length,
          averageScore: submissions.filter(sub => sub.status === 'evaluated').length > 0 
            ? (submissions
                .filter(sub => sub.status === 'evaluated')
                .reduce((sum, sub) => sum + (sub.totalScore || 0), 0) / 
                submissions.filter(sub => sub.status === 'evaluated').length
              ).toFixed(2)
            : 0,
          submissions: submissions
        };

        setStats(stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const StudentDashboard = () => {
    if (!user) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Welcome, {user.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.department} - Year {user.year}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admission Number: {user.admissionNumber}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Quizzes</Typography>
              <Typography variant="h4">{stats.totalQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming</Typography>
              <Typography variant="h4">{stats.upcomingQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Completed</Typography>
              <Typography variant="h4">{stats.completedQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Average Score</Typography>
              <Typography variant="h4">{Math.round(stats.averageScore)}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        {user?.role === 'student' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Submissions
              </Typography>
              {stats.submissions.length > 0 ? (
                <Grid container spacing={2}>
                  {stats.submissions.slice(0, 3).map((submission) => (
                    <Grid item xs={12} sm={4} key={submission.quizId}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {submission.quiz?.title || 'Quiz'}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            Score: {submission.totalScore || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Submitted: {new Date(submission.submitTime).toLocaleString()}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button 
                            size="small" 
                            onClick={() => navigate(`/quizzes/${submission.quizId}/review`)}
                          >
                            View Details
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  You haven't completed any quizzes yet. Check the available quizzes section to get started!
                </Alert>
              )}
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/quizzes')}
          >
            View Available Quizzes
          </Button>
        </Grid>
      </Grid>
    );
  };

  const FacultyDashboard = () => {
    if (!user) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Welcome, {user.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.department} - Faculty
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Quizzes</Typography>
              <Typography variant="h4">{stats.totalQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Upcoming</Typography>
              <Typography variant="h4">{stats.upcomingQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Active</Typography>
              <Typography variant="h4">{stats.activeQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Completed</Typography>
              <Typography variant="h4">{stats.completedQuizzes}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/quizzes/create')}
            sx={{ mr: 2 }}
          >
            Create New Quiz
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/quizzes')}
          >
            View My Quizzes
          </Button>
        </Grid>
      </Grid>
    );
  };

  const AdminDashboard = () => {
    if (!user) return null;
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Welcome, {user.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              System Administrator
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Manage Subjects</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Add, edit, or remove subjects from the system
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/subjects')}>
                View Subjects
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Admission Ranges</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Configure admission number ranges for departments
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/admin/admission-ranges')}>
                Manage Ranges
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Quiz Overview</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Monitor quiz activities across departments
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/quizzes-overview')}>
                View Quizzes
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {user.role === 'student' ? (
          <StudentDashboard />
        ) : user.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <FacultyDashboard />
        )}
      </Container>
    </Box>
  );
};

export default Dashboard; 