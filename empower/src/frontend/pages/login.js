import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { authService } from '../../services/authService';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    // basic email pattern
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = 'Invalid email';

    if (!password) e.password = 'Password is required';
    else {
      if (password.length < 8) e.password = 'Password must be at least 8 characters';
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) e.password = 'Password must include at least one special character';
      if (!/\d/.test(password)) e.password = (e.password ? e.password + '; include a number' : 'Password must include a number');
    }

    if (mode === 'signup') {
      if (!confirm) e.confirm = 'Please confirm your password';
      else if (confirm !== password) e.confirm = 'Passwords do not match';
      if (!termsAccepted) e.terms = 'You must accept the terms to continue';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setAuthError('');
    
    try {
      if (mode === 'signin') {
        // Try Firebase first
        try {
          await signInWithEmailAndPassword(auth, email, password);
          navigate('/dashboard');
          return;
        } catch (firebaseError) {
          // If Firebase fails, try local auth
          await authService.signIn(email, password);
        }
      } else {
        // For signup, try Firebase first
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          navigate('/dashboard');
          return;
        } catch (firebaseError) {
          // If Firebase fails, use local auth
          await authService.signUp(email, password);
        }
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError('');
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Google auth error:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="header-inner">
          <div className="brand" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
            <div className="app-symbol">E</div>
            <span className="app-name">Empower</span>
          </div>
        </div>
      </header>

      <div className="login-card">
        <div className="login-left" aria-hidden="true">
          <div className="image-placeholder">Image Placeholder</div>
        </div>

        <div className="login-right">
          <div className="mode-switch">
            <button className={`mode-btn ${mode==='signin'?'active':''}`} onClick={() => setMode('signin')}>Sign In</button>
            <button className={`mode-btn ${mode==='signup'?'active':''}`} onClick={() => setMode('signup')}>Sign Up</button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} />
            {errors.email && <div className="error">{errors.email}</div>}

            <label className="label">Password</label>
            <div className="password-input">
              <input 
                className="input" 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <div className="error">{errors.password}</div>}

            {mode === 'signup' && (
              <>
                <label className="label">Confirm Password</label>
                <div className="password-input">
                  <input 
                    className="input" 
                    type={showConfirm ? "text" : "password"} 
                    value={confirm} 
                    onChange={e=>setConfirm(e.target.value)} 
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirm && <div className="error">{errors.confirm}</div>}
              </>
            )}

            <label className="terms">
              <input type="checkbox" checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} />
              <span> I agree to the Terms and Privacy Policy</span>
            </label>
            {errors.terms && <div className="error">{errors.terms}</div>}

            {authError && <div className="error auth-error">{authError}</div>}
            
            <button 
              className="primary-btn" 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Loading...' : mode==='signin'?'Sign In':'Create Account'}
            </button>

            <div className="or">OR</div>

            <div className="socials">
              <button 
                type="button" 
                className="social google"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <span>{loading ? 'Loading...' : 'Continue with Google'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
