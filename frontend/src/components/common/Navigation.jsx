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
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  School as SchoolIcon,
  Event as EventIcon,
  People as PeopleIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  Person as PersonIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const Navigation = () => {
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  const adminMenuItems = [
    {
      title: 'Dashboard',
      path: '/admin/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'Academic Quizzes',
      path: '/admin/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'Student Accounts',
      path: '/admin/student-accounts',
      icon: <PeopleIcon />
    },
    {
      title: 'Faculty Accounts',
      path: '/admin/faculty-accounts',
      icon: <PersonIcon />
    },
    {
      title: 'Event Accounts',
      path: '/admin/event-accounts',
      icon: <EventIcon />
    },
    {
      title: 'College Settings',
      path: '/admin/college-settings',
      icon: <SettingsIcon />
    }
  ];

  const facultyMenuItems = [
    {
      title: 'Dashboard',
      path: '/faculty/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'My Quizzes',
      path: '/faculty/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'Create Quiz',
      path: '/faculty/quizzes/create',
      icon: <AddIcon />
    }
  ];

  const studentMenuItems = [
    {
      title: 'Dashboard',
      path: '/student/dashboard',
      icon: <DashboardIcon />
    },
    {
      title: 'Available Quizzes',
      path: '/student/quizzes',
      icon: <QuizIcon />
    },
    {
      title: 'My Submissions',
      path: '/student/submissions',
      icon: <AssignmentIcon />
    }
  ];

  const menuItems = user?.role === 'admin' 
    ? adminMenuItems 
    : user?.role === 'faculty' 
      ? facultyMenuItems 
      : studentMenuItems;

  const handleNavigation = (path) => {
    if (location.pathname === path) {
      return;
    }
    navigate(path, { replace: true });
    setDrawerOpen(false);
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ 
              flexGrow: { xs: 1, md: 0 }, 
              mr: { md: 4 },
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => handleNavigation('/dashboard')}
          >
            <QuizIcon sx={{ mr: 1 }} />
            Quiz Platform
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    ...(location.pathname === item.path && {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    })
                  }}
                >
                  {item.icon}
                  {item.title}
                </Button>
              ))}
            </Box>
          )}

          {/* Mobile Navigation Drawer */}
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
          >
            <Box
              sx={{ width: 250 }}
              role="presentation"
            >
              <List>
                {menuItems.map((item) => (
                  <ListItem
                    button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                  >
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.title} />
                  </ListItem>
                ))}
              </List>
              <Divider />
            </Box>
          </Drawer>

          {/* User Menu */}
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Open settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar alt={user?.name} src="/static/images/avatar/2.jpg" />
              </IconButton>
            </Tooltip>
            <Menu
              sx={{ mt: '45px' }}
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
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                handleNavigation('/profile');
              }}>
                <ListItemIcon>
                  <AccountIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Profile</Typography>
              </MenuItem>
              <MenuItem onClick={() => {
                handleCloseUserMenu();
                handleLogout();
              }}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <Typography textAlign="center">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navigation; 