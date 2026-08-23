import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/* Navbar placeholder */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Joineazy</h1>
          </div>
        </header>

        <main className="flex-grow">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<div className="text-center py-20"><h2 className="text-2xl font-semibold">Welcome to Joineazy</h2><p className="mt-4 text-gray-600">Please register or login.</p></div>} />
              {/* Phase 1 routes: /login, /register */}
              {/* Phase 2/3 routes: /student-dashboard, /admin-dashboard */}
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
