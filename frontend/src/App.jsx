import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col font-sans bg-gray-50">
          {/* Main Routing */}
          <main className="flex-grow flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes Placeholders (Phase 2 & 3) */}
              <Route 
                path="/student-dashboard" 
                element={
                  <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="p-10 bg-white rounded-3xl shadow-xl border border-gray-200 text-center">
                      <h2 className="text-3xl font-bold text-gray-800 mb-4">🎓 Student Dashboard</h2>
                      <p className="text-gray-500">Welcome! Group features coming in Phase 2.</p>
                      <button 
                        onClick={() => {
                          localStorage.clear();
                          window.location.href = '/login';
                        }}
                        className="mt-6 px-6 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-200 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                } 
              />
              <Route 
                path="/admin-dashboard" 
                element={
                  <div className="flex items-center justify-center min-h-screen bg-gray-100">
                    <div className="p-10 bg-white rounded-3xl shadow-xl border border-gray-200 text-center">
                      <h2 className="text-3xl font-bold text-gray-800 mb-4">👨‍🏫 Admin Dashboard</h2>
                      <p className="text-gray-500">Welcome Professor! Assignment features coming in Phase 3.</p>
                      <button 
                        onClick={() => {
                          localStorage.clear();
                          window.location.href = '/login';
                        }}
                        className="mt-6 px-6 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-200 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                } 
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
