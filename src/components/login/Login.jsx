// src/login/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_ROUTES, API_ENDPOINTS } from '../components/others/constants';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  
  // State management
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' hoặc 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Xử lý đăng nhập - GỌI API backend
  const handleLogin = async (loginData) => {
    setLoading(true);
    setError('');

    try {
      // Vite: import.meta.env.VITE_API_URL
      // CRA: process.env.REACT_APP_API_URL
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      
      const response = await fetch(`${API_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user } = data;
        
        // Lưu thông tin đăng nhập vào localStorage
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('token', user.token);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', user.id);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userEmail', user.email);
        
        console.log('✅ Login successful:', user);
        
        // Chuyển hướng theo role
        const redirectPath = ROLE_ROUTES[user.role] || '/';
        navigate(redirectPath);
      } else {
        // Xử lý lỗi từ backend
        setError(data.message || 'Login failed. Please try again!');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('Unable to connect to server. Please try again later!');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập bằng Email/SĐT
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const credential = loginMethod === 'email' ? email : phone;
    
    // Validation
    if (!credential || !password) {
      setError('Please fill in all information!');
      return;
    }

    if (loginMethod === 'email' && !isValidEmail(email)) {
      setError('Invalid email!');
      return;
    }

    if (loginMethod === 'phone' && !isValidPhone(phone)) {
      setError('Invalid phone number!');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters!');
      return;
    }

    const loginData = {
      type: loginMethod,
      [loginMethod]: credential,
      password,
      rememberMe
    };

    handleLogin(loginData);
  };

  // Đăng nhập bằng Google
  const handleGoogleLogin = () => {
    console.log('🔵 Google Login');
    setError('');
    
    // TODO: Xử lý OAuth Google
    // window.location.href = `${API_URL}/api/auth/google`;
    
    // Hoặc sử dụng Google SDK
    // Giả lập cho demo
    alert('Google login feature is under development');
  };

  // Đăng nhập bằng Facebook
  const handleFacebookLogin = () => {
    console.log('🔵 Facebook Login');
    setError('');
    
    // TODO: Xử lý OAuth Facebook
    // window.location.href = `${API_URL}/api/auth/facebook`;
    
    // Backend sẽ kiểm tra: Chỉ cho phép user có role INDIVIDUAL
    // Giả lập cho demo
    alert('Facebook login feature is under development\n(Only for Individual accounts)');
  };

  // Validation helpers
  const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isValidPhone = (phone) => {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
  };

  return (
    <div className="login-container">
      {/* Left Side - Image (ẩn vì dùng background) */}
      <div className="left-side">
        <div className="image-content">
          <div className="decorative-circle"></div>
          <div className="glass-circle">
            <img src="/Parking_lotV2.png" alt="Logo" className="flower-icon" />
          </div>
          <div className="text-watermark">Charge</div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="right-side">
        <div className="form-container">
          <div className="login-card">
            <h2 className="login-title">Login</h2>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            {/* Toggle Email/Phone */}
            <div className="login-method-toggle">
              <button
                type="button"
                className={`toggle-btn ${loginMethod === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('email');
                  setError('');
                }}
              >
                Email
              </button>
              <button
                type="button"
                className={`toggle-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('phone');
                  setError('');
                }}
              >
                Phone Number
              </button>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {/* Email/Phone Input */}
              <div className="form-group">
                <label className="form-label">
                  {loginMethod === 'email' ? 'Email' : 'Phone Number'}
                </label>
                {loginMethod === 'email' ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="form-input"
                    disabled={loading}
                  />
                ) : (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="form-input"
                    maxLength="10"
                    disabled={loading}
                  />
                )}
              </div>

              {/* Password Input */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="form-input"
                  disabled={loading}
                />
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="checkbox"
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
                <a href="/forgot-password" className="forgot-link">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              {/* Divider */}
              <div className="divider">
                <span>Or login with</span>
              </div>

              {/* Social Login */}
              <div className="social-login">
                <button 
                  type="button" 
                  onClick={handleGoogleLogin} 
                  className="social-btn google-btn"
                  disabled={loading}
                >
                  <svg className="social-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>

                <button 
                  type="button" 
                  onClick={handleFacebookLogin} 
                  className="social-btn facebook-btn"
                  disabled={loading}
                >
                  <svg className="social-icon" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div>

              {/* Info Note */}
              <div className="info-note">
                <small>
                  💡 <strong>Note:</strong> Facebook login is only for Individual accounts
                </small>
              </div>

              {/* Sign Up Link */}
              <div className="signup-link">
                Don't have an account? <a onClick={() => navigate('/register')}>Sign up now</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;