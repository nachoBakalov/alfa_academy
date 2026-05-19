import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import authService from './authService';
import { clearToken, getToken, setToken } from '../../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(getToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const storedToken = getToken();

    if (!storedToken) {
      setTokenState(null);
      setUser(null);
      return null;
    }

    try {
      const me = await authService.getMe();
      setTokenState(storedToken);
      setUser(me);
      return me;
    } catch (_error) {
      clearToken();
      setTokenState(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      setIsLoading(true);
      await refreshMe();

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshMe]);

  const loginUser = useCallback(async (email, password) => {
    const result = await authService.login(email, password);

    setToken(result.token);
    setTokenState(result.token);
    setUser(result.user);

    return result.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      loginUser,
      logout,
      refreshMe,
    }),
    [user, token, isLoading, loginUser, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
