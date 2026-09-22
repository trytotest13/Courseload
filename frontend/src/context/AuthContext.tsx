import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokenStore } from '../api/client';
import { authApi } from '../api/endpoints';
import type { User, UserRole } from '../api/types';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // A stored token is a claim, not proof, so ask the API who it belongs to.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }

    let active = true;
    authApi
      .me()
      .then((result) => {
        if (!active) return;
        setUser(result.user);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        tokenStore.clear();
        setUser(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth has to be used inside AuthProvider.');
  return context;
}
