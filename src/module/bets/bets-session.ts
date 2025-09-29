import { generateUUIDv7, updateBalanceFromAccount } from '../../utils/common-function';
import { appConfig } from '../../utils/app-config';
import { setCache, getCache, deleteCache } from '../../utils/redis-connection';
import { getUserIP, getRooms as getRoomTemplates } from '../../utils/helper-function';
import { createLogger } from '../../utils/logger';
import { BetResult, BetsData, Settlement, AccountsResult, BetReqData, BetsObject, FinalUserData, BetObject } from '../../interfaces';
import { read, write } from '../../utils/db-connection';
import { Server as IOServer, Server, Socket } from 'socket.io';
import { addSettleBet } from './bets-db';
import { roomPlayerCount } from '../rooms/room-events';
import { logEventAndEmitResponse, eventEmitter } from '../../utils/helper-function';
import { calculateWinnings, drawCard } from '../games/game';

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

const roomConfigs: Record<number, number[]> = {
  101: [1, 2, 3, 4, 5, 6],
  102: [3, 4, 5, 6, 8, 9],
  103: [5, 6, 8, 9, 10, 11],
  104: [10, 11, 12, 14, 15, 16],
};

const validateBet = (btAmt: number, roomId: number, balance: number, socket: Socket): boolean => {
  if (isNaN(btAmt)) {
    socket.emit("bet_error", "Invalid Bet amount type");
    return false;
  }
  if (btAmt > balance) {
    socket.emit("bet_error", "Insufficient Balance");
    return false;
  }
  if (btAmt < appConfig.minBetAmount || btAmt > appConfig.maxBetAmount) {
    socket.emit("bet_error", "Invalid bet amount.");
    return false;
  }
  const validAmounts = roomConfigs[roomId];

  if (!validAmounts.includes(btAmt)) {
    socket.emit("bet_error",
      `Invalid bet amount. Allowed values: ${validAmounts.join(", ")}`,
    );
    return false;
  }
  return true;
};

const cards:any[] = [];
export function emitInitialCards() {
  const count = 8
  for (let i = 0; i < count; i++) {
    const card = drawCard();
    cards.push(card);
  }

}

export const placeBet = async (socket: Socket, betData: BetReqData) => {
  try {
    const playerDetailsStr = await getCache(`PL:${socket.id}`);
    if (!playerDetailsStr) {
      socket.emit("bet_error", "Player details not found")
      return;
    }

    const parsedPlayerDetails = JSON.parse(playerDetailsStr);
    const { user_id, operatorId, token, game_id, balance } = parsedPlayerDetails;
    const { roomId, btAmt, category } = betData;

    if (!validateBet(btAmt, roomId, balance, socket)) return;

    const roundId = generateUUIDv7();
    const userIP = getUserIP(socket);
    const betObj: BetObject = { roundId, token, socket_id: parsedPlayerDetails.socketId, game_id, ip: userIP };
    const debitRes = await updateBalanceFromAccount({
      id: roundId,
      bet_amount: btAmt,
      game_id,
      ip: userIP,
      user_id
    }, "DEBIT", { game_id, operatorId, token });

    if (!debitRes.status) {
      return socket.emit("bet_error", "message : Bet Cancelled by Upstream while debiting from balance ");
    }
    if (debitRes.txn_id) betObj.debit_txn_id = debitRes.txn_id;
    parsedPlayerDetails.balance -= btAmt;
    await setCache(parsedPlayerDetails, JSON.stringify(parsedPlayerDetails));

    socket.emit('info', {
      user_id,
      operator_id: operatorId,
      balance: parsedPlayerDetails.balance
    });

    const card = drawCard()

    cards.push(card)

    socket.emit("cards_history", {
      cards,
      cards_count: cards.length,
    });
    let bank = 0
    let win_count = 0
    const lastestCard = cards[-1]
    const secondLatestCard = cards[-2]

    const { status, mult } = await calculateWinnings(category, lastestCard, secondLatestCard)
    bank += mult
    socket.emit("cards_history", {
      cards,
      cards_count: cards.length,
    });


    if(status == "win"){
      win_count++
      socket.emit("result",{
        cashout:bank,
        win_count : win_count
      }
      )
    }



    



    return;
  } catch (err) {
    // erroredLogger.error(betData, 'Bet cannot be placed', err);
    socket.emit('bet_error', 'Bet cannot be placed');
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
        const playerDetails = JSON.parse(stringifiedPlayerDetails);
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