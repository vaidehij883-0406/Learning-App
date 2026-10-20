import React, { createContext, useContext, useState, useEffect } from 'react';
import { mobileApi, mobileStorage } from '../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'learner' | 'educator' | 'admin';
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; role: string; bio?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await mobileStorage.getToken();
        if (token) {
          const profile = await mobileApi.getMe();
          setUser(profile);
        }
      } catch (err) {
        await mobileStorage.deleteToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await mobileApi.login(credentials);
    setUser(res.user);
  };

  const register = async (data: { email: string; password: string; full_name: string; role: string; bio?: string }) => {
    const res = await mobileApi.register(data);
    setUser(res.user);
  };

  const logout = async () => {
    await mobileStorage.deleteToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
