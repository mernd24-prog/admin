import { useEffect, useRef } from "react";
import { axiosPrivate } from "./axiosProvider";
import { getStoredAccessToken } from "./authSession";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Polls /auth/status every 30 s while the user is logged in.
 * The existing axios interceptor handles any SESSION_INVALID / FORCE_LOGOUT
 * error code returned, so no explicit forceLogout() call is needed here.
 */
export const useSessionHeartbeat = () => {
  const timerRef = useRef(null);

  useEffect(() => {
    const ping = () => {
      if (!getStoredAccessToken()) return;
      axiosPrivate.get("auth/status").catch(() => {
        // Errors are handled by the axios interceptor; suppress unhandled rejection.
      });
    };

    timerRef.current = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(timerRef.current);
  }, []);
};
