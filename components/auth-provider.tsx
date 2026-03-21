'use client'

import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export const AuthContext = React.createContext<ReturnType<typeof useAuth> | null>(null);

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Wrap with SessionProvider and AuthProvider logic to support existing hooks
  return (
    <SessionProvider>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </SessionProvider>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}
