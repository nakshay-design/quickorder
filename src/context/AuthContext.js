import React, { createContext, useContext } from 'react';

const AuthContext = createContext(null);

// Default user data
const defaultUser = {
  id: '1', // Default customer ID
  first_name: 'Guest',
  last_name: 'User'
};

export const AuthProvider = ({ children }) => {
  // Simplified context with default user and no-op functions
  const value = {
    currentUser: defaultUser,
    login: () => {},
    logout: () => {},
    loading: false,
    error: '',
    setError: () => {}
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};