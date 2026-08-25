import { useEffect, useRef, useState } from "react";
import { joinOrderRoom, subscribeRealtime } from "../_helpers/socket";

const domainOf = (eventName = "") => String(eventName).split(".")[0];

export default function useRealtimeRefresh(domains = [], options = {}) {
  const [revision, setRevision] = useState(0);
  const timerRef = useRef(null);
  const domainKey = [...domains].sort().join(",");
  const orderId = options.orderId ? String(options.orderId) : "";

  useEffect(() => {
    const allowedDomains = new Set(domainKey.split(",").filter(Boolean));
    const unsubscribe = subscribeRealtime((event) => {
      if (allowedDomains.size && !allowedDomains.has(domainOf(event?.eventName))) return;
      if (orderId) {
        const eventOrderId = String(
          event?.payload?.orderId || event?.payload?.order_id || event?.aggregateId || "",
        );
        if (eventOrderId && eventOrderId !== orderId) return;
      }
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(
        () => setRevision((current) => current + 1),
        options.debounceMs ?? 250,
      );
    });
    const leaveOrderRoom = orderId ? joinOrderRoom(orderId) : () => {};
    const recoverMissedEvents = () => setRevision((current) => current + 1);
    window.addEventListener("realtime:connected", recoverMissedEvents);
    return () => {
      window.clearTimeout(timerRef.current);
      unsubscribe();
      leaveOrderRoom();
      window.removeEventListener("realtime:connected", recoverMissedEvents);
    };
  }, [domainKey, orderId, options.debounceMs]);

  return revision;
}
