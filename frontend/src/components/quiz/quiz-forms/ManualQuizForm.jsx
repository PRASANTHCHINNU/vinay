import { useState, useCallback, memo } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Paper,
  Typography,
  IconButton,
  Radio,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../../config/axios';

// Create a memoized Question component
const Question = memo(({ 
  question, 
  questionIndex, 
  onQuestionChange, 
  onOptionChange, 
  onRemove, 
  isReview 
}) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    <Grid container spacing={2}>
      <Grid item xs={11}>
        <TextField
          fullWidth
          label={`Question ${questionIndex + 1}`}
          value={question.question}
          onChange={(e) => onQuestionChange(questionIndex, 'question', e.target.value)}
          required
          disabled={isReview}
        />
      </Grid>
      <Grid item xs={1}>
        {!isReview && (
          <IconButton
            color="error"
            onClick={() => onRemove(questionIndex)}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Grid>

      {question.options.map((option, optionIndex) => (
        <Grid item xs={12} sm={6} key={optionIndex}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Radio
              checked={question.correctAnswer === optionIndex}
              onChange={() => onQuestionChange(questionIndex, 'correctAnswer', optionIndex)}
              value={optionIndex}
              disabled={isReview}
            />
            <TextField
              fullWidth
              label={`Option ${optionIndex + 1}`}
              value={option}
              onChange={(e) => onOptionChange(questionIndex, optionIndex, e.target.value)}
              required
              disabled={isReview}
            />
          </Box>
        </Grid>
      ))}

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Marks"
          value={question.marks}
          onChange={(e) => onQuestionChange(questionIndex, 'marks', Number(e.target.value))}
          required
          inputProps={{ min: 1 }}
          disabled={isReview}
        />
      </Grid>
    </Grid>
  </Paper>
));

Question.displayName = 'Question';

const ManualQuizForm = ({ 
  onNext, 
  questions, 
  onQuestionsUpdate,
  isReview,
  error,
  setError
}) => {
  const [loading, setLoading] = useState(false);

  const handleQuestionChange = useCallback((index, field, value) => {
    if (isReview) return;
    
    onQuestionsUpdate(questions.map((q, i) => {
      if (i === index) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  }, [questions, onQuestionsUpdate, isReview]);

  const handleOptionChange = useCallback((questionIndex, optionIndex, value) => {
    if (isReview) return;
    
    onQuestionsUpdate(questions.map((q, i) => {
      if (i === questionIndex) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  }, [questions, onQuestionsUpdate, isReview]);

  const addQuestion = useCallback(() => {
    if (isReview) return;
    
    onQuestionsUpdate([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: 1
      }
    ]);
  }, [questions, onQuestionsUpdate, isReview]);

  const removeQuestion = useCallback((index) => {
    if (isReview) return;
    
    if (questions.length > 1) {
      onQuestionsUpdate(questions.filter((_, i) => i !== index));
    }
  }, [questions, onQuestionsUpdate, isReview]);

  const handleNext = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate questions
      questions.forEach((q, i) => {
        if (!q.question) throw new Error(`Question ${i + 1} is empty`);
        if (q.options.some(opt => !opt)) throw new Error(`All options for question ${i + 1} are required`);
        if (!q.marks) throw new Error(`Marks for question ${i + 1} are required`);
      });

      // Call onNext if validation passes
      onNext();
    } catch (error) {
      setError(error.message || 'Please fill in all required fields');
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

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {!isReview && (
            <Typography variant="h6" gutterBottom>
              Questions
            </Typography>
          )}
          
          {questions.map((question, index) => (
            <Question
              key={index}
              question={question}
              questionIndex={index}
              onQuestionChange={handleQuestionChange}
              onOptionChange={handleOptionChange}
              onRemove={removeQuestion}
              isReview={isReview}
            />
          ))}

          {!isReview && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addQuestion}
            >
              Add Question
            </Button>
          )}
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Next'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default memo(ManualQuizForm); 