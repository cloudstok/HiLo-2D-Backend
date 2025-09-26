import { Server, Socket } from "socket.io";
import { exitRoomHandler, joinRoomHandler } from "../module/bets/bets-session";
import { createLogger } from '../utils/logger';

const logger = createLogger('Event');

export const messageRouter = async (io: Server, socket: Socket): Promise<void> => {
    socket.on('message', (data: string) => {
        logger.info(data);
        const event = data.split(':');
        switch (event[0].toUpperCase()) {
            case 'JR': return joinRoomHandler(io, socket, event[1]);
            case 'LR': return exitRoomHandler(io, socket, event[1]);
        }
    });
};