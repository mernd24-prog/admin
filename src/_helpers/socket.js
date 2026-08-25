import { io } from "socket.io-client";
import { socketApiUrl } from "./axiosProvider";
import { getAuthToken } from "./globalFunctions";

let socket = null;
const listeners = new Set();
const joinedOrderIds = new Set();
const seenEventIds = new Set();

const publishRealtimeUpdate = (event) => {
  if (event?.id && seenEventIds.has(event.id)) return;
  if (event?.id) {
    seenEventIds.add(event.id);
    if (seenEventIds.size > 500) {
      seenEventIds.delete(seenEventIds.values().next().value);
    }
  }
  listeners.forEach((listener) => listener(event));
};

const bindSocketEvents = (nextSocket) => {
  nextSocket.on("connect", () => {
    console.info(`Realtime connected (${nextSocket.id}) via ${nextSocket.io.engine.transport.name}`);
    joinedOrderIds.forEach((orderId) => nextSocket.emit("join:order", orderId));
    window.dispatchEvent(new CustomEvent("realtime:connected"));
  });
  nextSocket.on("connect_error", (error) => {
    console.error("Realtime connection failed:", error?.message || error);
    window.dispatchEvent(
      new CustomEvent("realtime:connection-error", {
        detail: { message: error?.message || "Realtime connection failed" },
      }),
    );
  });
  nextSocket.io.on("open", () => {
    nextSocket.io.engine?.once("upgrade", (transport) => {
      console.info(`Realtime transport upgraded to ${transport.name}`);
    });
  });
  nextSocket.on("realtime:update", publishRealtimeUpdate);
};

const initializeSocket = () => {
  const token = getAuthToken();

  if (token) {
    socket = io(socketApiUrl, {
      auth: {
        token: `Bearer ${token}`,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 10000,
    });
    bindSocketEvents(socket);
  } else {
    console.warn("No token found for socket auth");
  }
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  initializeSocket();
  socket && socket.connect();
};

export const socketConnection = () => {
  if (!socket) {
    initializeSocket();
  }
  if (socket && !socket.connected) {
    socket.connect();
  }
  return socket;
};

export const subscribeRealtime = (listener) => {
  listeners.add(listener);
  socketConnection();
  return () => listeners.delete(listener);
};

export const joinOrderRoom = (orderId) => {
  const normalizedId = String(orderId || "").trim();
  if (!normalizedId) return () => {};
  joinedOrderIds.add(normalizedId);
  const activeSocket = socketConnection();
  if (activeSocket?.connected) activeSocket.emit("join:order", normalizedId);
  return () => joinedOrderIds.delete(normalizedId);
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "accessToken") reconnectSocket();
  });
  window.addEventListener("auth:tokens-updated", reconnectSocket);
  window.addEventListener("auth:logout", () => socket?.disconnect());
}
