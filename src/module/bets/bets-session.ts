import { generateUUIDv7, updateBalanceFromAccount } from '../../utils/common-function';
import { appConfig } from '../../utils/app-config';
import { setCache, getCache, deleteCache } from '../../utils/redis-connection';
import { getUserIP, getRooms as getRoomTemplates } from '../../utils/helper-function';
import { createLogger } from '../../utils/logger';
import { BetResult, BetsData, Settlement, AccountsResult, BetReqData, BetsObject, FinalUserData, BetObject, cashOutReqData } from '../../interfaces';
import { read, write } from '../../utils/db-connection';
import { Server as IOServer, Server, Socket } from 'socket.io';
import { addSettleBet } from './bets-db';
import { roomPlayerCount, roomWiseHistory } from '../rooms/room-events';
import { logEventAndEmitResponse, eventEmitter } from '../../utils/helper-function';
import { calculateWinnings, drawCard , betTypeMap} from '../games/game';

const logger = createLogger('Bets', 'jsonl');
const settlBetLogger = createLogger('Settlement', 'jsonl');
const erroredLogger = createLogger('ErrorData', 'plain');
const cashoutLogger = createLogger("cashOut", "jsonl");

const cards:any[] = [];
export function emitInitialCards() {
  const count = 8
  for (let i = 0; i < count; i++) {
    const card = drawCard();
    cards.push(card);
  }
}

export const joinRoomHandler = async (io: IOServer, socket: Socket, roomId: string) => {
  try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);

        if (!stringifiedPlayerDetails) {
            logEventAndEmitResponse({ roomId }, 'Player details not found', 'jnRm');
            eventEmitter(socket, 'bet_error', { message: 'Player details not found' });
            return;
        };

        const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const isPlayerExistInRoom = await getCache(`rm-${operatorId}:${user_id}`);

        if (isPlayerExistInRoom) {
            exitRoomHandler(io, socket, isPlayerExistInRoom);
        };

        if (roomPlayerCount[Number(roomId)]) roomPlayerCount[Number(roomId)]++;
        socket.join(roomId);
        await setCache(`rm-${operatorId}:${user_id}`, roomId);
        eventEmitter(socket, 'jnRm', { message: 'Room joined successfully', roomId });
        emitInitialCards();
        // const historyFromDb = await getRoomwiseHistory(Number(roomId));
        const cardHistory = /*historyFromDb && historyFromDb.length > 0 ? historyFromDb : */cards;

        eventEmitter(socket, "rmSts", {
           //history: historyFromDb,
            cardHistory: cardHistory,
           // players: roomPlayerCount[Number(roomId)] || 0,
        });
        return;
    } catch (err) {
        logEventAndEmitResponse({ roomId }, 'Something went wrong, unable to join room', 'jnRm');
        eventEmitter(socket, 'bet_error', { message: 'Something went wrong, unable to join room' });
        socket.disconnect(true);
        return;
  }
};

export const exitRoomHandler = async (io: IOServer, socket: Socket, roomId: string) => {
  try {

        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);
        if (!stringifiedPlayerDetails) {
            logEventAndEmitResponse({ roomId }, 'Player details not found', 'exRm');
            eventEmitter(socket, 'bet_error', { message: 'Player details not found' });
            return;
        };
        const playerDetails: FinalUserData = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const isPlayerExistInRoom = await getCache(`rm-${operatorId}:${user_id}`);
        if (!isPlayerExistInRoom) {
            logEventAndEmitResponse({ roomId, ...playerDetails }, 'Player does not belong to room', 'exRm');
            eventEmitter(socket, 'bet_error', { message: 'Player does not belong to room' });
            return;
        };
        socket.leave(roomId);
        await deleteCache(`rm-${operatorId}:${user_id}`);
        // delete cache of previos satlement
        await deleteCache(`CA:${user_id}`)
        eventEmitter(socket, 'lvRm', { message: 'Room left successfully', roomId });
        return;
    } catch (err) {
        logEventAndEmitResponse({ roomId }, 'Something went wrong, unable to leave room', 'exRm');
        eventEmitter(socket, 'bet_error', { message: 'Something went wrong, unable to leave room' });
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



export const placeBet = async (socket: Socket, betData: BetReqData) => {
  try {
    emitInitialCards();
    console.log(cards);
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

    const card = drawCard();
    cards.push(card);

    socket.emit("cards_history", {
      cards,
      cards_count: cards.length
    });

    const latestCard = cards[cards.length - 1];
    const secondLatestCard = cards[cards.length - 2];

    const { status, mult } = await calculateWinnings(category, latestCard, secondLatestCard);

    const prevCache = await getCache(`CA:${user_id}`);
    let bank = 0, win_count = 0;

    if (prevCache) {
      const prevData = JSON.parse(prevCache);
      bank += prevData.bank || 0;
      win_count += prevData.win_count || 0;
    }

    if (status === "win") {
      bank += mult;
      win_count++;
      await setCache(`CA:${user_id}`, JSON.stringify({ bank, win_count, btAmt, category,status, socketId: socket.id }));
      socket.emit("result", { cashout: bank, win_count , btAmt, latestCard, category, status: "win" });
    } else {
      await deleteCache(`CA:${user_id}`);
      socket.emit("result", { cashout: 0, win_count: 0, latestCard, category, status: "loss" });
    }
    return;
  } catch (err) {
    console.error("Error in placeBet:", err);
    socket.emit("bet_error", "Unexpected error occurred");
  }
};



export const cashOut = async (socket: Socket, cashData: cashOutReqData) => {
  try {
    const playerDetailsStr = await getCache(`PL:${socket.id}`);
    if (!playerDetailsStr) {
      socket.emit("bet_error", "Player details not found");
      return;
    }

    const playerDetails: FinalUserData = JSON.parse(playerDetailsStr);
    const { user_id, operatorId, token, game_id } = playerDetails;
    const prevCache = await getCache(`CA:${user_id}`);
    if (!prevCache) {
      socket.emit("bet_error", "No winnings available for cashout");
      return;
    }
    const { bank, win_count, btAmt, category, status } = JSON.parse(prevCache);
    if (!bank || bank <= 0) {
      socket.emit("bet_error", "No valid winnings to cashout");
      return;
    }
  
    const userbets = { betAmount: btAmt, category: category };

    const settlement: Settlement = {
      Settlement_id: generateUUIDv7() + "-" + cashData.roomId,
      user_id,
      operator_id: operatorId,
      betAmount: btAmt,
      userBets: userbets,
      roomId: cashData.roomId,
      status: status,
      winAmount: bank,
    };

    await addSettleBet(settlement);

    // Credit the winnings
    const creditRes: AccountsResult = await updateBalanceFromAccount(
      {
        id: settlement.Settlement_id,
        bet_amount: settlement.winAmount,
        game_id,
        ip: getUserIP(socket),
        user_id,
      },
      "CREDIT",
      { game_id, operatorId, token }
    );

    if (!creditRes.status) {
      socket.emit("bet_error", "Unable to credit winnings, please retry");
      return;
    }

    await deleteCache(`CA:${user_id}`);

    playerDetails.balance += settlement.winAmount;
    await setCache(`PL:${socket.id}`, JSON.stringify(playerDetails));

    const winData = {
      winAmount: settlement.winAmount,
      win_count,
      balance: playerDetails.balance,
      txn_id: creditRes.txn_id,
    };

    cashoutLogger.info(
      JSON.stringify({
        socketId: socket.id,
        user_id : user_id,
        playerDetails,
        winData,
      })
    );

    socket.emit("cash_out_complete", winData);
  } catch (err) {
    socket.emit("bet_error", "Something went wrong during cashout");
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
    socket.emit('bet_error', { message: 'Unable to disconnect cleanly' });
  }
};


export const roomStats = async (io: Server, socket: Socket) => {
    try {
        const stringifiedPlayerDetails = await getCache(`PL:${socket.id}`);
        if (!stringifiedPlayerDetails) {
            eventEmitter(socket, 'bet_error', { message: 'Invalid Player details' });
            return;
        };
        const playerDetails = JSON.parse(stringifiedPlayerDetails);
        const { user_id, operatorId } = playerDetails;
        const existingRoom = await getCache(`rm-${operatorId}:${user_id}`);
        if (!existingRoom) {
            eventEmitter(socket, 'bet_error', { message: 'user deos not exist in any room' });
            return;
        };
        console.log(existingRoom);
        const historyFromDb = await getRoomwiseHistory(Number(existingRoom));
        const cardHistory = historyFromDb && historyFromDb.length > 0 
            ? historyFromDb 
            :  emitInitialCards();

        eventEmitter(socket, "rmSts", {
            history: historyFromDb,
            cardHistory: cardHistory,
            players: roomPlayerCount[Number(existingRoom)] || 0,
        });
        return;
    } catch (err) {
        eventEmitter(socket, 'bet_error', { message: 'Something went wrong, unable to fetch room stats' });
        return;
    }
}


export const getRoomwiseHistory = async (roomId: number) => {
    try {
        const historyData = await read(
            `SELECT cards FROM settlement WHERE roomId = ${roomId} ORDER BY created_at DESC LIMIT 8`
        );
        return historyData;
    } catch (err) {
        console.error(`Err while getting Rooms history data is:::`, err);
        return null;
    }
};


export const getMatchHistory = async (
    socket: Socket,
    userId: string,
    operator_id: string
) => {
    try {
        const historyData = await read(
            `SELECT * FROM settlement ORDER BY created_at DESC LIMIT 10`
        );
        return socket.emit("historyData", historyData);
    } catch (err) {
        console.error(`Err while getting user history data is:::`, err);
        return;
    }
};


