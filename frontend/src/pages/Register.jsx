import { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const { register, loginWithGoogle } = useContext(AuthContext);

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return 'Password should contain both letters and numbers';
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
      name: validateField('name', name),
      email: validateField('email', email),
      password: validateField('password', password),
    };
    setFieldErrors(errors);
    setTouched({ name: true, email: true, password: true });

    if (Object.values(errors).some(e => e)) return;

    setIsLoading(true);
    const result = await register(name, email, password, role);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    setIsLoading(true);
    const result = await loginWithGoogle(credentialResponse.credential, role);
    if (!result.success) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-accent-warn' };
    if (score <= 3) return { level: 2, label: 'Fair', color: 'bg-yellow-500' };
    return { level: 3, label: 'Strong', color: 'bg-green-600' };
  };

  const strength = getPasswordStrength();

  const FieldError = ({ error }) => error ? (
    <p className="text-accent-warn text-xs mt-1 flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
      {error}
    </p>
  ) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-paper-dark px-4 py-12 relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-8 py-10 bg-paper-raised dark:bg-paper-dark-raised border border-rule dark:border-rule-strong rounded-xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-ink dark:text-ink-dark tracking-tight mb-1">Join Joineazy</h1>
          <p className="text-ink-muted text-sm">Create your account to get started</p>
        </div>

        {error && (
          <div className="mb-6 p-3 border border-accent-warn/40 bg-accent-warn/5 rounded-lg flex items-center gap-3 text-accent-warn text-sm animate-shake">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* Role selection */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">I am a…</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              id="role-student"
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
              id="role-admin"
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

        {/* Google Sign-Up Button */}
        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was unsuccessful. Please try again.')}
            theme="outline"
            size="large"
            width="350"
            text="signup_with"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-rule dark:bg-rule-strong"></div>
          <span className="text-xs text-ink-muted uppercase tracking-wider">or sign up with email</span>
          <div className="flex-1 h-px bg-rule dark:bg-rule-strong"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Full Name</label>
            <input 
              id="register-name"
              type="text" 
              value={name}
              onChange={(e) => handleChange('name', e.target.value, setName)}
              onBlur={(e) => handleBlur('name', e.target.value)}
              className={`w-full px-4 py-3 bg-transparent border-b text-ink dark:text-ink-dark placeholder-ink-faint focus:outline-none transition-colors ${
                touched.name && fieldErrors.name
                  ? 'border-accent-warn focus:border-accent-warn'
                  : 'border-rule dark:border-rule-strong focus:border-accent'
              }`}
              placeholder="John Doe"
            />
            <FieldError error={touched.name && fieldErrors.name} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Email Address</label>
            <input 
              id="register-email"
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
            <FieldError error={touched.email && fieldErrors.email} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Password</label>
            <input 
              id="register-password"
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
            <FieldError error={touched.password && fieldErrors.password} />
            {/* Password strength bar */}
            {password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-rule rounded-full overflow-hidden flex gap-0.5">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.level / 3) * 100}%` }}></div>
                </div>
                <span className={`text-xs font-mono ${strength.level <= 1 ? 'text-accent-warn' : strength.level <= 2 ? 'text-yellow-500' : 'text-green-600'}`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <button 
            id="register-submit"
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
                <span>Creating account…</span>
              </>
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
