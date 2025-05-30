import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../config/axios';

const ResultAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    subject: '',
    year: '',
    quizType: 'all'
  });
  const [results, setResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    fetchResults();
  }, [filters]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/results/analysis', {
        params: filters
      });
      setResults(response.data.results);
      setStatistics(response.data.statistics);
      setError('');
    } catch (err) {
      setError('Failed to fetch results');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/api/admin/results/export?format=${format}`, {
        params: filters,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `results.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(`Failed to export results as ${format}`);
    }
  };

  const renderBarChart = () => {
    if (!statistics?.performanceDistribution) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={statistics.performanceDistribution}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" />
          <YAxis />
          <ChartTooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" name="Students" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    if (!statistics?.gradeDistribution) return null;

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF0000'];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={statistics.gradeDistribution}
            dataKey="count"
            nameKey="grade"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            label
          >
            {statistics.gradeDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ChartTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Result Analysis
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    label="Department"
                  >
                    <MenuItem value="">All</MenuItem>
                    {/* Add departments dynamically */}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    value={filters.subject}
                    onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                    label="Subject"
                  >
                    <MenuItem value="">All</MenuItem>
                    {/* Add subjects dynamically */}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    label="Year"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="1">1st Year</MenuItem>
                    <MenuItem value="2">2nd Year</MenuItem>
                    <MenuItem value="3">3rd Year</MenuItem>
                    <MenuItem value="4">4th Year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Quiz Type</InputLabel>
                  <Select
                    value={filters.quizType}
                    onChange={(e) => setFilters({ ...filters, quizType: e.target.value })}
                    label="Quiz Type"
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="academic">Academic</MenuItem>
                    <MenuItem value="event">Event</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {statistics && (
          <>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Performance Distribution</Typography>
                  <Box>
                    <Tooltip title="Bar Chart">
                      <IconButton
                        color={chartType === 'bar' ? 'primary' : 'default'}
                        onClick={() => setChartType('bar')}
                      >
                        <BarChartIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Pie Chart">
                      <IconButton
                        color={chartType === 'pie' ? 'primary' : 'default'}
                        onClick={() => setChartType('pie')}
                      >
                        <PieChartIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                {chartType === 'bar' ? renderBarChart() : renderPieChart()}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Summary Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Average Score
                    </Typography>
                    <Typography variant="h6">
                      {statistics.averageScore.toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Highest Score
                    </Typography>
                    <Typography variant="h6">
                      {statistics.highestScore.toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Pass Rate
                    </Typography>
                    <Typography variant="h6">
                      {statistics.passRate.toFixed(2)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Participants
                    </Typography>
                    <Typography variant="h6">
                      {statistics.totalParticipants}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Detailed Results</Typography>
              <Box>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('xlsx')}
                  sx={{ mr: 1 }}
                >
                  Export Excel
                </Button>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExport('pdf')}
                >
                  Export PDF
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Quiz Title</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Percentage</TableCell>
                    <TableCell>Time Taken</TableCell>
                    <TableCell>Submission Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result._id}>
                      <TableCell>{result.studentName}</TableCell>
                      <TableCell>{result.quizTitle}</TableCell>
                      <TableCell>{result.subject}</TableCell>
                      <TableCell>{result.score}/{result.totalMarks}</TableCell>
                      <TableCell>{((result.score/result.totalMarks) * 100).toFixed(2)}%</TableCell>
                      <TableCell>{result.timeTaken} mins</TableCell>
                      <TableCell>{new Date(result.submittedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ResultAnalysis; 