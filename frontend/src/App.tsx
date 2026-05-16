import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import { useTheme, useAccentTheme } from './hooks/useTheme';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  useTheme();
  useAccentTheme();

  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/workflows/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}
