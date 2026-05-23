import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  retryAuth: () => Promise<boolean>;
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
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem('reza_auth_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          
          // Pre-populate mock states to support local offline usage / prevent layout block
          setUser(parsedUser);
          setProfile({
            email: 'owner@rezametal.com',
            role: 'admin',
            name: 'OWNER'
          });

          // Authenticate with Firebase Auth anonymously so request.auth is populated in security rules
          try {
            await signInAnonymously(auth);
          } catch (fbErr: any) {
            console.error('Firebase Auth sign-in failed during recovery:', fbErr);
            if (fbErr?.code === 'auth/admin-restricted-operation' || fbErr?.message?.includes('admin-restricted-operation')) {
              setAuthError('ANONYMOUS_AUTH_DISABLED');
            } else {
              setAuthError(fbErr?.message || 'Authentication failed');
            }
          }
        }
      } catch (err) {
        console.error('Local JSON parse failed in initAuth:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    if (username === 'OWNER' && password === '7531') {
      try {
        setAuthError(null);
        
        const mockUser = {
          uid: 'owner_simulated_id',
          displayName: 'OWNER',
          email: 'owner@rezametal.com'
        };
        
        // Save for persistence locally first
        localStorage.setItem('reza_auth_user', JSON.stringify(mockUser));
        setUser(mockUser);
        setProfile({
          email: 'owner@rezametal.com',
          role: 'admin',
          name: 'OWNER'
        });

        // Try authenticating anonymously with Firebase, but don't crash or block login if administrative settings disable it
        try {
          await signInAnonymously(auth);
        } catch (fbErr: any) {
          console.error('Firebase Auth sign-in failed during login:', fbErr);
          if (fbErr?.code === 'auth/admin-restricted-operation' || fbErr?.message?.includes('admin-restricted-operation')) {
            setAuthError('ANONYMOUS_AUTH_DISABLED');
          } else {
            setAuthError(fbErr?.message || 'Authentication failed');
          }
        }
        return true;
      } catch (err: any) {
        setAuthError(err?.message || 'Authentication failed');
        throw err;
      }
    }
    return false;
  };

  const clearAuthError = () => setAuthError(null);

  const retryAuth = async () => {
    try {
      setAuthError(null);
      await signInAnonymously(auth);
      return true;
    } catch (fbErr: any) {
      console.error('Firebase Auth retry failed:', fbErr);
      if (fbErr?.code === 'auth/admin-restricted-operation' || fbErr?.message?.includes('admin-restricted-operation')) {
        setAuthError('ANONYMOUS_AUTH_DISABLED');
      } else {
        setAuthError(fbErr?.message || 'Authentication failed');
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase Auth sign-out failed:', err);
    }
    localStorage.removeItem('reza_auth_user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, authError, clearAuthError, login, logout, retryAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
