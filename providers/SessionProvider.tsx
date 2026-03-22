"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ISession } from "@/models/Session";

interface SessionContextType {
  activeSession: ISession | null;
  selectedSession: ISession | null; // For admins to view data from other sessions
  sessions: ISession[];
  loading: boolean;
  error: string | null;
  setSelectedSessionId: (id: string) => void;
  refreshSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, role, loading: authLoading } = useAuth();
  const [activeSession, setActiveSession] = useState<ISession | null>(null);
  const [selectedSession, setSelectedSession] = useState<ISession | null>(null);
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // If no user yet, wait
      if (authLoading) return;
      if (!user) {
         setLoading(false);
         return;
      }

      if (role === "admin") {
        // Fetch all sessions for admins
        const res = await fetch("/api/sessions");
        if (!res.ok) throw new Error("Failed to fetch sessions");
        const data = await res.json();
        setSessions(data);

        const active = data.find((s: ISession) => s.isActive) || null;
        setActiveSession(active);

        // If there's an active session and no selected session yet, default selected to active
        if (active && !selectedSession) {
          setSelectedSession(active);
        } else if (!active && data.length > 0 && !selectedSession) {
          // If no active session, just default to the first one available
           setSelectedSession(data[0]);
        }
      } else {
        // Students just get the active session
        const res = await fetch("/api/sessions/active");
        if (res.status === 404) {
          setActiveSession(null);
          setSelectedSession(null);
          setSessions([]);
        } else if (!res.ok) {
           throw new Error("Failed to fetch active session");
        } else {
            const data = await res.json();
            setActiveSession(data);
            setSelectedSession(data); // Students always have selected = active
            setSessions([data]);
        }
      }
    } catch (err: any) {
      console.error("SessionContext Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user, role, authLoading]);

  const setSelectedSessionId = (id: string) => {
    if (role !== "admin") return; // Students can't change session context

    const session = sessions.find((s) => s._id?.toString() === id || (s as any).id === id);
    if (session) {
      setSelectedSession(session);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        selectedSession,
        sessions,
        loading,
        error,
        setSelectedSessionId,
        refreshSessions: fetchSessions,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
}
