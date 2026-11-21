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

// Polls the server for its downloads while the component is mounted.
export function useAria2Tasks(aria2: Aria2Client): Aria2Tasks {
  const [state, setState] = useState<Aria2Tasks>({ loading: true, failed: false, globalStat: GlobalStat.empty(), tasks: [] });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      try {
        const globalStat = await aria2.getGlobalStat();
        const tasks = await aria2.getTasks(globalStat.numWaiting, globalStat.numStopped);
        if (!cancelled) {
          setState({ loading: false, failed: false, globalStat, tasks });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setState((previous) => ({ ...previous, loading: false, failed: true }));
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

  return state;
}
