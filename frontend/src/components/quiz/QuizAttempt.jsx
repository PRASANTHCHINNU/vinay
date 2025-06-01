import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const QuizAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showScoreSummary, setShowScoreSummary] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching quiz details for ID:', id);
        
        // First fetch quiz details
        const quizResponse = await api.get(`/api/quiz/${id}`);
        if (!isMounted) return;
        
        console.log('Quiz response:', quizResponse);
        
        if (!quizResponse || !quizResponse.title) {
          throw new Error('Invalid quiz data received');
        }
        
        setQuiz(quizResponse);

        // Check for existing submission first
        try {
          console.log('Checking for existing submission');
          const existingSubmission = await api.get(`/api/quiz/${id}/submission`);
          if (!isMounted) return;

          console.log('Existing submission:', existingSubmission);

          if (existingSubmission.status === 'started') {
            // Resume the ongoing attempt
            console.log('Resuming ongoing attempt');
            setSubmission(existingSubmission);
            const endTime = new Date(existingSubmission.startTime).getTime() + quizResponse.duration * 60000;
            const now = new Date().getTime();
            const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeLeft(remainingTime);
          } else {
            // If submission is completed or evaluated, redirect to review
            console.log('Submission already completed, redirecting to review');
            navigate(`/quizzes/${id}/review`);
            return;
          }
        } catch (submissionError) {
          console.log('No existing submission found, starting new attempt');
          // No existing submission found, try to start new attempt
          try {
            const newSubmission = await api.post(`/api/quiz/${id}/start`);
            if (!isMounted) return;
            
            console.log('New submission created:', newSubmission);
            setSubmission(newSubmission);
            setTimeLeft(quizResponse.duration * 60);
          } catch (startError) {
            console.error('Error starting quiz:', startError);
            if (startError.response?.status === 400 && startError.response?.data?.message === 'Quiz already attempted') {
              console.log('Quiz already attempted, redirecting to review');
              navigate(`/quizzes/${id}/review`);
              return;
            }
            throw startError;
          }
        }
        
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error in quiz flow:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load quiz';
        setError(errorMessage);
        
        if (errorMessage === 'Quiz already attempted') {
          navigate(`/quizzes/${id}/review`);
          return;
        }
        
        setLoading(false);
      }
    };

    fetchQuiz();
    
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (submission?.startTime && quiz?.duration) {
      const endTime = new Date(submission.startTime).getTime() + quiz.duration * 60000;
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
          clearInterval(interval);
          handleSubmit();
        } else {
          setTimeLeft(Math.floor(distance / 1000));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [submission, quiz]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value, 10)
    }));
  };

  const handleSubmit = async () => {
    try {
      const submissionData = {
        answers: Object.keys(answers).map(questionId => ({
          questionId,
          selectedOption: answers[questionId]
        }))
      };

      const response = await api.post(`/api/quiz/${id}/submit`, submissionData);

      setSubmissionResult(response);
      setShowScoreSummary(true);
      setShowConfirmSubmit(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit quiz');
    }
  };

  const handleReviewQuiz = () => {
    navigate(`/quizzes/${id}/review`);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">
            {quiz.title}
          </Typography>
          <Typography variant="h6" color="primary">
            Time Left: {formatTime(timeLeft)}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={(1 - timeLeft / (quiz.duration * 60)) * 100}
          sx={{ mb: 3 }}
        />

        <Box sx={{ mb: 3 }}>
          {quiz.type === 'academic' ? (
            <>
              <Typography variant="body1" gutterBottom>
                Subject: {quiz?.subject?.name || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total Marks: {quiz?.totalMarks || 0}
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" gutterBottom>
                Event: {quiz?.eventDetails?.name || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Organizer: {quiz?.eventDetails?.organizer || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Venue: {quiz?.eventDetails?.venue || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Description: {quiz?.eventDetails?.description || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Total Marks: {quiz?.totalMarks || 0}
              </Typography>
            </>
          )}
        </Box>

        {quiz.questions.map((question, index) => (
          <Paper key={question._id} sx={{ p: 3, mb: 2, position: 'relative' }}>
            <Typography variant="h6" gutterBottom>
              {index + 1}. {question.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Marks: {question.marks}
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[question._id] !== undefined ? answers[question._id].toString() : ''}
                onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              >
                {question.options.map((option, optionIndex) => (
                  <FormControlLabel
                    key={optionIndex}
                    value={optionIndex.toString()}
                    control={<Radio />}
                    label={option}
                    sx={{ display: 'block', mb: 1 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            {answers[question._id] !== undefined && (
              <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                <Typography variant="body2" color="success.main">
                  ✓ Answered
                </Typography>
              </Box>
            )}
          </Paper>
        ))}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowConfirmSubmit(true)}
          >
            Submit Quiz
          </Button>
        </Box>
      </Paper>

      {/* Confirm Submit Dialog */}
      <Dialog
        open={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
      >
        <DialogTitle>
          Confirm Submission
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit the quiz? This action cannot be undone.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography>
              Answered: {Object.keys(answers).length} of {quiz.questions.length} questions
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmSubmit(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Score Summary Dialog */}
      <Dialog
        open={showScoreSummary}
        onClose={() => setShowScoreSummary(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Quiz Completed!
        </DialogTitle>
        <DialogContent>
          {submissionResult && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" gutterBottom>
                Your Score
              </Typography>
              <Typography variant="h2" color="primary" gutterBottom>
                {submissionResult.answers.reduce((total, ans) => total + (ans.marks || 0), 0)} / {quiz.totalMarks}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Questions Attempted: {Object.keys(answers).length} of {quiz.questions.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleReviewQuiz}
            size="large"
          >
            Review Answers
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizAttempt; 