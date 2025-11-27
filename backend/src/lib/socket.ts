import type { Server } from "socket.io";

let io: Server | null = null;

export function registerSocket(server: Server) {
  io = server;
}

export function getSocket() {
  return io;
}
