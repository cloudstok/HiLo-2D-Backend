import { Server as IOServer, Socket } from "socket.io";
import { createLogger } from "../../utils/logger";

const logger = createLogger("Card_Hi_lo_2D", "jsonl");

export const ROOMS = [
  { room_id: 101, room_name: "Friendly", min_bet: 10, max_bet: 100 },
  { room_id: 102, room_name: "Casual", min_bet: 50, max_bet: 500 },
  { room_id: 103, room_name: "Expert", min_bet: 100, max_bet: 1000 },
  { room_id: 104, room_name: "High Roller", min_bet: 500, max_bet: 5000 },
];


export const roomPlayerCount: { [key: number]: number } = {
  101: 0,
  102: 0,
  103: 0,
  104: 0,
};

export const roomWiseHistory: {
  [key: number]: { userId: string; bet: number; result: string }[];
} = {
  101: [],
  102: [],
  103: [],
  104: [],
};


export const sendGameOpen = (socket: Socket) => {
  socket.emit("game_open", {
    rooms: ROOMS,
    players: roomPlayerCount,
  });
};


export const broadcastGameOpen = (io: IOServer) => {
  io.emit("game_open", {
    rooms: ROOMS,
    players: roomPlayerCount,
  });
};