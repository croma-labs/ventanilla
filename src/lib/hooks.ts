import { useEffect, useState, useSyncExternalStore } from "react";

const reducedQuery = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = matchMedia(reducedQuery);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => matchMedia(reducedQuery).matches,
    () => false,
  );
}

export function usePageVisible() {
  return useSyncExternalStore(
    (notify) => {
      document.addEventListener("visibilitychange", notify);
      return () => document.removeEventListener("visibilitychange", notify);
    },
    () => !document.hidden,
    () => true,
  );
}

export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = matchMedia("(width < 768px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return mobile;
}
