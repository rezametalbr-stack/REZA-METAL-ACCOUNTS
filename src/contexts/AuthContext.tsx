import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

interface UserProfile {
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent login
    const savedUser = localStorage.getItem('reza_auth_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setProfile({
        email: 'owner@rezametal.com',
        role: 'admin',
        name: 'OWNER'
      });
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    if (username === 'OWNER' && password === '7531') {
      const mockUser = {
        uid: 'owner_simulated_id',
        displayName: 'OWNER',
        email: 'owner@rezametal.com'
      };
      
      // Save for persistence
      localStorage.setItem('reza_auth_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setProfile({
        email: 'owner@rezametal.com',
        role: 'admin',
        name: 'OWNER'
      });
      return true;
    }
    return false;
  };

  const logout = async () => {
    localStorage.removeItem('reza_auth_user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
