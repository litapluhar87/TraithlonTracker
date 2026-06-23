import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';
import Login from './screens/Login';
import LogSession from './screens/LogSession';
import Progress from './screens/Progress';
import Settings from './screens/Settings';

function ProtectedRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppShell() {
  const { user } = useApp();
  return (
    <div className="min-h-screen bg-[#0D0F14] text-white">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/log" replace /> : <Login />} />
        <Route path="/" element={<Navigate to="/log" replace />} />
        <Route path="/log" element={<ProtectedRoute><LogSession /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/log" replace />} />
      </Routes>
      {user && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </AppProvider>
  );
}
