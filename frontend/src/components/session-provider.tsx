"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "@/api/client";
import type { UserSession } from "@/core/definitions";

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
    children: ReactNode;
}

export function SessionProvider({ children }: Props) {
    const [session, setSession] = useState<UserSession>({ isAuthorized: false, userId: undefined });

    const updateSession = async () => {
        try {
            const data = await api.getSession();
            setSession({
                isAuthorized: data.isAuthorized,
                userId: data.userId,
                username: data.username
            });
        } catch {
            setSession({ isAuthorized: false, userId: undefined });
        }
    };

    useEffect(() => {
        updateSession();
    }, []);

    return <SessionContext.Provider value={{ session, updateSession }}>{children}</SessionContext.Provider>;
}