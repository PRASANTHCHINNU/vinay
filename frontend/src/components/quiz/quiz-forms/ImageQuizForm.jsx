import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Grid,
  CircularProgress,
  IconButton,
  Stack,
  Card,
  CardMedia,
  CardContent,
  CardActions
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../config/axios';

const ImageQuizForm = ({ onNext, basicDetails }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState(null);

  const handleImageChange = async (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => 
      file.type.match(/^image\/(jpeg|png|jpg)$/)
    );

    if (validFiles.length !== files.length) {
      setError('Please upload only image files (JPEG, PNG)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create preview URLs for the images
      const newImages = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' // pending, processing, done, error
      }));

      setImages(prev => [...prev, ...newImages]);

      // Process each image for text extraction
      for (let image of newImages) {
        try {
          const formData = new FormData();
          formData.append('image', image.file);
          const response = await api.post('/api/quiz/extract-from-image', formData);
          
          setImages(prev => prev.map(img => 
            img === image 
              ? { ...img, extractedText: response.data, status: 'done' }
              : img
          ));
        } catch (error) {
          setImages(prev => prev.map(img => 
            img === image 
              ? { ...img, status: 'error', error: error.message }
              : img
          ));
        }
      }
    } catch (error) {
      setError(error.message || 'Failed to process images');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
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
      if (images.length === 0) throw new Error('Please upload at least one image');
      if (basicDetails.allowedGroups.length === 0) throw new Error('Please select at least one section');

      // Check if all images are processed
      if (images.some(img => img.status === 'pending' || img.status === 'processing')) {
        throw new Error('Please wait for all images to be processed');
      }

      // Check if any images failed
      const failedImages = images.filter(img => img.status === 'error');
      if (failedImages.length > 0) {
        throw new Error('Some images failed to process. Please remove them and try again.');
      }

      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append(`images[${index}]`, image.file);
        formData.append(`extractedText[${index}]`, JSON.stringify(image.extractedText));
      });
      formData.append('quizDetails', JSON.stringify(basicDetails));

      await api.post('/api/quiz/create-from-images', formData);
      onNext();
    } catch (error) {
      setError(error.message || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
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
          Image Upload Guidelines
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Required Image Format:
          </Typography>
          <Typography variant="body2" component="div">
            Your image should contain questions in one of these formats:
            <ul>
              <li><strong>Format 1:</strong> Question followed by options marked A), B), C), D) with correct answer marked ✓ or *</li>
              <li><strong>Format 2:</strong> Question followed by numbered options 1), 2), 3), 4) with (correct) written next to the right answer</li>
              <li><strong>Format 3:</strong> MCQ-style layout with bubbles/boxes, correct answer clearly marked</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Example Formats:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              Format 1:
              What is the capital of Japan?
              A) Seoul
              B) Beijing
              C) Tokyo ✓
              D) Bangkok

              Format 2:
              Which is the largest planet?
              1) Mars
              2) Jupiter (correct)
              3) Venus
              4) Mercury

              Format 3:
              2 + 2 = ?
              ○ 3
              ● 4  [correct]
              ○ 5
              ○ 6
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Image Requirements:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Clear, high-resolution images</li>
              <li>Good contrast between text and background</li>
              <li>No handwritten text (unless very clear and printed)</li>
              <li>Questions and options should be clearly visible</li>
              <li>Maximum file size: 5MB per image</li>
              <li>Supported formats: JPEG, PNG</li>
            </ul>
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Best Practices:
          </Typography>
          <Typography variant="body2" component="div">
            <ul>
              <li>Scan documents at 300 DPI or higher</li>
              <li>Ensure proper lighting when taking photos</li>
              <li>Avoid shadows and glare on the image</li>
              <li>Crop images to show only the questions</li>
              <li>Keep the image orientation correct (not rotated)</li>
            </ul>
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Tip: For best results, use scanned documents rather than photos. If using photos, ensure good lighting and focus.
          </Typography>
        </Alert>
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
          onClick={() => document.getElementById('image-upload').click()}
        >
          <input
            type="file"
            id="image-upload"
            hidden
            accept="image/jpeg,image/png"
            multiple
            onChange={handleImageChange}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Upload Images
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click to upload or drag and drop your images here
          </Typography>
        </Box>

        {images.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Uploaded Images
            </Typography>
            <Grid container spacing={2}>
              {images.map((image, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="140"
                      image={image.preview}
                      alt={`Question ${index + 1}`}
                    />
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Status: {image.status}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                      {image.status === 'error' && (
                        <Typography variant="body2" color="error">
                          {image.error}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="contained"
          onClick={onNext}
          disabled={loading || images.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};

export default ImageQuizForm; 