import { useEffect, useState } from "react";
import { GlobalStat } from "@/domain/global-stat";
import type { Task } from "@/domain/task";
import type { Aria2Client } from "@/services/aria2-client";

export const POLL_INTERVAL_MS = 1000;

export interface Aria2Tasks {
  // True until the first answer, or failure, of the server.
  loading: boolean;
  // Whether the last attempt to reach the server failed.
  failed: boolean;
  globalStat: GlobalStat;
  tasks: Task[];
}

const initialTasks = (): Aria2Tasks => ({ loading: true, failed: false, globalStat: GlobalStat.empty(), tasks: [] });

interface State {
  // The client the tasks come from.
  client: Aria2Client;
  tasks: Aria2Tasks;
}

// The tasks of the client, or the loading state when they come from a previous client.
const tasksOf = (state: State, client: Aria2Client): Aria2Tasks => (state.client === client ? state.tasks : initialTasks());

// Polls the server for its downloads while the component is mounted.
export function useAria2Tasks(aria2: Aria2Client): Aria2Tasks {
  // Kept with the client it comes from: a new client (the server settings changed) starts over from the loading state
  // instead of showing the previous server's tasks.
  const [state, setState] = useState<State>(() => ({ client: aria2, tasks: initialTasks() }));

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      try {
        const globalStat = await aria2.getGlobalStat();
        const tasks = await aria2.getTasks(globalStat.numWaiting, globalStat.numStopped);
        if (!cancelled) {
          setState({ client: aria2, tasks: { loading: false, failed: false, globalStat, tasks } });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setState((previous) => ({ client: aria2, tasks: { ...tasksOf(previous, aria2), loading: false, failed: true } }));
        }
      }
      if (!cancelled) {
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    // poll() handles its own errors.
    void poll();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [aria2]);

  return tasksOf(state, aria2);
}
