/**
 * Purpose:
 * Authentication React Context providing global session state,
 * sign-in, registration, sign-out actions, and user persistence.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types/api';
import { getStoredUser, getStoredToken, signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut } from '../lib/api/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const session = await apiSignIn(email, password);
    setUser(session.user);
  };

  const signUp = async (email: string, password: string) => {
    const response = await apiSignUp(email, password);
    if (response.user) {
      setUser(response.user);
    }
  };

  const signOut = () => {
    apiSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
