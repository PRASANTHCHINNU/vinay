import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../config/axios';

const QuizStatistics = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizData, setQuizData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [statistics, setStatistics] = useState({
    totalSubmissions: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    submissionRate: 0,
    scoreDistribution: {
      excellent: 0, // > 90%
      good: 0,     // 70-90%
      average: 0,  // 50-70%
      poor: 0      // < 50%
    }
  });

  useEffect(() => {
    if (!quizId) {
      setError('Quiz ID is required');
      setLoading(false);
      return;
    }
    fetchQuizStatistics();
  }, [quizId]);

  const fetchQuizStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch quiz details
      const quizResponse = await api.get(`/api/quiz/${quizId}/details`);
      setQuizData(quizResponse);

      // Fetch quiz submissions
      const submissionsResponse = await api.get(`/api/quiz/${quizId}/submissions`);
      const submissionsData = submissionsResponse.submissions || [];
      setSubmissions(submissionsData);

      // Calculate statistics
      if (quizResponse && submissionsData.length > 0) {
        const totalSubmissions = submissionsData.length;
        const scores = submissionsData.map(sub => {
          const totalQuizMarks = quizResponse.totalMarks || quizResponse.questions.reduce((sum, q) => sum + q.marks, 0);
          return (sub.totalMarks / totalQuizMarks) * 100;
        }).filter(score => !isNaN(score));
        
        const stats = {
          totalSubmissions,
          averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
          highestScore: scores.length > 0 ? Math.max(...scores) : 0,
          lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
          submissionRate: (totalSubmissions / (quizResponse.totalAuthorizedStudents || 1)) * 100,
          scoreDistribution: {
            excellent: scores.filter(score => score >= 90).length,
            good: scores.filter(score => score >= 70 && score < 90).length,
            average: scores.filter(score => score >= 50 && score < 70).length,
            poor: scores.filter(score => score < 50).length
          }
        };

        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error fetching quiz statistics:', error);
      setError(error.message || 'Failed to fetch quiz statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return `${Math.round(value)}%`;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/quizzes-overview')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Error</Typography>
        </Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => fetchQuizStatistics()}>
          Retry
        </Button>
      </Container>
    );
  }

  if (!quizData) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">Quiz data not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/quizzes-overview')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">
            Quiz Statistics: {quizData?.title}
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Total Submissions</Typography>
              <Typography variant="h4">{statistics.totalSubmissions}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Average Score</Typography>
              <Typography variant="h4">{formatPercentage(statistics.averageScore)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Highest Score</Typography>
              <Typography variant="h4">{formatPercentage(statistics.highestScore)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">Submission Rate</Typography>
              <Typography variant="h4">{formatPercentage(statistics.submissionRate)}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Score Distribution */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Score Distribution</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: '#4caf50', color: 'white', textAlign: 'center' }}>
                <Typography variant="subtitle1">Excellent ({'>'}90%)</Typography>
                <Typography variant="h5">{statistics.scoreDistribution.excellent}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: '#2196f3', color: 'white', textAlign: 'center' }}>
                <Typography variant="subtitle1">Good (70-90%)</Typography>
                <Typography variant="h5">{statistics.scoreDistribution.good}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: '#ff9800', color: 'white', textAlign: 'center' }}>
                <Typography variant="subtitle1">Average (50-70%)</Typography>
                <Typography variant="h5">{statistics.scoreDistribution.average}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: '#f44336', color: 'white', textAlign: 'center' }}>
                <Typography variant="subtitle1">Poor ({'<'}50%)</Typography>
                <Typography variant="h5">{statistics.scoreDistribution.poor}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        {/* Submissions Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ p: 2 }}>Student Submissions</Typography>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Admission Number</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Year</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                  <TableCell>Submit Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission._id}>
                    <TableCell>{submission.student?.name || 'N/A'}</TableCell>
                    <TableCell>{submission.student?.admissionNumber || 'N/A'}</TableCell>
                    <TableCell>{submission.student?.department || 'N/A'}</TableCell>
                    <TableCell>{submission.student?.year || 'N/A'}</TableCell>
                    <TableCell>{submission.student?.section || 'N/A'}</TableCell>
                    <TableCell align="right">{submission.totalMarks || 0}</TableCell>
                    <TableCell align="right">
                      {formatPercentage((submission.totalMarks / (quizData.totalMarks || 1)) * 100)}
                    </TableCell>
                    <TableCell>
                      {submission.submitTime ? new Date(submission.submitTime).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
                {submissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No submissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default QuizStatistics; 