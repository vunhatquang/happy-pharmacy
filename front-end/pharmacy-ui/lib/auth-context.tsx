"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isPharmacist: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

const LOGGED_OUT: AuthState = { user: null, token: null, isLoading: false };

// Reads the persisted session. Wrapped in try/catch because localStorage throws
// in private-mode and storage-blocked browsers rather than returning null.
function readStoredAuth(): AuthState {
  try {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");
    if (token && rawUser) {
      return { user: JSON.parse(rawUser) as User, token, isLoading: false };
    }
  } catch {
    // Fall through to the logged-out state.
  }
  return LOGGED_OUT;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, token, isLoading }, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    // localStorage does not exist during SSR, so the first render is always the
    // logged-out state and the stored session is applied on hydration. This is
    // the one place a synchronous setState in an effect is unavoidable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStoredAuth());
  }, []);

  const persist = (data: { token: string; user: User }) => {
    try {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch {
      // Session stays in memory for this tab if storage is unavailable.
    }
    setState({ user: data.user, token: data.token, isLoading: false });
  };

  const login = async (email: string, password: string) => {
    persist(await api.login(email, password));
  };

  const register = async (formData: { full_name: string; email: string; phone: string; password: string }) => {
    persist(await api.register(formData));
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    setState(LOGGED_OUT);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAdmin: user?.role === "admin",
        // Admins can cover the consultation queue, matching the backend's
        // PharmacistRequired middleware.
        isPharmacist: user?.role === "pharmacist" || user?.role === "admin",
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
