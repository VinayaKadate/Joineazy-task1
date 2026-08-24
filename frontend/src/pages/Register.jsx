import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const result = await register(name, email, password, role);
    if (!result.success) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-paper-dark px-4 py-12">
      <div className="w-full max-w-md px-8 py-10 bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-ink dark:text-ink-dark tracking-tight mb-1">Join Joineazy</h1>
          <p className="text-ink-muted text-sm">Create your account to get started</p>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-accent-warn/40 bg-accent-warn/5 rounded-lg flex items-center gap-3 text-accent-warn text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
              placeholder="student@university.edu"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-b border-rule dark:border-rule-strong text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">I am a…</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-3 rounded font-semibold text-sm transition-all duration-200 border ${
                  role === 'student' 
                    ? 'bg-accent text-paper border-accent' 
                    : 'bg-transparent border-rule text-ink-muted hover:border-ink-muted'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-3 rounded font-semibold text-sm transition-all duration-200 border ${
                  role === 'admin' 
                    ? 'bg-accent text-paper border-accent' 
                    : 'bg-transparent border-rule text-ink-muted hover:border-ink-muted'
                }`}
              >
                Professor (Admin)
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 px-6 mt-4 bg-accent text-paper dark:text-paper-dark font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-ink-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-ink dark:text-ink-dark font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
