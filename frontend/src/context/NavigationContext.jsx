import { createContext, useContext } from 'react';
import { useNavigate as useReactNavigate, useLocation as useReactLocation } from 'react-router-dom';

const NavigationContext = createContext(null);

export const useNavigation = () => {
  try {
    const context = useContext(NavigationContext);
    if (!context) {
      const navigate = useReactNavigate();
      const location = useReactLocation();
      return { navigate, location };
    }
    return context;
  } catch (error) {
    // Fallback for when used outside Router context
    console.warn('Navigation context used outside Router. Using fallback navigation.');
    return {
      navigate: (path) => {
        window.location.href = path;
      },
      location: window.location
    };
  }
};

export const useNavigate = () => {
  const { navigate } = useNavigation();
  return navigate;
};

export const useLocation = () => {
  const { location } = useNavigation();
  return location;
};

export const NavigationProvider = ({ children }) => {
  try {
    const navigate = useReactNavigate();
    const location = useReactLocation();

    return (
      <NavigationContext.Provider value={{ navigate, location }}>
        {children}
      </NavigationContext.Provider>
    );
  } catch (error) {
    // Fallback when used outside Router context
    console.warn('NavigationProvider used outside Router. Using fallback navigation.');
    return (
      <NavigationContext.Provider value={{
        navigate: (path) => { window.location.href = path; },
        location: window.location
      }}>
        {children}
      </NavigationContext.Provider>
    );
  }
};

export default NavigationContext; 