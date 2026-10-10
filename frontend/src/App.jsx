import React, { useState, useEffect, useMemo, useCallback, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import { ThemeProvider } from './context/ThemeContext';

// Auth context provides the token, the current user and the auth actions.
// Exported so any page (e.g. Dashboard) can consume it.
export const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(readStoredUser);

  // Keep token/user in sync if another tab logs in or out.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'token') {
        setToken(event.newValue || '');
      }
      if (event.key === 'user') {
        setUser(readStoredUser());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback((newToken, userData) => {
    setToken(newToken || '');
    setUser(userData || null);
    localStorage.setItem('token', newToken || '');
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const value = useMemo(
    () => ({ token, user, login, logout }),
    [token, user, login, logout]
  );

  return (
    <ThemeProvider>
      <AuthContext.Provider value={value}>
        <GoogleOAuthProvider
          clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
          cookiePolicy="single_host_origin"
        >
          <BrowserRouter>
            <div className="min-h-screen bg-[#e0e0e0] text-slate-800 transition-colors duration-500 ease-in-out dark:bg-[#1e293b] dark:text-slate-200">
              <Routes>
                {/* Public landing page — authenticated users go straight to the dashboard */}
                <Route
                  path="/"
                  element={token ? <Navigate to="/dashboard" replace /> : <Landing />}
                />
                {/* Direct link that opens the auth modal on the landing page */}
                <Route
                  path="/auth"
                  element={token ? <Navigate to="/dashboard" replace /> : <Landing showAuthModal />}
                />
                {/* Protected dashboard */}
                <Route
                  path="/dashboard"
                  element={token ? <Dashboard /> : <Navigate to="/" replace />}
                />
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App;
