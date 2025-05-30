import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import * as XLSX from 'xlsx';

const EventQuizRegistrations = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRegistrations();
  }, [id]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const [quizResponse, registrationsResponse] = await Promise.all([
        api.get(`/api/event-quiz/${id}`),
        api.get(`/api/event-quiz/${id}/registrations`)
      ]);
      
      setQuiz(quizResponse.data);
      setRegistrations(registrationsResponse.data);
    } catch (error) {
      setError('Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    const data = registrations.map((reg, index) => ({
      'S.No': index + 1,
      'Name': reg.name,
      'Email': reg.email,
      'College': reg.college,
      'Department': reg.department,
      'Year': reg.year,
      'Registration Type': reg.isSpotRegistration ? 'Spot' : 'Online',
      'Registered At': new Date(reg.registeredAt).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
    
    // Auto-size columns
    const colWidths = data.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const length = row[key]?.toString().length || 0;
        acc[key] = Math.max(acc[key] || 0, length);
      });
      return acc;
    }, {});
    
    ws['!cols'] = Object.values(colWidths).map(width => ({ width }));

    XLSX.writeFile(wb, `${quiz.title}_registrations.xlsx`);
  };

  const filteredRegistrations = registrations.filter(reg => 
    reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            {quiz?.title} - Registrations
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportToExcel}
            disabled={registrations.length === 0}
          >
            Export to Excel
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by name, email, college, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S.No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>College</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Registration Type</TableCell>
                <TableCell>Registered At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRegistrations.map((reg, index) => (
                <TableRow key={reg._id || index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{reg.name}</TableCell>
                  <TableCell>{reg.email}</TableCell>
                  <TableCell>{reg.college}</TableCell>
                  <TableCell>{reg.department}</TableCell>
                  <TableCell>{reg.year}</TableCell>
                  <TableCell>
                    {reg.isSpotRegistration ? 'Spot' : 'Online'}
                  </TableCell>
                  <TableCell>
                    {new Date(reg.registeredAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Send Email">
                      <IconButton
                        size="small"
                        onClick={() => window.location.href = `mailto:${reg.email}`}
                      >
                        <EmailIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRegistrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No registrations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Total Registrations: {registrations.length}
            {quiz?.maxParticipants > 0 && ` / ${quiz.maxParticipants}`}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventQuizRegistrations; 