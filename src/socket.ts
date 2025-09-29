import { Server, Socket } from 'socket.io';
import { getUserDataFromSource } from './module/players/player-event';
import { eventRouter } from './routers/event-router';
import { setCache, deleteCache } from './utils/redis-connection';
import { messageRouter } from './routers/message-router';
import { initGame } from './module/rooms/room-events';


export const initSocket = (io: Server): void => {
  initGame(io);
  io.on('connection', async (socket: Socket) => {

    const { token, game_id } = socket.handshake.query as { token?: string; game_id?: string };

    if (!token || !game_id) {
      socket.disconnect(true);
      console.log('Mandatory params missing', token);
      return;
    }

    const userData = await getUserDataFromSource(token, game_id);

    if (!userData) {
      console.log('Invalid token', token);
      socket.disconnect(true);
      return;
    }


    socket.emit('info',
      {
        user_id: userData.userId,
        operator_id: userData.operatorId,
        balance: userData.balance && typeof userData.balance === 'number' ? userData.balance : Number(userData.balance) || 0,
      },
    );
    

    await setCache(`PL:${socket.id}`, JSON.stringify({ ...userData, socketId: socket.id }), 3600);
    messageRouter(io, socket);
    eventRouter(io, socket);

    socket.on('error', (error: Error) => {
      console.error(`Socket error: ${socket.id}. Error: ${error.message}`);
    });
  });
};