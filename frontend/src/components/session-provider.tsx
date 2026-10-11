"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface UserSession {
  isAuthorized: boolean;
  userId: number | undefined;
  username?: string;
}

interface SessionContextValue {
  session: UserSession;
  updateSession: () => Promise<void>;
  login: () => Promise<void>;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: { isAuthorized: false, userId: undefined },
  updateSession: async () => {},
  login: async () => {},
  isLoading: true,
} as SessionContextValue);

export function useSession() {
  return useContext(SessionContext);
}

interface Props {
  children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
  const [session, setSession] = useState<UserSession>({ isAuthorized: false, userId: undefined });
  const [isLoading, setIsLoading] = useState(true);

  const updateSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();

      setSession(data);
    } catch {
      setSession({ isAuthorized: false, userId: undefined });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    await updateSession();
  };

  useEffect(() => {
    updateSession();
  }, []);

  const contextValue: SessionContextValue = {
    session,
    updateSession,
    login,
    isLoading,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}