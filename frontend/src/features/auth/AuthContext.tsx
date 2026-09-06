import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { getCurrentUser } from '../../services/api';

export interface User {
  id: string;
  name?: string;
  email: string;
  role: string;
  doctor_status: string | null;
  registration_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;

  setSession: (
    token: string,
    user: User
  ) => void;

  logout: () => void;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [token, setToken] =
    useState<string | null>(
      localStorage.getItem(
        'sehat_saathi_auth_token'
      )
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser(token)
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem(
          'sehat_saathi_auth_token'
        );

        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  function setSession(
    newToken: string,
    newUser: User
  ) {
    localStorage.setItem(
      'sehat_saathi_auth_token',
      newToken
    );

    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  }

  function logout() {
    localStorage.removeItem(
      'sehat_saathi_auth_token'
    );

    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return context;
}