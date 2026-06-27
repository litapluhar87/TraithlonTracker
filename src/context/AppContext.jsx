import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch activities from backend whenever the logged-in user changes
  useEffect(() => {
    if (!user?.user_id) {
      setActivities([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getActivities(user.user_id)
      .then(res => {
        if (cancelled) return;
        const sorted = (res.activities || []).sort(
          (a, b) => new Date(b.start_date) - new Date(a.start_date)
        );
        setActivities(sorted);
      })
      .catch(err => {
        console.error('Failed to load activities:', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.user_id]);

  const login = (userData) => {
    localStorage.setItem('tt_user', JSON.stringify(userData));
    localStorage.setItem('tt_user_id', userData.user_id);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('tt_user');
    localStorage.removeItem('tt_user_id');
    setUser(null);
    setActivities([]);
  };

  const addActivity = (activity) => {
    setActivities(prev => [activity, ...prev].sort(
      (a, b) => new Date(b.start_date) - new Date(a.start_date)
    ));
  };

  return (
    <AppContext.Provider value={{ user, login, logout, activities, setActivities, addActivity, loading, setLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
