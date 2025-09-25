// event-router.ts
import { Server, Socket } from 'socket.io';
import { BetReqData } from '../interfaces';
import { disConnect, placeBet, settleBet, joinRoomHandler, exitRoomHandler } from '../module/bets/bets-session';

// main router for socket events
export const eventRouter = (io: Server, socket: Socket): void => {
  // room-formatted message router (if legacy text messages used)
  socket.on('message', async (data: string) => {
    try {
      const parts = (data || '').split(':');
      const cmd = parts[0].toUpperCase();
      switch (cmd) {
        case 'JR':
          return await joinRoomHandler(io, socket, Number(parts[1]));
        case 'ER':
          return await exitRoomHandler(io, socket, Number(parts[1]));
        case 'RS':
          // room stats event - you can implement room stats separately
          socket.emit('room_stats_data', {});
          return;
        default:
          socket.emit('betError', { message: 'Unknown message command' });
      }
    } catch (err) {
      socket.emit('betError', { message: 'message handler error' });
    }
  });

  socket.on('bet', async (data: BetReqData) => {
    // place bet
    await placeBet(io, socket, data);
  });

  socket.on('collect', async (data: BetReqData) => {
    // manual collect
    await settleBet(socket, data);
  });

  socket.on('join_room', async (data: { roomId: number }) => {
    await joinRoomHandler(io, socket, data.roomId);
  });

  socket.on('exit_room', async (data: { roomId: number }) => {
    await exitRoomHandler(io, socket, data.roomId);
  });

  socket.on('disconnect', async () => {
    await disConnect(io, socket);
  });
};
