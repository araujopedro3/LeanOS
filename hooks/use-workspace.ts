"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { initialImprovements, initialProcesses, initialTasks } from "@/lib/leanos-data";
import { commitWorkspace, readSession, readWorkspace, SESSION_STORAGE_KEY, WorkspaceConflictError, type SessionUser, type Workspace, type WorkspaceChanges } from "@/lib/leanos-storage";
import { DomainError } from "@/lib/leanos-domain";

type Records = Pick<Workspace, "processes" | "tasks" | "improvements" | "employees">;
type State = Records & { sessionUser: SessionUser | null; workspace: Workspace | null; loading: boolean; loadError: string | null; conflict: boolean; generation: number };
const emptyRecords: Records = { processes: [], tasks: [], improvements: [], employees: [] };
const initialState: State = { ...emptyRecords, sessionUser: null, workspace: null, loading: true, loadError: null, conflict: false, generation: 0 };

export function useWorkspace() {
  const [state, setState] = useState(initialState);
  const current = useRef(state);
  const publish = useCallback((next: State) => { current.current = next; setState(next); }, []);

  const load = useCallback((sessionUser: SessionUser | null) => {
    const next: State = { ...initialState, loading: false, sessionUser, generation: current.current.generation + 1 };
    try {
      if (sessionUser?.role === "admin") {
        next.processes = structuredClone(initialProcesses);
        next.tasks = structuredClone(initialTasks);
        next.improvements = structuredClone(initialImprovements);
      } else if (sessionUser) {
        const workspace = readWorkspace(window.localStorage, sessionUser.companyName);
        if (!workspace) throw new DomainError("Empresa não encontrada neste navegador.");
        Object.assign(next, workspace, { workspace });
      }
    } catch (error) {
      next.loadError = error instanceof DomainError ? error.message : "Não foi possível carregar os dados locais. Os registros foram preservados.";
    }
    publish(next);
  }, [publish]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        // Migrate the old shared session once; new sessions are isolated per tab.
        let session = readSession(window.sessionStorage);
        if (!session) {
          session = readSession(window.localStorage);
          if (session) {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        }
        load(session);
      } catch {
        load(null);
        toast.error("Não foi possível recuperar a sessão. Entre novamente.");
      }
    });
    return () => { cancelled = true; };
  }, [load]);

  const enterSession = useCallback((session: SessionUser) => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    load(session);
  }, [load]);

  const logout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      load(null);
      return true;
    } catch {
      toast.error("Não foi possível encerrar a sessão neste navegador.");
      return false;
    }
  }, [load]);

  const reload = useCallback(() => load(current.current.sessionUser), [load]);

  const commitChanges = useCallback((update: WorkspaceChanges | ((records: Records) => WorkspaceChanges)) => {
    const snapshot = current.current;
    // A callback from a closed form/account cannot mutate the next session.
    if (snapshot.generation !== state.generation || !snapshot.sessionUser || snapshot.loading || snapshot.loadError) return false;
    try {
      const changes = typeof update === "function" ? update(snapshot) : update;
      if (snapshot.sessionUser.role === "company") {
        if (!snapshot.workspace) return false;
        const workspace = commitWorkspace(window.localStorage, snapshot.workspace, changes);
        publish({ ...snapshot, ...workspace, workspace, conflict: false });
      } else publish({ ...snapshot, ...changes });
      return true;
    } catch (error) {
      if (error instanceof WorkspaceConflictError) publish({ ...snapshot, conflict: true });
      toast.error(error instanceof DomainError || error instanceof WorkspaceConflictError ? error.message : "Não foi possível salvar neste navegador. Libere espaço e tente novamente.");
      return false;
    }
  }, [state.generation, publish]);

  return { ...state, companyProfile: state.workspace?.profile ?? null, commitChanges, enterSession, logout, reload };
}
