import { useEffect, useRef } from "react";

type PollOptions = {
  paused?: boolean;
  immediate?: boolean;
};

export function usePoll(fn: () => Promise<unknown> | void, intervalMs: number, options: PollOptions = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (options.paused) return;
    let cancelled = false;
    let inFlight = false;
    let timer: number | undefined;

    async function tick() {
      if (cancelled) return;
      if (document.visibilityState === "hidden") return;
      if (inFlight) return;
      inFlight = true;
      try {
        await fnRef.current();
      } catch {
        /* surface errors through toasts elsewhere */
      } finally {
        inFlight = false;
      }
    }

    if (options.immediate !== false) {
      tick();
    }
    timer = window.setInterval(tick, intervalMs);

    function onVis() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, options.paused, options.immediate]);
}
