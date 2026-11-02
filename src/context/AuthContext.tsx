'use client';
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

type AuthState = {
  loggedIn: boolean;
  userId?: string;
  username?: string;
  approvedByAdmin?: boolean;
  role?: string;
  reason?: 'session_expired' | 'unauthenticated';
};

type AuthContextType = {
  auth: AuthState;
  loadingAuth: boolean;
  errorAuth?: string;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  auth: { loggedIn: false },
  loadingAuth: true,
  errorAuth: undefined,
  refreshAuth: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [auth, setAuth] = useState<AuthState>({ loggedIn: false });
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [errorAuth, setErrorAuth] = useState<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const fetchAuth = async () => {
    // Cancel any in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Track request ID to ignore stale responses
    const requestId = ++requestIdRef.current;

    setLoadingAuth(true);
    setErrorAuth(undefined);

    try {
      const res = await fetch(`/api/authentication/status`, {
        credentials: 'include',
        signal: controller.signal,
      });

      // Ignore stale responses
      if (requestId !== requestIdRef.current) {
        console.log('[AuthContext] Ignoring stale response');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        
        // Validate API response structure
        if (typeof data === 'object' && data !== null && typeof data.loggedIn === 'boolean') {
          setAuth(data);
          setErrorAuth(undefined);
        } else {
          console.error('[AuthContext] Invalid API response structure:', data);
          setAuth({ loggedIn: false });
          setErrorAuth('Invalid authentication response from server');
        }
      } else {
        // Differentiate between auth failures and server errors
        if (res.status === 401 || res.status === 403) {
          const body = await res.json().catch(() => ({}));
          console.log('[AuthContext] User not authenticated', body.reason);
          setAuth({ loggedIn: false, reason: body.reason });
          setErrorAuth(undefined); // Not logged in is not an error
        } else {
          console.error(`[AuthContext] Auth check failed with status ${res.status}`);
          setAuth({ loggedIn: false });
          setErrorAuth(`Authentication service error (HTTP ${res.status})`);
        }
      }
    } catch (err) {
      // Ignore abort errors (intentional cancellations)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[AuthContext] Request aborted');
        return;
      }

      // Log and set error for network/other failures
      console.error('[AuthContext] Authentication check failed:', err);
      setAuth({ loggedIn: false });
      setErrorAuth('Failed to verify authentication status');
      // Detect network errors more reliably
      if (err instanceof TypeError) {
        setErrorAuth('Network error: Unable to reach authentication service');
      } else {
        setErrorAuth('Failed to verify authentication status');
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (requestId === requestIdRef.current) {
        setLoadingAuth(false);
      }
    }
  };

  useEffect(() => {
    fetchAuth();

    // Cleanup: abort any in-flight requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loadingAuth, errorAuth, refreshAuth: fetchAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);