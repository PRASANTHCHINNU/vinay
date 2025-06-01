import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const QuizReview = () => {
  const { id, studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizData, setQuizData] = useState(null);
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // First fetch quiz details
        const quizResponse = await api.get(`/api/quiz/${id}`);
        console.log('Quiz response:', quizResponse);
        
        if (!quizResponse || !quizResponse.title) {
          throw new Error('Failed to load quiz data');
        }

        if (!isMounted) return;

        // Then fetch submission details
        let submissionResponse;
        try {
          if (user.role === 'faculty' && studentId) {
            submissionResponse = await api.get(`/api/quiz/${id}/submissions/${studentId}`);
          } else {
            submissionResponse = await api.get(`/api/quiz/${id}/submission`);
          }
          console.log('Submission response:', submissionResponse);

          if (!submissionResponse) {
            throw new Error('No submission found');
          }

          if (submissionResponse.status === 'started') {
            navigate(`/quizzes/${id}`);
            return;
          }

          if (isMounted) {
            setQuizData(quizResponse);
            setSubmission(submissionResponse);
          }
        } catch (err) {
          console.error('Error fetching submission:', err);
          throw new Error('Failed to load submission data');
        }
      } catch (error) {
        console.error('Quiz review error:', error);
        if (isMounted) {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to load quiz review';
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, studentId, user.role, navigate]);

  // Add debug logging
  useEffect(() => {
    console.log('QuizReview rendered with:', {
      quizData,
      submission,
      loading,
      error
    });
  }, [quizData, submission, loading, error]);

  const getAnswerStatus = (question, selectedOption) => {
    if (!submission?.answers) {
      console.log('No answers in submission');
      return 'not-answered';
    }
    const answer = submission.answers.find(a => a.questionId === question._id);
    if (!answer) {
      console.log(`No answer found for question ${question._id}`);
      return 'not-answered';
    }
    return answer.isCorrect ? 'correct' : 'incorrect';
  };

  if (loading) {
    console.log('Rendering loading state');
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!quizData || !submission) {
    console.log('Missing data:', { quizData, submission });
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">No quiz data or submission found.</Alert>
      </Container>
    );
  }

  console.log('Rendering quiz review with:', {
    questions: quizData?.questions?.length,
    answers: submission?.answers?.length
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" gutterBottom>
            Quiz Review: {quizData?.title || 'N/A'}
          </Typography>
          <Typography variant="h5" color="primary" gutterBottom>
            Score: {submission?.totalMarks || 0} / {quizData?.totalMarks || 0}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Subject: {quizData?.subject?.name || 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Started: {submission?.startTime ? new Date(submission.startTime).toLocaleString() : 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Submitted: {submission?.submitTime ? new Date(submission.submitTime).toLocaleString() : 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Duration: {submission?.duration ? `${submission.duration} minutes` : 'N/A'}
          </Typography>
          <Typography variant="body1" gutterBottom>
            Status: <Chip 
              label={submission?.status || 'N/A'} 
              color={
                submission?.status === 'evaluated' ? 'success' :
                submission?.status === 'started' ? 'warning' :
                submission?.status === 'submitted' ? 'primary' : 'default'
              }
              size="small"
            />
          </Typography>
          {user.role === 'faculty' && (
            <>
              <Typography variant="body1" gutterBottom>
                Student Name: {submission?.student?.name || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Admission Number: {submission?.student?.admissionNumber || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Department: {submission?.student?.department || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Year: {submission?.student?.year || 'N/A'}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Section: {submission?.student?.section || 'N/A'}
              </Typography>
            </>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {(quizData?.questions || []).map((question, index) => {
          const userAnswer = submission?.answers?.find(a => a.questionId === question._id);
          const answerStatus = getAnswerStatus(question, userAnswer?.selectedOption);

          return (
            <Paper 
              key={question._id} 
              sx={{ 
                p: 3, 
                mb: 2, 
                border: 2,
                borderColor: answerStatus === 'correct' ? 'success.main' : 
                           answerStatus === 'incorrect' ? 'error.main' : 
                           'warning.main'
              }}
            >
              <Typography variant="h6" gutterBottom>
                {index + 1}. {question.question}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Marks: {userAnswer?.marks || 0} / {question.marks || 0}
              </Typography>

              <FormControl component="fieldset" fullWidth>
                <RadioGroup value={userAnswer?.selectedOption?.toString() || ''}>
                  {(question.options || []).map((option, optionIndex) => {
                    const isCorrectAnswer = optionIndex === question.correctAnswer;
                    const isUserAnswer = optionIndex === userAnswer?.selectedOption;
                    
                    return (
                      <FormControlLabel
                        key={optionIndex}
                        value={optionIndex.toString()}
                        control={<Radio />}
                        label={
                          <Typography
                            sx={{
                              color: isCorrectAnswer ? 'success.main' : 
                                     isUserAnswer && !userAnswer?.isCorrect ? 'error.main' : 
                                     'text.primary',
                              '& span': {
                                ml: 1,
                                fontSize: '0.875rem',
                                color: 'text.secondary'
                              }
                            }}
                          >
                            {option}
                            {isCorrectAnswer && <span>(Correct Answer)</span>}
                            {isUserAnswer && !isCorrectAnswer && <span>(Your Answer)</span>}
                          </Typography>
                        }
                        sx={{ mb: 0.5 }}
                        disabled
                      />
                    );
                  })}
                </RadioGroup>
              </FormControl>

              <Box sx={{ mt: 1 }}>
                {userAnswer ? (
                  userAnswer.isCorrect ? (
                    <Typography color="success.main" variant="body2">
                      ✓ Correct! Marks: {userAnswer.marks}
                    </Typography>
                  ) : (
                    <Typography color="error.main" variant="body2">
                      ✗ Incorrect. Marks: 0
                    </Typography>
                  )
                ) : (
                  <Typography color="warning.main" variant="body2">
                    Not answered
                  </Typography>
                )}
              </Box>
            </Paper>
          );
        })}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
          >
            Back to Previous Page
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default QuizReview; 