"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { UserSession } from "@/src/core/definitions";

const SessionContext = createContext<{
    session: UserSession;
    updateSession: () => Promise<void>;
}>({
    session: { isAuthorized: false, userId: undefined },
    updateSession: async () => {}
});

export function useSession() {
    return useContext(SessionContext);
}

interface Props {
    children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
    const [session, setSession] = useState<UserSession>({ isAuthorized: false, userId: undefined });

    const updateSession = async () => {
        try {
            const res = await fetch("/api/auth/session");
            const data = await res.json();

            setSession(data);
        } catch {
            setSession({ isAuthorized: false, userId: undefined });
        }
    };

    useEffect(() => {
        updateSession();
    }, []);

    return <SessionContext.Provider value={{ session, updateSession }}>{children}</SessionContext.Provider>;
}
