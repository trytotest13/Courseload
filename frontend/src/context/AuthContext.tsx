import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, tokenStore } from '../api/client';
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

    const verify = async (): Promise<void> => {
      try {
        const result = await authApi.me();
        if (active) setUser(result.user);
      } catch (error) {
        // Only a rejected token ends the session. A restarted or unreachable API
        // is a blip, and signing someone out for it would lose their work in
        // progress, so try once more before leaving the token in place.
        const rejected =
          error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (!rejected) {
          try {
            const retry = await authApi.me();
            if (active) setUser(retry.user);
            return;
          } catch {
            // Still down. Keep the token and let the next page load try again.
          }
        } else {
          tokenStore.clear();
          if (active) setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void verify();

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
