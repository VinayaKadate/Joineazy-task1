import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

const GOOGLE_CLIENT_ID = '359442548382-jl3228fv1hud96pr7r9lbgnptgri86f4.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-paper-dark transition-colors duration-200">
              {/* Main Routing */}
              <main className="flex-grow flex flex-col">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Routes */}
                  <Route path="/student-dashboard" element={<StudentDashboard />} />
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                </Routes>
              </main>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

