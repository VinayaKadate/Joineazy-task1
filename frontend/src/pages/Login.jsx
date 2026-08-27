import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const { login, loginWithGoogle } = useContext(AuthContext);

  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleChange = (name, value, setter) => {
    setter(value);
    if (touched[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate all fields
    const errors = {
      email: validateField('email', email),
      password: validateField('password', password),
    };
    setFieldErrors(errors);
    setTouched({ email: true, password: true });

    if (Object.values(errors).some(e => e)) return;

    setIsLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setIsLoading(true);
    const result = await loginWithGoogle(credentialResponse.credential);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-paper-dark px-4 relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-8 py-10 bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-ink dark:text-ink-dark tracking-tight mb-1">Welcome Back</h1>
          <p className="text-ink-muted text-sm">Sign in to your Joineazy account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-accent-warn/40 bg-accent-warn/5 rounded-lg flex items-center gap-3 text-accent-warn text-sm animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Google Sign-In Button */}
        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in was unsuccessful. Please try again.')}
            theme="outline"
            size="large"
            width="350"
            text="signin_with"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-rule dark:bg-rule-strong"></div>
          <span className="text-xs text-ink-muted uppercase tracking-wider">or continue with email</span>
          <div className="flex-1 h-px bg-rule dark:bg-rule-strong"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Email Address</label>
            <input 
              id="login-email"
              type="email" 
              value={email}
              onChange={(e) => handleChange('email', e.target.value, setEmail)}
              onBlur={(e) => handleBlur('email', e.target.value)}
              className={`w-full px-4 py-3 bg-transparent border-b text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none transition-colors ${
                touched.email && fieldErrors.email
                  ? 'border-accent-warn focus:border-accent-warn'
                  : 'border-rule dark:border-rule-strong focus:border-accent'
              }`}
              placeholder="student@university.edu"
            />
            {touched.email && fieldErrors.email && (
              <p className="text-accent-warn text-xs mt-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Password</label>
            <input 
              id="login-password"
              type="password" 
              value={password}
              onChange={(e) => handleChange('password', e.target.value, setPassword)}
              onBlur={(e) => handleBlur('password', e.target.value)}
              className={`w-full px-4 py-3 bg-transparent border-b text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none transition-colors ${
                touched.password && fieldErrors.password
                  ? 'border-accent-warn focus:border-accent-warn'
                  : 'border-rule dark:border-rule-strong focus:border-accent'
              }`}
              placeholder="••••••••"
            />
            {touched.password && fieldErrors.password && (
              <p className="text-accent-warn text-xs mt-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button 
            id="login-submit"
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 px-6 mt-4 bg-accent text-paper dark:text-paper-dark font-semibold rounded transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-ink-muted text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-ink dark:text-ink-dark font-semibold hover:underline">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
