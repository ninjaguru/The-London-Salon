
import React from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Staff from './components/Staff';
import Inventory from './components/Inventory';
import Appointments from './components/Appointments';
import Sales from './components/Sales';
import Customers from './components/Customers';
import Leads from './components/Leads';
import Packages from './components/Packages';
import Combos from './components/Combos';
import Reports from './components/Reports';
import Notifications from './components/Notifications';
import AIAssistant from './components/AIAssistant';
import Categories from './components/Categories';
import Services from './components/Services';
import Coupons from './components/Coupons';
import Settings from './components/Settings';
import Login from './components/Login';
import PublicMenu from './components/PublicMenu';
import { authService } from './services/auth';

// Guard component to check if user is logged in
const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <MemoryRouter>
      <Routes>
        {/* Public Facing Pages (No Layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/menu" element={<PublicMenu />} />
        
        {/* Protected Dashboard Pages (With Layout) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
        <Route path="/combos" element={<ProtectedRoute><Combos /></ProtectedRoute>} />
        <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/packages" element={<ProtectedRoute><Packages /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
};

export default App;
