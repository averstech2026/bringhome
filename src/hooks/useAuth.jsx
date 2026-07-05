import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  reload,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const reloadUser = useCallback(async () => {
    if (!auth?.currentUser) return;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      displayName: user?.displayName || user?.email?.split('@')[0] || 'Пользователь',
      signInEmail: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signOut: () => signOut(auth),
      reloadUser,
    }),
    [user, loading, reloadUser],
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
