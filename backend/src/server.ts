import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { env } from "./config/env";
import { registerSocket } from "./lib/socket";

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.SOCKET_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

registerSocket(io);

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
});

const PORT = env.PORT;

server.listen(PORT, () => {
  console.log(`VoteSecure backend running on http://localhost:${PORT}`);
});
