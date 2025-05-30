import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  Chip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import HelpIcon from '@mui/icons-material/Help';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const QuizFileUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadType, setUploadType] = useState('excel');
  const [quizData, setQuizData] = useState({
    title: '',
    subject: '',
    duration: 30,
    startTime: '',
    endTime: '',
    allowedSections: []
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      console.log('Fetching subjects...');
      const response = await api.get('/api/subject');
      console.log('Subjects response:', response);
      
      // Ensure response is an array
      const subjectsData = Array.isArray(response) ? response : [];
      console.log('Processed subjects data:', subjectsData);
      
      setSubjects(subjectsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError('Failed to fetch subjects. Please try again later.');
      setSubjects([]); // Set empty array on error
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuizData(prev => ({
      ...prev,
      [name]: name === 'allowedSections' ? Array.isArray(value) ? value : [value] : value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('Selected file:', selectedFile);
    
    if (selectedFile) {
      if (uploadType === 'excel') {
        const validTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ];
        
        if (!validTypes.includes(selectedFile.type)) {
          setError('Please upload only Excel files (.xlsx or .xls)');
          setFile(null);
          e.target.value = ''; // Reset file input
          return;
        }
      } else {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        
        if (!validTypes.includes(selectedFile.type)) {
          setError('Please upload only image files (JPEG, PNG, or GIF)');
          setFile(null);
          e.target.value = ''; // Reset file input
          return;
        }
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB');
        setFile(null);
        e.target.value = ''; // Reset file input
        return;
      }

      console.log('File validation passed, setting file:', selectedFile);
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Add validation for sections
      if (!quizData.allowedSections || quizData.allowedSections.length === 0) {
        setError('Please select at least one section');
        setLoading(false);
        return;
      }

      // Validate file
      if (!file) {
        setError('Please select a file');
        setLoading(false);
        return;
      }

      // Validate form data
      if (!quizData.title.trim()) {
        setError('Quiz title is required');
        setLoading(false);
        return;
      }

      if (!quizData.subject) {
        setError('Subject is required');
        setLoading(false);
        return;
      }

      if (!quizData.duration || quizData.duration < 1) {
        setError('Duration must be at least 1 minute');
        setLoading(false);
        return;
      }

      if (!quizData.startTime || !quizData.endTime) {
        setError('Start time and end time are required');
        setLoading(false);
        return;
      }

      const startTime = new Date(quizData.startTime);
      const endTime = new Date(quizData.endTime);

      if (endTime <= startTime) {
        setError('End time must be after start time');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', quizData.title.trim());
      formData.append('subject', quizData.subject);
      formData.append('duration', String(quizData.duration));
      formData.append('startTime', startTime.toISOString());
      formData.append('endTime', endTime.toISOString());

      // Create allowedGroups array with selected sections only
      const allowedGroups = [1, 2, 3, 4].flatMap(year =>
        ['Computer Science'].flatMap(department =>
          quizData.allowedSections.map(section => ({
            year,
            department,
            section
          }))
        )
      );

      formData.append('allowedGroups', JSON.stringify(allowedGroups));

      // Log FormData contents for debugging
      console.log('File being uploaded:', file);
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }

      const endpoint = uploadType === 'excel' ? '/quiz/upload/excel' : '/quiz/upload/image';
      
      // Make API request with proper headers
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      console.log('Server response:', response);
      navigate('/quizzes');
    } catch (error) {
      console.error('Error creating quiz:', error);
      const errorData = error.response?.data;
      let errorMessage = 'Failed to create quiz';

      if (errorData) {
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: theme.palette.grey[100],
      py: 4
    }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/quizzes/create')} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1">
            Create Quiz from File
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 },
            borderRadius: 2,
            backgroundColor: 'white'
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={uploadType}
              onChange={(e, newValue) => setUploadType(newValue)}
              variant={isMobile ? "fullWidth" : "standard"}
              sx={{ mb: 1 }}
            >
              <Tab 
                value="excel" 
                label="Excel Upload" 
                icon={uploadType === 'excel' ? <DownloadIcon /> : null}
                iconPosition="start"
              />
              <Tab 
                value="image" 
                label="Image Upload" 
                icon={uploadType === 'image' ? <CloudUploadIcon /> : null}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Quiz Title"
                  name="title"
                  value={quizData.title}
                  onChange={handleInputChange}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Subject</InputLabel>
                  <Select
                    name="subject"
                    value={quizData.subject}
                    onChange={handleInputChange}
                    label="Subject"
                  >
                    {subjects.length === 0 ? (
                      <MenuItem disabled value="">
                        No subjects available. Please add subjects first.
                      </MenuItem>
                    ) : (
                      subjects.map((subject) => (
                        <MenuItem key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {subjects.length === 0 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      No subjects are available. Please contact an administrator to add subjects.
                    </Alert>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  required
                  fullWidth
                  type="number"
                  label="Duration (minutes)"
                  name="duration"
                  value={quizData.duration}
                  onChange={handleInputChange}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  required
                  fullWidth
                  type="datetime-local"
                  label="Start Time"
                  name="startTime"
                  value={quizData.startTime}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  required
                  fullWidth
                  type="datetime-local"
                  label="End Time"
                  name="endTime"
                  value={quizData.endTime}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth required variant="outlined">
                  <InputLabel id="allowed-sections-label">Sections</InputLabel>
                  <Select
                    labelId="allowed-sections-label"
                    multiple
                    name="allowedSections"
                    value={quizData.allowedSections}
                    onChange={handleInputChange}
                    label="Sections"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={`Section ${value}`} />
                        ))}
                      </Box>
                    )}
                  >
                    {SECTIONS.map((section) => (
                      <MenuItem key={section} value={section}>
                        Section {section}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    border: `2px dashed ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    p: 4,
                    backgroundColor: theme.palette.grey[50],
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: theme.palette.grey[100],
                      borderColor: theme.palette.primary.dark
                    }
                  }}
                >
                  <input
                    type="file"
                    accept={uploadType === 'excel' ? '.xlsx,.xls' : 'image/*'}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="quiz-file-upload"
                  />
                  <label htmlFor="quiz-file-upload">
                    <Button
                      component="span"
                      variant="contained"
                      startIcon={uploadType === 'excel' ? <DownloadIcon /> : <CloudUploadIcon />}
                      size="large"
                      sx={{ mb: 2 }}
                    >
                      Upload {uploadType === 'excel' ? 'Excel File' : 'Image'}
                    </Button>
                  </label>
                  {file && (
                    <Typography variant="body1" sx={{ mt: 2, color: 'success.main' }}>
                      Selected file: {file.name}
                    </Typography>
                  )}
                </Box>
                {uploadType === 'image' && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      Image should contain clearly visible questions and options
                      <Tooltip title={
                        <Box sx={{ p: 1 }}>
                          <Typography variant="body2" gutterBottom>Format your image with:</Typography>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            <li>Clear question text (ending with ?)</li>
                            <li>Options starting with A), B), C), D) or 1), 2), 3), 4)</li>
                            <li>Mark correct answer with (correct), ✓, or *</li>
                          </ul>
                        </Box>
                      } arrow>
                        <IconButton size="small" color="primary">
                          <HelpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2,
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'flex-end',
                  mt: 2
                }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/quizzes')}
                    fullWidth={isMobile}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !file}
                    fullWidth={isMobile}
                    sx={{ minWidth: isMobile ? '100%' : '200px' }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        {uploadType === 'excel' ? 'Creating Quiz...' : 'Processing Image...'}
                      </>
                    ) : (
                      'Create Quiz'
                    )}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default QuizFileUpload; 