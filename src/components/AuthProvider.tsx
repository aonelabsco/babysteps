'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from '@/lib/hooks';
import {
  getUserFamily,
  getFamily,
  subscribeToFamily,
  handleRedirectResult,
} from '@/lib/firebase';
import type { Family } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  family: Family | null;
  familyLoading: boolean;
  refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  family: null,
  familyLoading: true,
  refreshFamily: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [familyLoading, setFamilyLoading] = useState(true);

  // Handle redirect result from signInWithRedirect (mobile browsers)
  useEffect(() => {
    handleRedirectResult();
  }, []);

  const loadFamily = async () => {
    if (!user) {
      setFamily(null);
      setFamilyLoading(false);
      return;
    }
    setFamilyLoading(true);
    try {
      const familyId = await getUserFamily(user.uid);
      if (familyId) {
        const fam = await getFamily(familyId);
        setFamily(fam);
      } else {
        setFamily(null);
      }
    } catch (err) {
      console.error('Failed to load family:', err);
      setFamily(null);
    }
    setFamilyLoading(false);
  };

  useEffect(() => {
    loadFamily();
  }, [user]);

  // Real-time subscription to family changes
  useEffect(() => {
    if (!family?.id) return;
    const unsub = subscribeToFamily(family.id, (updated) => {
      setFamily(updated);
    });
    return unsub;
  }, [family?.id]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        family,
        familyLoading,
        refreshFamily: loadFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
