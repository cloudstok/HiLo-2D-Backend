import { Server, Socket } from 'socket.io';
import { BetReqData, cashOutReqData } from '../interfaces';
import { disConnect, placeBet, cashOut } from '../module/bets/bets-session';

export const eventRouter = async (io: Server, socket: Socket): Promise<void> => {
  socket.on("place_bet", async(data:BetReqData)=> await placeBet(socket, data));
  socket.on("cashout", async(data:cashOutReqData)=> await cashOut(socket, data))
  socket.on('disconnect', async () => await disConnect(io, socket));
};