import { useState, useEffect } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const response = await api.get('/api/auth/check-admin');
        setShowAdminButton(!response.adminExists);
      } catch (error) {
        console.error('Error checking admin existence:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminExists();
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <Box 
        sx={{ 
          bgcolor: 'white', 
          color: 'black', 
          boxShadow: 1,
          py: 2,
          px: 3
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: 'lg',
          mx: 'auto'
        }}>
          {/* Left - Quiz Platform Title */}
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            Quiz Platform
          </Typography>

          {/* Center - College Name */}
          <Typography variant="h5" component="div" sx={{ 
            fontWeight: 'bold', 
            textAlign: 'center',
            display: { xs: 'none', md: 'block' }
          }}>
            R.V.R & J.C. COLLEGE OF ENGINEERING
          </Typography>

          {/* Right - Contact Info */}
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2">
              Contact: +91 877-2236711
            </Typography>
            <Typography variant="body2">
              Email: info@svec.edu.in
            </Typography>
          </Box>
        </Box>
        
        {/* Mobile College Name */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold', 
            textAlign: 'center',
            mt: 1,
            display: { xs: 'block', md: 'none' }
          }}
        >
          R.V.R & J.C. COLLEGE OF ENGINEERING
        </Typography>
      </Box>

      {/* Main Content */}
      <Container 
        component="main" 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8
        }}
      >
        <Paper 
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            maxWidth: 400,
            width: '100%'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom textAlign="center">
            Welcome to Quiz Platform
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => navigate('/login')}
            sx={{ py: 1.5 }}
          >
            Login
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            size="large"
            fullWidth
            onClick={() => navigate('/events')}
            sx={{ py: 1.5 }}
          >
            View Events
          </Button>

          {showAdminButton && !loading && (
            <Button
              variant="contained"
              color="secondary"
              size="large"
              fullWidth
              onClick={() => navigate('/register?role=admin')}
              sx={{ py: 1.5 }}
            >
              Register as Admin
            </Button>
          )}
        </Paper>
      </Container>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          py: 3, 
          px: 2, 
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.grey[200]
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Quiz Platform - SVEC. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage; 