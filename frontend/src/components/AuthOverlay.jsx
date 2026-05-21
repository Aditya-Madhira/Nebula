import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus } from 'lucide-react';

export default function AuthOverlay({ isOpen, onClose, onAuthSuccess, backendBaseUrl }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setSignupUsername('');
    setSignupEmail('');
    setSignupPassword('');
    setErrorMsg('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMsg('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed.');

      onAuthSuccess({ username: data.username, email: data.email }, data.token);
      handleClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${backendBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail.trim(),
          password: signupPassword,
          username: signupUsername.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed.');

      onAuthSuccess({ username: data.username, email: data.email }, data.token);
      handleClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay open" onClick={handleClose}>
          {/* Main Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="auth-box"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inner card
          >
            <button className="auth-close" onClick={handleClose}>
              <X size={20} />
            </button>

            {/* Tab switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Log In
              </button>
              <button
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabChange('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* Login Form */}
            {activeTab === 'login' && (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <div className="auth-logo">
                  <span className="logo-nebula">NEBULA</span>
                  <span className="logo-anime">ANIME</span>
                </div>
                <p className="auth-subtitle">Welcome back, otaku.</p>
                <div className="auth-field">
                  <label htmlFor="login-email">Email</label>
                  <input
                    type="email"
                    id="login-email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {errorMsg && <p className="auth-error">{errorMsg}</p>}
                <button
                  type="submit"
                  className="btn-primary auth-submit"
                  disabled={loading}
                >
                  <LogIn size={16} />
                  {loading ? 'Logging in…' : 'Log In'}
                </button>
                <p className="auth-switch">
                  No account?{' '}
                  <span
                    className="auth-switch-link"
                    onClick={() => handleTabChange('signup')}
                  >
                    Sign up free
                  </span>
                </p>
              </form>
            )}

            {/* Signup Form */}
            {activeTab === 'signup' && (
              <form className="auth-form" onSubmit={handleSignupSubmit}>
                <div className="auth-logo">
                  <span className="logo-nebula">NEBULA</span>
                  <span className="logo-anime">ANIME</span>
                </div>
                <p className="auth-subtitle">Join the Nebula universe.</p>
                <div className="auth-field">
                  <label htmlFor="signup-username">Username</label>
                  <input
                    type="text"
                    id="signup-username"
                    placeholder="YourUsername"
                    autoComplete="username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="signup-email">Email</label>
                  <input
                    type="email"
                    id="signup-email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="signup-password">
                    Password <span className="auth-hint">(min 6 chars)</span>
                  </label>
                  <input
                    type="password"
                    id="signup-password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                {errorMsg && <p className="auth-error">{errorMsg}</p>}
                <button
                  type="submit"
                  className="btn-primary auth-submit"
                  disabled={loading}
                >
                  <UserPlus size={16} />
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
                <p className="auth-switch">
                  Already have an account?{' '}
                  <span
                    className="auth-switch-link"
                    onClick={() => handleTabChange('login')}
                  >
                    Log in
                  </span>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
