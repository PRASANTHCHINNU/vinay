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

const ExcelQuizForm = ({ onNext, basicDetails }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(file);
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/api/quiz/preview-excel', formData);
        setPreview(response.data);
        setError('');
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to parse Excel file');
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
      if (!file) throw new Error('Please upload an Excel file');
      if (basicDetails.allowedGroups.length === 0) throw new Error('Please select at least one section');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('quizDetails', JSON.stringify(basicDetails));

      await api.post('/api/quiz/create-from-excel', formData);
      onNext();
    } catch (error) {
      setError(error.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // This should be replaced with your actual template download URL
    const templateUrl = '/templates/quiz-template.xlsx';
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
          Excel Upload Guidelines
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Required Excel Format:
          </Typography>
          <Typography variant="body2" component="div">
            Your Excel file should have the following columns:
            <ul>
              <li><strong>Question (Column A):</strong> The full question text</li>
              <li><strong>Option A (Column B):</strong> First option</li>
              <li><strong>Option B (Column C):</strong> Second option</li>
              <li><strong>Option C (Column D):</strong> Third option</li>
              <li><strong>Option D (Column E):</strong> Fourth option</li>
              <li><strong>Correct Answer (Column F):</strong> Write A, B, C, or D</li>
              <li><strong>Marks (Column G):</strong> Marks for the question (number)</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Example Format:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              Question         | Option A  | Option B  | Option C  | Option D  | Answer | Marks
              ----------------|-----------|-----------|-----------|-----------|---------|------
              What is 2+2?   | 3         | 4         | 5         | 6         | B      | 1
              Capital of US? | New York  | Boston    | DC        | Miami     | C      | 2
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Important Notes:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>First row should contain column headers</li>
              <li>Each question must have exactly 4 options</li>
              <li>Correct answer must be A, B, C, or D</li>
              <li>Marks must be a positive number</li>
              <li>Maximum file size: 5MB</li>
              <li>Supported formats: .xlsx, .xls</li>
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
          onClick={() => document.getElementById('excel-upload').click()}
        >
          <input
            type="file"
            id="excel-upload"
            hidden
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Upload Excel File
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click to upload or drag and drop your Excel file here
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

export default ExcelQuizForm; 