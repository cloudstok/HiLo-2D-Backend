import { generateUUIDv7, updateBalanceFromAccount } from '../../utils/common-function';
import { appConfig } from '../../utils/app-config';
import { setCache, getCache, deleteCache } from '../../utils/redis-connection';
import { getUserIP, getRooms as getRoomTemplates } from '../../utils/helper-function';
import { createLogger } from '../../utils/logger';
import {BetResult, BetsData, Settlement,  SingleBetData,  AccountsResult,  BetReqData,  BetsObject,  FinalUserData,  PlayerDetails} from '../../interfaces';
import { read, write } from '../../utils/db-connection';
import { Server as IOServer, Server, Socket } from 'socket.io';
import { addSettleBet } from './bets-db';
import { roomPlayerCount } from '../rooms/room-events';
import { logEventAndEmitResponse, eventEmitter } from '../../utils/helper-function';

const logger = createLogger('Bets', 'jsonl');
const settlBetLogger = createLogger('Settlement', 'jsonl');
const erroredLogger = createLogger('ErrorData', 'plain');

export const joinRoomHandler = async (io: IOServer, socket: Socket, roomId: string) => {
  try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);

        if (!stringifiedPlayerDetails) {
            logEventAndEmitResponse({ roomId }, 'Player details not found', 'jnRm');
            eventEmitter(socket, 'betError', { message: 'Player details not found' });
            return;
        };

        const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const isPlayerExistInRoom = await getCache(`rm-${operatorId}:${user_id}`);

        if (isPlayerExistInRoom) {
            logEventAndEmitResponse({ roomId, ...playerDetails }, 'Player already exist in another room', 'jnRm');
            eventEmitter(socket, 'betError', { message: 'Player already exist in another room' });
            return;
        };

        if (roomPlayerCount[Number(roomId)]) roomPlayerCount[Number(roomId)]++;
        socket.join(roomId);
        await setCache(`rm-${operatorId}:${user_id}`, roomId);
        eventEmitter(socket, 'jnRm', { message: 'Room joined successfully', roomId });
        eventEmitter(socket, 'rmSts', {
            // what are the things you want emit
        });
        return;
    } catch (err) {
        logEventAndEmitResponse({ roomId }, 'Something went wrong, unable to join room', 'jnRm');
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to join room' });
        socket.disconnect(true);
        return;
  }
};

export const exitRoomHandler = async (io: IOServer, socket: Socket, roomId: string) => {
  try {

        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);
        if (!stringifiedPlayerDetails) {
            logEventAndEmitResponse({ roomId }, 'Player details not found', 'exRm');
            eventEmitter(socket, 'betError', { message: 'Player details not found' });
            return;
        };
        const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const isPlayerExistInRoom = await getCache(`rm-${operatorId}:${user_id}`);
        if (!isPlayerExistInRoom) {
            logEventAndEmitResponse({ roomId, ...playerDetails }, 'Player does not belong to room', 'exRm');
            eventEmitter(socket, 'betError', { message: 'Player does not belong to room' });
            return;
        };
        socket.leave(roomId);
        if (roomPlayerCount[Number(roomId)]) roomPlayerCount[Number(roomId)]--
        io.emit('message', { eventName: 'plCnt', data: roomPlayerCount });
        await deleteCache(`rm-${operatorId}:${user_id}`);
        eventEmitter(socket, 'lvRm', { message: 'Room left successfully', roomId });
        return;
    } catch (err) {
        logEventAndEmitResponse({ roomId }, 'Something went wrong, unable to leave room', 'exRm');
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to leave room' });
        socket.disconnect(true);
        return;
    }
};

export const disConnect = async (io: Server, socket: Socket) => {
  try {
    const playerStr = await getCache(`PL:${socket.id}`);
    if (playerStr) {
      const playerDetails: FinalUserData = JSON.parse(playerStr);
      const { user_id, operatorId } = playerDetails;
      const existingRoom = await getCache(`rm-${operatorId}:${user_id}`);
      if (existingRoom) {
        socket.leave(existingRoom);
        if (roomPlayerCount[Number(existingRoom)]) roomPlayerCount[Number(existingRoom)]--;
      }
      await deleteCache(`PL:${socket.id}`);
      await deleteCache(playerDetails.id);
      await deleteCache(`rm-${operatorId}:${user_id}`);
      io.emit('plCnt', roomPlayerCount);
    }
    socket.disconnect(true);
  } catch (err) {
    logger.error('disconnect error');
    socket.emit('betError', { message: 'Unable to disconnect cleanly' });
  }
};


export const roomStats = async (io: Server, socket: Socket) => {
    try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);
        if (!stringifiedPlayerDetails) {
            eventEmitter(socket, 'betError', { message: 'Invalid Player details' });
            return;
        };
        const playerDetails: PlayerDetails = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const existingRoom = await getCache(`rm-${operatorId}:${user_id}`);
        if (!existingRoom) {
            eventEmitter(socket, 'betError', { message: 'user deos not exist in any room' });
            return;
        };
        eventEmitter(socket, 'rmSts', {
            //what you want to emit like history card , card probability
        });
        return;
    } catch (err) {
        eventEmitter(socket, 'betError', { message: 'Something went wrong, unable to fetch room stats' });
        return;
    }
}