import { useEffect, useState } from "react";

interface SessionData {
  isAuthorized: boolean;
  userId?: number;
  username?: string;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        const session: SessionData = await res.json();

        if (!cancelled) {
          setIsAuthenticated(session.isAuthorized);
          setIsLoading(false);
          setUserId(session.userId);
          setUsername(session.username);
        }
      } catch (error) {
        console.error("Failed to load session:", error);
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isAuthenticated, isLoading, userId, username };
}
