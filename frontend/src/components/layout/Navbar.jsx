import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  useTheme,
  useMediaQuery,
  Divider,
  Badge
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../context/AuthContext';
import EditProfile from '../profile/EditProfile';

const Navbar = () => {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    handleCloseNavMenu();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleCloseUserMenu();
  };

  const handleEditProfile = () => {
    setAnchorElUser(null);
    setIsEditProfileOpen(true);
  };

  const getNavItems = () => {
    if (!user) return [];

    const items = [
      { 
        label: 'Dashboard', 
        path: '/dashboard',
        icon: <DashboardIcon sx={{ mr: 1 }} />
      }
    ];

    if (user.role === 'faculty') {
      items.push(
        { 
          label: 'Create Quiz', 
          path: '/quizzes/create',
          icon: <QuizIcon sx={{ mr: 1 }} />
        },
        { 
          label: 'My Quizzes', 
          path: '/quizzes',
          icon: <SchoolIcon sx={{ mr: 1 }} />
        },
        { 
          label: 'Create Event Quiz', 
          path: '/quizzes/event/create',
          icon: <QuizIcon sx={{ mr: 1 }} />
        }
      );
    } else if (user.role === 'student') {
      items.push(
        { 
          label: 'Available Quizzes', 
          path: '/quizzes',
          icon: <QuizIcon sx={{ mr: 1 }} />
        },
        { 
          label: 'Event Quizzes', 
          path: '/quizzes/event',
          icon: <QuizIcon sx={{ mr: 1 }} />
        }
      );
    } else if (user.role === 'admin') {
      items.push(
        { 
          label: 'Manage Subjects', 
          path: '/subjects',
          icon: <SchoolIcon sx={{ mr: 1 }} />
        },
        {
          label: 'Admission Ranges',
          path: '/admin/admission-ranges',
          icon: <QuizIcon sx={{ mr: 1 }} />
        },
        {
          label: 'Quiz Overview',
          path: '/quizzes-overview',
          icon: <QuizIcon sx={{ mr: 1 }} />
        },
        { 
          label: 'Event Quiz Accounts', 
          path: '/admin/event-quiz-accounts',
          icon: <QuizIcon sx={{ mr: 1 }} />
        },
        {
          label: 'Event Quizzes',
          path: '/admin/event-quizzes',
          icon: <QuizIcon sx={{ mr: 1 }} />
        }
      );
    }

    return items;
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <AppBar 
        position="sticky" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 70 } }}>
            {/* Logo for desktop */}
            <Typography
              variant="h5"
              noWrap
              component="div"
              sx={{ 
                mr: 4, 
                display: { xs: 'none', md: 'flex' },
                color: theme.palette.primary.main,
                fontWeight: 600,
                alignItems: 'center'
              }}
            >
              <QuizIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              Quiz App
            </Typography>

            {/* Mobile menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                sx={{ color: theme.palette.primary.main }}
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  '& .MuiPaper-root': {
                    borderRadius: '12px',
                    mt: 1,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }
                }}
              >
                {getNavItems().map((item) => (
                  <MenuItem 
                    key={item.path} 
                    onClick={() => handleMenuClick(item.path)}
                    sx={{
                      backgroundColor: isActive(item.path) ? 'rgba(0,0,0,0.04)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.08)',
                      }
                    }}
                  >
                    {item.icon}
                    <Typography>{item.label}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Logo for mobile */}
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ 
                flexGrow: 1, 
                display: { xs: 'flex', md: 'none' },
                color: theme.palette.primary.main,
                fontWeight: 600,
                alignItems: 'center'
              }}
            >
              <QuizIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              Quiz App
            </Typography>

            {/* Desktop menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {getNavItems().map((item) => (
                <Button
                  key={item.path}
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    color: isActive(item.path) ? theme.palette.primary.main : 'text.primary',
                    backgroundColor: isActive(item.path) ? 'rgba(0,0,0,0.04)' : 'transparent',
                    px: 2,
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.08)',
                    },
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </Box>

            {/* User menu */}
            <Box sx={{ flexShrink: 0 }}>
              <Tooltip title={user?.name || 'User settings'}>
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.primary.main,
                      width: 40,
                      height: 40
                    }}
                  >
                    <PersonIcon />
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ 
                  mt: '45px',
                  '& .MuiPaper-root': {
                    borderRadius: '12px',
                    minWidth: 200,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }
                }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {user?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleEditProfile}>
                  <Typography>Edit Profile</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Typography>Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <EditProfile 
        open={isEditProfileOpen} 
        onClose={() => setIsEditProfileOpen(false)} 
      />
    </>
  );
};

export default Navbar; 