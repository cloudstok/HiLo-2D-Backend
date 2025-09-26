import { Server, Socket } from 'socket.io';
import { BetReqData } from '../interfaces';
import { disConnect } from '../module/bets/bets-session';

export const eventRouter = async (io: Server, socket: Socket): Promise<void> => {
  socket.on('disconnect', async () => await disConnect(io, socket));
};