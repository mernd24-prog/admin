import { io } from "socket.io-client";
import { socketApiUrl } from "./axiosProvider";
import { getAuthToken } from "./globalFunctions";

let socket = null;

const initializeSocket = () => {
  const token = getAuthToken();

  if (token) {
    socket = io(socketApiUrl, {
      auth: {
        token: `Bearer ${token}`,
      },
      autoConnect: false,
    });
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
