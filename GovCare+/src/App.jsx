import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SubmitComplaintPage from './pages/SubmitComplaintPage';
import TrackingStatusPage from './pages/TrackingStatusPage';
import HelpCenterPage from './pages/HelpCenterPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import FAQPage from './pages/FAQPage';

function PrivateRoute({ user, loading, children }) {
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/faq" element={<FAQPage />} />

        {/* Protected — must be logged in */}
        <Route path="/dashboard" element={<PrivateRoute user={user} loading={loading}><DashboardPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute user={user} loading={loading}><ProfilePage /></PrivateRoute>} />
        <Route path="/submit-complaint" element={<PrivateRoute user={user} loading={loading}><SubmitComplaintPage /></PrivateRoute>} />
        <Route path="/track-status" element={<PrivateRoute user={user} loading={loading}><TrackingStatusPage /></PrivateRoute>} />
        <Route path="/help-center" element={<PrivateRoute user={user} loading={loading}><HelpCenterPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />


      </Routes>
    </BrowserRouter>
  );
}
