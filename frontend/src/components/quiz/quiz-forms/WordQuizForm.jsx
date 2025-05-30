import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Grid,
  CircularProgress,
  Link
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../config/axios';

const WordQuizForm = ({ onNext, basicDetails }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(docx|doc)$/)) {
        setError('Please upload a Word document (.docx or .doc)');
        return;
      }
      setFile(file);
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/api/quiz/preview-word', formData);
        setPreview(response.data);
        setError('');
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to parse Word document');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate basic details
      if (!basicDetails.title) throw new Error('Quiz title is required');
      if (!basicDetails.subject) throw new Error('Subject is required');
      if (!basicDetails.duration) throw new Error('Duration is required');
      if (!basicDetails.startTime) throw new Error('Start time is required');
      if (!basicDetails.endTime) throw new Error('End time is required');
      if (!file) throw new Error('Please upload a Word document');
      if (basicDetails.allowedGroups.length === 0) throw new Error('Please select at least one section');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('quizDetails', JSON.stringify(basicDetails));

      await api.post('/api/quiz/create-from-word', formData);
      onNext();
    } catch (error) {
      setError(error.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // This should be replaced with your actual template download URL
    const templateUrl = '/templates/quiz-template.docx';
    window.open(templateUrl, '_blank');
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Word Document Format Guidelines
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Required Format:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li><strong>Question Format:</strong> Start each question with Q1:, Q2:, etc.</li>
              <li><strong>Options Format:</strong> List options as A), B), C), D) under each question</li>
              <li><strong>Correct Answer:</strong> Mark with * at the end of the correct option</li>
              <li><strong>Marks:</strong> Add [X marks] at the end of each question</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Example Format:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              Q1: What is the capital of France? [2 marks]
              A) London
              B) Berlin
              C) Paris *
              D) Madrid

              Q2: Which planet is known as the Red Planet? [1 mark]
              A) Venus
              B) Mars *
              C) Jupiter
              D) Saturn
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Important Notes:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Each question must be clearly numbered (Q1:, Q2:, etc.)</li>
              <li>Each question must have exactly 4 options</li>
              <li>Mark only one option as correct using *</li>
              <li>Include marks in square brackets [X marks]</li>
              <li>Leave a blank line between questions</li>
              <li>Maximum file size: 5MB</li>
              <li>Supported formats: .docx, .doc</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Formatting Tips:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Use standard fonts (Times New Roman, Arial)</li>
              <li>Avoid using tables, text boxes, or special formatting</li>
              <li>Keep formatting simple and consistent</li>
              <li>Images and diagrams are not supported in Word format</li>
            </ul>
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            p: 3,
            textAlign: 'center',
            cursor: 'pointer',
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
          onClick={() => document.getElementById('word-upload').click()}
        >
          <input
            type="file"
            id="word-upload"
            hidden
            accept=".docx,.doc"
            onChange={handleFileChange}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Upload Word Document
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click to upload or drag and drop your Word document here
          </Typography>
          {file && (
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              Selected file: {file.name}
            </Typography>
          )}
        </Box>

        {preview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Preview
            </Typography>
            <Typography variant="body2">
              Total Questions: {preview.totalQuestions}
            </Typography>
            <Typography variant="body2">
              Total Marks: {preview.totalMarks}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          onClick={onNext}
          disabled={loading || !file}
        >
          {loading ? <CircularProgress size={24} /> : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default WordQuizForm; 