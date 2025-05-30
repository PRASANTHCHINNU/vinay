import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  OutlinedInput,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const YEARS = [1, 2, 3, 4];
const SEMESTERS = ['1', '2'];

const QuizEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicStructure, setAcademicStructure] = useState(null);
  const [filters, setFilters] = useState({
    year: '',
    department: '',
    semester: '',
    sections: []
  });

  const [quiz, setQuiz] = useState({
    title: '',
    subject: '',
    duration: 30,
    startTime: '',
    endTime: '',
    questions: [
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: 1
      }
    ],
    allowedGroups: [],
    year: '',
    semester: '',
    department: ''
  });

  // Fetch faculty structure on mount
  useEffect(() => {
    const fetchFacultyStructure = async () => {
      try {
        const response = await api.get('/api/academic-details/faculty-structure');
        console.log('Faculty structure:', response.data);
        setAcademicStructure(response.data || {});
        // Set available departments based on faculty permissions
        const facultyDepts = Object.keys(response.data || {});
        setDepartments(facultyDepts);
      } catch (error) {
        console.error('Error fetching faculty structure:', error);
      }
    };
    fetchFacultyStructure();
  }, []);

  // Update subjects from academic structure
  useEffect(() => {
    if (!quiz.department || !quiz.year || !quiz.semester || !academicStructure) {
      setSubjects([]);
      return;
    }

    try {
      const semesterData = academicStructure[quiz.department]?.years[quiz.year]?.semesters[quiz.semester];
      if (semesterData?.subjects && Array.isArray(semesterData.subjects)) {
        console.log('Setting subjects from academic structure:', semesterData.subjects);
        setSubjects(semesterData.subjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error getting subjects:', error);
      setSubjects([]);
    }
  }, [quiz.department, quiz.year, quiz.semester, academicStructure]);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      console.log('Fetching quiz with ID:', id);
      const response = await api.get(`/api/quiz/${id}`);
      console.log('Quiz data received:', response);
      
      // Helper function to safely format date
      const formatDate = (dateString) => {
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().slice(0, 16);
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      // Get department, year, semester, and sections from allowedGroups
      const firstGroup = response.allowedGroups?.[0] || {};
      const sections = response.allowedGroups?.map(group => group.section) || [];

      // Format quiz data
      const formattedQuiz = {
        ...response,
        title: response.title || '',
        startTime: formatDate(response.startTime),
        endTime: formatDate(response.endTime),
        questions: response.questions?.length ? response.questions : [{
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1
        }],
        department: firstGroup.department || '',
        year: firstGroup.year || '',
        semester: firstGroup.semester || '',
        sections: sections,
        subject: response.subject?.code || response.subject || ''
      };
      
      console.log('Formatted quiz data:', formattedQuiz);
      setQuiz(formattedQuiz);
      
      // Update filters with quiz data
      setFilters({
        department: firstGroup.department || '',
        year: firstGroup.year || '',
        semester: firstGroup.semester || '',
        sections: sections
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setError('Failed to load quiz');
      setLoading(false);
    }
  };

  const handleBasicDetailsChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'subject') {
      // Find the full subject data
      const selectedSubject = subjects.find(s => s.code === value);
      if (selectedSubject) {
        setQuiz(prev => ({
          ...prev,
          subject: {
            code: selectedSubject.code,
            name: selectedSubject.name
          }
        }));
      }
    } else {
      setQuiz(prev => ({
        ...prev,
        [name]: value,
        // Clear subject when year, semester, or department changes
        subject: ['year', 'semester', 'department'].includes(name) ? '' : prev.subject
      }));
    }
  };

  const handleMultiSelectChange = (e, field) => {
    const { value } = e.target;
    setQuiz(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          return { ...q, [field]: value };
        }
        return q;
      })
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    }));
  };

  const addQuestion = () => {
    setQuiz(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    if (quiz.questions.length > 1) {
      setQuiz(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      // Validate required fields
      if (!quiz.title || !quiz.subject || !quiz.duration || !quiz.startTime || !quiz.endTime) {
        setError('Please fill in all required fields');
        return;
      }

      // Find the full subject data
      const subjectData = subjects.find(s => s.code === quiz.subject || s.code === quiz.subject.code);
      if (!subjectData) {
        setError('Invalid subject selected');
        return;
      }

      // Create allowed groups from sections
      const allowedGroups = quiz.sections.map(section => ({
        department: quiz.department,
        year: parseInt(quiz.year),
        semester: parseInt(quiz.semester),
        section
      }));

      // Prepare quiz data for submission
      const quizData = {
        ...quiz,
        subject: {
          code: subjectData.code,
          name: subjectData.name
        },
        allowedGroups
      };

      // Remove unnecessary fields
      delete quizData.sections;
      delete quizData.department;
      delete quizData.year;
      delete quizData.semester;

      console.log('Submitting quiz data:', quizData);

      const response = await api.put(`/api/quiz/${id}`, quizData);
      console.log('Quiz updated successfully:', response.data);
      
      setSuccess('Quiz updated successfully');
      setTimeout(() => {
        navigate('/quiz/list');
      }, 2000);
    } catch (error) {
      console.error('Error updating quiz:', error);
      setError(error.response?.data?.message || 'Failed to update quiz');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    setQuiz(prev => ({
      ...prev,
      [name]: value,
      // Clear subject when year or semester changes
      subject: name === 'year' || name === 'semester' ? '' : prev.subject
    }));
  };

  const getAvailableYears = (department) => {
    if (!department || !academicStructure) return YEARS;
    if (user.role === 'faculty') {
      const deptData = academicStructure[department];
      if (!deptData) return YEARS;

      // If years is an array
      if (Array.isArray(deptData.years)) {
        return deptData.years.map(y => typeof y === 'object' ? y.year : y);
      }
      
      // If years is an object with numeric keys
      if (typeof deptData.years === 'object') {
        return Object.keys(deptData.years).map(Number).filter(y => !isNaN(y));
      }

      return YEARS;
    }
    return YEARS;
  };

  const getAvailableSemesters = (department, year) => {
    if (!department || !year || !academicStructure) return SEMESTERS;
    if (user.role === 'faculty') {
      const deptData = academicStructure[department];
      if (!deptData || !deptData.years) return SEMESTERS;

      // If years is an array
      if (Array.isArray(deptData.years)) {
        const yearData = deptData.years.find(y => 
          (typeof y === 'object' && y.year === parseInt(year)) || y === parseInt(year)
        );
        if (yearData && Array.isArray(yearData.semesters)) {
          return yearData.semesters.map(s => typeof s === 'object' ? s.semester : s);
        }
      }
      
      // If years is an object with numeric keys
      if (typeof deptData.years === 'object') {
        const yearData = deptData.years[year];
        if (yearData && Array.isArray(yearData.semesters)) {
          return yearData.semesters.map(s => typeof s === 'object' ? s.semester : s);
        }
      }

      return SEMESTERS;
    }
    return SEMESTERS;
  };

  const getAvailableSections = (department, year, semester) => {
    if (!department || !year || !semester || !academicStructure) return SECTIONS;
    if (user.role === 'faculty') {
      const deptData = academicStructure[department];
      if (!deptData || !deptData.years) return SECTIONS;

      // If years is an array
      if (Array.isArray(deptData.years)) {
        const yearData = deptData.years.find(y => 
          (typeof y === 'object' && y.year === parseInt(year)) || y === parseInt(year)
        );
        if (yearData && Array.isArray(yearData.semesters)) {
          const semesterData = yearData.semesters.find(s =>
            (typeof s === 'object' && s.semester === parseInt(semester)) || s === parseInt(semester)
          );
          if (semesterData && Array.isArray(semesterData.sections)) {
            return semesterData.sections;
          }
        }
      }
      
      // If years is an object with numeric keys
      if (typeof deptData.years === 'object') {
        const yearData = deptData.years[year];
        if (yearData && Array.isArray(yearData.semesters)) {
          const semesterData = yearData.semesters.find(s =>
            (typeof s === 'object' && s.semester === parseInt(semester)) || s === parseInt(semester)
          );
          if (semesterData && Array.isArray(semesterData.sections)) {
            return semesterData.sections;
          }
        }
      }

      return SECTIONS;
    }
    return SECTIONS;
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
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Edit Quiz</Typography>
        </Box>

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Quiz Title"
                name="title"
                value={quiz.title}
                onChange={handleBasicDetailsChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={quiz.department}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'department', value: e.target.value }
                  })}
                  required
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={quiz.year}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'year', value: e.target.value }
                  })}
                  required
                >
                  {getAvailableYears(quiz.department).map(year => (
                    <MenuItem key={year} value={year}>
                      Year {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select
                  value={quiz.semester}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'semester', value: e.target.value }
                  })}
                  required
                >
                  {getAvailableSemesters(quiz.department, quiz.year).map(sem => (
                    <MenuItem key={sem} value={sem}>
                      Semester {sem}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Sections</InputLabel>
                <Select
                  multiple
                  value={quiz.sections || []}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'sections', value: e.target.value }
                  })}
                  input={<OutlinedInput label="Sections" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  required
                >
                  {getAvailableSections(quiz.department, quiz.year, quiz.semester).map(section => (
                    <MenuItem key={section} value={section}>
                      Section {section}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Duration (minutes)"
                name="duration"
                value={quiz.duration}
                onChange={handleBasicDetailsChange}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="Start Time"
                name="startTime"
                value={quiz.startTime}
                onChange={handleBasicDetailsChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="End Time"
                name="endTime"
                value={quiz.endTime}
                onChange={handleBasicDetailsChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Subject</InputLabel>
                <Select
                  name="subject"
                  value={quiz.subject?.code || quiz.subject || ''}
                  onChange={handleBasicDetailsChange}
                  label="Subject"
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject.code} value={subject.code}>
                      {subject.name} ({subject.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Questions</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addQuestion}
          >
            Add Question
          </Button>
        </Box>

        {(quiz.questions || []).map((question, questionIndex) => (
          <Card key={questionIndex} sx={{ mb: 3, position: 'relative' }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={11}>
                  <TextField
                    required
                    fullWidth
                    label={`Question ${questionIndex + 1}`}
                    value={question.question}
                    onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={1}>
                  <IconButton
                    color="error"
                    onClick={() => removeQuestion(questionIndex)}
                    disabled={quiz.questions.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Options
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      value={question.correctAnswer}
                      onChange={(e) => handleQuestionChange(questionIndex, 'correctAnswer', parseInt(e.target.value))}
                    >
                      {question.options.map((option, optionIndex) => (
                        <Box key={optionIndex} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <FormControlLabel
                            value={optionIndex}
                            control={<Radio />}
                            label=""
                          />
                          <TextField
                            required
                            fullWidth
                            label={`Option ${optionIndex + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                            size="small"
                          />
                        </Box>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Marks"
                    value={question.marks}
                    onChange={(e) => handleQuestionChange(questionIndex, 'marks', parseInt(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/quizzes')}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default QuizEdit; 