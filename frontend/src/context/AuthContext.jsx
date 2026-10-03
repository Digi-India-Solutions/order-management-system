import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('oms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('oms_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Sync state with storage and fetch fresh profile
  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('oms_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        localStorage.setItem('oms_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
      if (err.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('oms_token', newToken);
      localStorage.setItem('oms_user', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res;
  };

  const verifyOtp = async (email, otp) => {
    const res = await api.post('/auth/verify-otp', { email, otp });
    if (res.success && res.data?.token) {
      localStorage.setItem('oms_token', res.data.token);
      localStorage.setItem('oms_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      await refreshUser();
    }
    return res;
  };

  const resendOtp = async (email, purpose = 'REGISTRATION') => {
    return api.post('/auth/resend-otp', { email, purpose });
  };

  const verifyEmail = async (token, email) => {
    const payload = typeof token === 'object' ? token : { token, email };
    const res = await api.post('/auth/verify-email', payload);
    if (res.success && res.data?.token) {
      localStorage.setItem('oms_token', res.data.token);
      localStorage.setItem('oms_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      await refreshUser();
    }
    return res;
  };

  const resendVerificationLink = async (email) => {
    return resendOtp(email, 'REGISTRATION');
  };

  const logout = () => {
    localStorage.removeItem('oms_token');
    localStorage.removeItem('oms_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  // RBAC checks
  const hasRole = (roles) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  const hasPermission = (permissionCode) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const permissions = user.permissions || [];
    return permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        verifyOtp,
        verifyEmail,
        resendOtp,
        resendVerificationLink,
        logout,
        hasRole,
        hasPermission,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
