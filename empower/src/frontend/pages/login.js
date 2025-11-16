import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail
} from 'firebase/auth';
import './Login.css';
import logo from '../assets/logo.png';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const validateEmailDomain = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain || domain.length < 3) {
      return 'Please enter a valid email domain';
    }
    
    const domainParts = domain.split('.');

    const providerPart = domainParts.slice(0, -1).join('.');
    
    if (/(.)\1{2,}/.test(providerPart) && !providerPart.match(/^[a-z]+\.[a-z]+$/)) {
      return 'Please check your email domain for typos';
    }
    
    return null;
  };

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      e.email = 'Invalid email format';
    } else {
      const domainError = validateEmailDomain(email);
      if (domainError) {
        e.email = domainError;
      }
    }

    if (!password) e.password = 'Password is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setErrors({});
    
    try {
      // Attempt to sign in directly first
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      
      // If wrong password or invalid credential, check if account uses Google
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          console.log('Sign-in methods available:', signInMethods);
          
          // If account exists but uses Google only
          if (signInMethods.length > 0 && !signInMethods.includes('password')) {
            setErrors({ email: 'This account uses Google sign-in. Please click "Sign in with Google" below.' });
            setLoading(false);
            return;
          }
          
          // Account uses password, so it's just wrong password
          if (signInMethods.includes('password')) {
            setErrors({ password: 'Incorrect password. Try again or reset your password.' });
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking sign-in methods:', err);
        }
      }
      
      // Handle specific error codes
      if (error.code === 'auth/user-not-found') {
        setErrors({ email: 'No account found with this email. Please create an account.' });
      } else if (error.code === 'auth/wrong-password') {
        setErrors({ password: 'Incorrect password. Try again or reset your password.' });
      } else if (error.code === 'auth/invalid-credential') {
        setErrors({ email: 'Invalid email or password. Please check your credentials.' });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({ email: 'Invalid email address.' });
      } else if (error.code === 'auth/too-many-requests') {
        setErrors({ email: 'Too many failed attempts. Please try again later or reset your password.' });
      } else if (error.code === 'auth/user-disabled') {
        setErrors({ email: 'This account has been disabled.' });
      } else {
        setErrors({ email: 'Login failed. Please check your credentials.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrors({});
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Google auth error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrors({ email: 'Sign-in popup was closed. Please try again.' });
      } else {
        setErrors({ email: 'Google sign-in failed. Please try again.' });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetError('');
    setResetMessage('');
    
    if (!resetEmail) {
      setResetError('Please enter your email address');
      return;
    }
    
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(resetEmail)) {
      setResetError('Please enter a valid email address');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage('If an account exists with this email, a password reset link has been sent. Check your inbox and spam folder.');
    } catch (error) {
      console.error('Password reset error:', error);
      setResetMessage('If an account exists with this email, a password reset link has been sent. Check your inbox and spam folder.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <button className="back-home-btn" onClick={() => navigate('/')}>← Back to Home</button>
        <div className="brand-section">
          <img src={logo} alt="Empower Logo" className="brand-logo" style={{transform: 'rotate(220deg)' }}/>
          <h1 className="brand-title">Empower</h1>
          <p className="brand-subtitle">
            Take control of your energy usage. Save money, reduce waste, and make smarter decisions about your home's power consumption.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your account</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" />
              {errors.email && <div className="error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <div className="password-input">
                <input 
                  className="input" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {/* SVG for the eye icon thing that is on the login page */}
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
            </div>
            
            <button 
              className="primary-btn" 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            
            <div className="forgot-link">
              <button type="button" className="text-link forgot" onClick={() => setShowForgotPassword(true)}>Forgot password?</button>
            </div>

            <div className="or">OR</div>

            <div className="socials">
              <button 
                type="button" 
                className="social google"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>{googleLoading ? 'Loading...' : 'Sign in with Google'}</span>
              </button>
            </div>
            
            <div className="new-user-link">
              <button type="button" className="text-link create" onClick={() => navigate('/signup')}>New User? Create Account</button>
            </div>
          </form>
        </div>
      </div>
      
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close" 
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
                setResetError('');
                setResetMessage('');
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h3>Reset Password</h3>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
            
            <div className="form-group">
              <label className="label">Email</label>
              <input 
                className="input" 
                type="email" 
                value={resetEmail} 
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                autoFocus
              />
              {resetError && <div className="error">{resetError}</div>}
              {resetMessage && <div className="success-message">{resetMessage}</div>}
            </div>
            
            <button className="modal-btn primary" onClick={handleForgotPassword}>Send Reset Link</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
