import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import EncryptionDemoPage from './pages/EncryptionDemoPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Citizen Routes */}
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/submit-complaint" element={<SubmitComplaintPage />} />
        <Route path="/track-status" element={<TrackingStatusPage />} />
        <Route path="/help-center" element={<HelpCenterPage />} />
        <Route path="/faq" element={<FAQPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

        {/* Demo / Dev Tools */}
        <Route path="/demo/encryption" element={<EncryptionDemoPage />} />
      </Routes>
    </BrowserRouter>
  );
}
