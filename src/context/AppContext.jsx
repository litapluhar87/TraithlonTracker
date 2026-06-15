import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const login = (userData) => {
    localStorage.setItem('tt_user', JSON.stringify(userData));
    localStorage.setItem('tt_user_id', userData.user_id);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('tt_user');
    localStorage.removeItem('tt_user_id');
    setUser(null);
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
