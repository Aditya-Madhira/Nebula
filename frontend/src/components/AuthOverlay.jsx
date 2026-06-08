import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, UserPlus, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

// ── Email validator ──────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const THROWAWAY_DOMAINS = ['mailinator.com', 'guerrillamail.com', 'trashmail.com', 'yopmail.com', 'tempmail.com'];

function validateEmail(email) {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return 'Please enter a valid email address.';
  const domain = e.split('@')[1];
  if (THROWAWAY_DOMAINS.includes(domain)) return 'Disposable email addresses are not allowed.';
  return null;
}

// ── Password strength ────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak',   color: '#ef4444' };
  if (score <= 2) return { score: 2, label: 'Fair',   color: '#f97316' };
  if (score <= 3) return { score: 3, label: 'Good',   color: '#eab308' };
  if (score <= 4) return { score: 4, label: 'Strong', color: '#22c55e' };
  return             { score: 5, label: 'Strong', color: '#22c55e' };
}

function getPasswordErrors(pw) {
  const rules = [
    { ok: pw.length >= 8,             text: 'At least 8 characters'          },
    { ok: /[A-Z]/.test(pw),           text: 'One uppercase letter'           },
    { ok: /[0-9]/.test(pw),           text: 'One number'                     },
    { ok: /[^A-Za-z0-9]/.test(pw),   text: 'One special character (!@#…)'   },
  ];
  return rules;
}

// ── Password field w/ show/hide ───────────────────────────────
function PasswordField({ id, label, hint, value, onChange, autoComplete, showStrength = false }) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => getPasswordStrength(value), [value]);
  const rules    = useMemo(() => getPasswordErrors(value), [value]);

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label} {hint && <span className="auth-hint">{hint}</span>}</label>
      <div className="auth-input-wrap">
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          className="auth-input auth-input-pw"
          placeholder="••••••••"
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          required
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setVisible(v => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="pw-strength-wrap">
          {/* Strength bar */}
          <div className="pw-strength-bar-track">
            {[1,2,3,4,5].map(i => (
              <div
                key={i}
                className="pw-strength-segment"
                style={{
                  background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.25s ease',
                }}
              />
            ))}
          </div>
          <span className="pw-strength-label" style={{ color: strength.color }}>
            {strength.label}
          </span>

          {/* Rules checklist */}
          <ul className="pw-rules">
            {rules.map((r, i) => (
              <li key={i} className={`pw-rule ${r.ok ? 'ok' : 'fail'}`}>
                {r.ok
                  ? <CheckCircle2 size={11} style={{ color: '#22c55e' }} />
                  : <XCircle     size={11} style={{ color: '#6b7280' }} />}
                {r.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function AuthOverlay({ isOpen, onClose, onAuthSuccess, backendBaseUrl }) {
  const [activeTab, setActiveTab] = useState('login');
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail,   setSignupEmail]   = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setLoginEmail(''); setLoginPassword('');
    setSignupUsername(''); setSignupEmail(''); setSignupPassword('');
    setErrorMsg(''); setSuccessMsg('');
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setErrorMsg(''); setSuccessMsg(''); };
  const handleClose = () => { resetForm(); onClose(); };

  // ── Login ──────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const emailErr = validateEmail(loginEmail);
    if (emailErr) { setErrorMsg(emailErr); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${backendBaseUrl}/api/auth/login`, {
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

  // ── Signup ─────────────────────────────────────────────────
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const emailErr = validateEmail(signupEmail);
    if (emailErr) { setErrorMsg(emailErr); return; }

    const strength = getPasswordStrength(signupPassword);
    const rules    = getPasswordErrors(signupPassword);
    const failing  = rules.filter(r => !r.ok);
    if (failing.length > 0) {
      setErrorMsg(`Weak password: ${failing[0].text}.`);
      return;
    }

    if (signupUsername.trim().length > 0 && signupUsername.trim().length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`${backendBaseUrl}/api/auth/register`, {
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

  const signupStrength = useMemo(() => getPasswordStrength(signupPassword), [signupPassword]);
  const signupReady = useMemo(() => {
    const rules = getPasswordErrors(signupPassword);
    return rules.every(r => r.ok) && !validateEmail(signupEmail);
  }, [signupPassword, signupEmail]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay open" onClick={handleClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: 12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="auth-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="auth-close" onClick={handleClose}><X size={20} /></button>

            {/* Tab switcher */}
            <div className="auth-tabs">
              <button className={`auth-tab ${activeTab === 'login'  ? 'active' : ''}`} onClick={() => handleTabChange('login')}>
                Log In
                {activeTab === 'login'  && <motion.div layoutId="auth-tab-indicator" className="auth-tab-indicator" />}
              </button>
              <button className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`} onClick={() => handleTabChange('signup')}>
                Sign Up
                {activeTab === 'signup' && <motion.div layoutId="auth-tab-indicator" className="auth-tab-indicator" />}
              </button>
            </div>

            <div className="auth-aurora" />

            <div className="auth-form-wrapper">
              <AnimatePresence mode="wait">

                {/* ── LOGIN ── */}
                {activeTab === 'login' && (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0   }}
                    exit={{   opacity: 0, x:  18  }}
                    transition={{ duration: 0.2 }}
                    className="auth-form"
                    onSubmit={handleLoginSubmit}
                  >
                    <div className="auth-logo">
                      <span className="logo-nebula">NEBULA</span>
                      <span className="logo-anime">ANIME</span>
                    </div>
                    <p className="auth-subtitle">Welcome back, otaku. 👋</p>

                    <div className="auth-field">
                      <label htmlFor="login-email">Email</label>
                      <input
                        type="text"
                        id="login-email"
                        className={`auth-input ${loginEmail && validateEmail(loginEmail) ? 'auth-input-error' : loginEmail && !validateEmail(loginEmail) ? 'auth-input-ok' : ''}`}
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                      {loginEmail && validateEmail(loginEmail) && (
                        <span className="auth-field-hint error">{validateEmail(loginEmail)}</span>
                      )}
                    </div>

                    <PasswordField
                      id="login-password"
                      label="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      showStrength={false}
                    />

                    {errorMsg   && <p className="auth-error">{errorMsg}</p>}
                    {successMsg && <p className="auth-success">{successMsg}</p>}

                    <button type="submit" className="auth-submit" disabled={loading}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                      {loading ? 'Logging in…' : 'Log In'}
                    </button>

                    <p className="auth-switch">
                      No account?{' '}
                      <span className="auth-switch-link" onClick={() => handleTabChange('signup')}>Sign up free</span>
                    </p>
                  </motion.form>
                )}

                {/* ── SIGNUP ── */}
                {activeTab === 'signup' && (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0, x:  18 }}
                    animate={{ opacity: 1, x: 0   }}
                    exit={{   opacity: 0, x: -18  }}
                    transition={{ duration: 0.2 }}
                    className="auth-form"
                    onSubmit={handleSignupSubmit}
                  >
                    <div className="auth-logo">
                      <span className="logo-nebula">NEBULA</span>
                      <span className="logo-anime">ANIME</span>
                    </div>
                    <p className="auth-subtitle">Join the Nebula universe. 🌌</p>

                    <div className="auth-field">
                      <label htmlFor="signup-username">
                        Username <span className="auth-hint">(optional, min 3 chars)</span>
                      </label>
                      <input
                        type="text"
                        id="signup-username"
                        className={`auth-input ${signupUsername && signupUsername.trim().length < 3 ? 'auth-input-error' : signupUsername.trim().length >= 3 ? 'auth-input-ok' : ''}`}
                        placeholder="YourUsername"
                        autoComplete="username"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                      />
                    </div>

                    <div className="auth-field">
                      <label htmlFor="signup-email">Email</label>
                      <input
                        type="text"
                        id="signup-email"
                        className={`auth-input ${signupEmail && validateEmail(signupEmail) ? 'auth-input-error' : signupEmail && !validateEmail(signupEmail) ? 'auth-input-ok' : ''}`}
                        placeholder="you@example.com"
                        autoComplete="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                      {signupEmail && validateEmail(signupEmail) && (
                        <span className="auth-field-hint error">{validateEmail(signupEmail)}</span>
                      )}
                      {signupEmail && !validateEmail(signupEmail) && (
                        <span className="auth-field-hint ok">✓ Looks good!</span>
                      )}
                    </div>

                    <PasswordField
                      id="signup-password"
                      label="Password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      autoComplete="new-password"
                      showStrength={true}
                    />

                    {errorMsg   && <p className="auth-error">{errorMsg}</p>}

                    <button
                      type="submit"
                      className={`auth-submit ${signupReady ? 'auth-submit-ready' : ''}`}
                      disabled={loading}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                      {loading ? 'Creating account…' : 'Create Account'}
                    </button>

                    <p className="auth-switch">
                      Already have an account?{' '}
                      <span className="auth-switch-link" onClick={() => handleTabChange('login')}>Log in</span>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
