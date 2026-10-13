import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_STORAGE_KEY } from '../api/client.js';
import { fetchAuthenticatedUser, loginWithGoogleIdToken } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);

    fetchAuthenticatedUser()
      .then((fetchedUser) => setUser(fetchedUser))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setUser(null);
          navigate('/login', { replace: true });
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginWithCredential = useCallback(
    async (credential) => {
      const authenticatedUser = await loginWithGoogleIdToken(credential);
      localStorage.setItem(TOKEN_STORAGE_KEY, credential);
      setToken(credential);
      setUser(authenticatedUser);
      navigate('/dashboard', { replace: true });
    },
    [navigate]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithCredential, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
