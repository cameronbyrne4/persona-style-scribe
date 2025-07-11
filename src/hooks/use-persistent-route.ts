import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PERSISTENT_ROUTE_KEY = 'Pensona_current_route';

export const usePersistentRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Save current route to localStorage whenever it changes
  useEffect(() => {
    // Don't save certain routes that shouldn't be persisted
    const routesToPersist = [
      '/',
      '/style-transfer',
      '/research-answer',
      '/my-documents',
      '/history'
    ];
    
    if (routesToPersist.includes(location.pathname)) {
      localStorage.setItem(PERSISTENT_ROUTE_KEY, location.pathname);
    }
  }, [location.pathname]);

  // Restore route on app load
  useEffect(() => {
    const savedRoute = localStorage.getItem(PERSISTENT_ROUTE_KEY);
    if (savedRoute && savedRoute !== location.pathname) {
      // Only navigate if we're not already on the saved route
      navigate(savedRoute, { replace: true });
    }
  }, []); // Only run on mount

  return null;
}; 