import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/accounts/me/');
      // Load user profile details (bio, profile_photo, counts)
      const profileRes = await api.get(`/profiles/${res.data.username}/`);
      setUser({ ...res.data, profile: profileRes.data });
    } catch (err) {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.post('/accounts/login/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      await fetchCurrentUser();
      return { success: true };
    } catch (err) {
      setLoading(false);
      return {
        success: false,
        error: err.response?.data?.detail || 'Invalid username or password',
      };
    }
  };

  const register = async (username, email, password, firstName, lastName) => {
    setLoading(true);
    try {
      await api.post('/accounts/register/', {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });
      return await login(username, password);
    } catch (err) {
      setLoading(false);
      const errorData = err.response?.data;
      let errorMsg = 'Registration failed. Please check inputs.';
      if (errorData) {
        if (typeof errorData === 'object') {
          errorMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
        } else {
          errorMsg = errorData;
        }
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const reloadUser = async () => {
    if (localStorage.getItem('access_token')) {
      await fetchCurrentUser();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
