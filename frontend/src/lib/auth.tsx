'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe } from './api';

export type AuthUser = {
  username: string;
  full_name: string;
  permissions: string[];
  roles: string[];
  is_superuser: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  hasPermission: (code: string | string[]) => boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  hasPermission: () => false,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser({
        username: me.username,
        full_name: me.full_name,
        permissions: me.permissions || [],
        roles: me.roles || [],
        is_superuser: me.is_superuser || false,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasPermission = useCallback(
    (code: string | string[]) => {
      if (!user) return false;
      if (user.is_superuser) return true;
      const codes = Array.isArray(code) ? code : [code];
      return codes.some((c) => user.permissions.includes(c));
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, hasPermission, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
