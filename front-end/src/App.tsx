import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';

// Placeholder pages — will be built out next
function OwnerHome()  { return <div style={{ color: 'white', padding: 40 }}>Owner dashboard — coming soon</div>; }
function WorkerHome() { return <div style={{ color: 'white', padding: 40 }}>Worker queue — coming soon</div>; }

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"       element={<LandingPage />} />
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/owner"  element={<OwnerHome />} />
          <Route path="/worker" element={<WorkerHome />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
