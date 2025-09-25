// bets-session.ts
import { generateUUIDv7, updateBalanceFromAccount } from '../../utils/common-function';
import { appConfig } from '../../utils/app-config';
import { setCache, getCache, deleteCache } from '../../utils/redis-connection';
import { calculateWinnings, getUserIP, getRooms as getRoomTemplates } from '../../utils/helper-function';
import { createLogger } from '../../utils/logger';
import {BetResult,  Settlement,  SingleBetData,  AccountsResult,  BetReqData,  BetsObject,  FinalUserData,  PlayerDetails} from '../../interfaces';
import { read, write } from '../../utils/db-connection';
import { Server as IOServer, Server, Socket } from 'socket.io';
import { addSettleBet, insertBets } from './bets-db';
import { roomPlayerCount } from '../rooms/room-events';

const settlBetLogger = createLogger('Settlement', 'jsonl');
const erroredLogger = createLogger('ErrorData', 'plain');
const logger = createLogger('Bets', 'jsonl');


function emitToRoom(io: IOServer | Server, roomId: number | string, eventName: string, data: any) {
  (io as Server).to(String(roomId)).emit(eventName, data);
}


export const getMatchHistory = async (socket: Socket, userId: string , operatorId: string) => {
  try {
    const historyData = await read(`SELECT lobby_id, max_mult, created_at FROM settlement WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`, [userId]);
    socket.emit('historyData', historyData);
  } catch (err) {
    logger.error('Err while getting user history data');
    socket.emit('betError', { message: 'Unable to fetch history' });
  }
};

export const joinRoomHandler = async (io: IOServer, socket: Socket, roomId: number) => {
  try {
    const playerStr = await getCache(`PL:${socket.id}`);
    if (!playerStr) {
      socket.emit('betError', { message: 'Player not found' });
      return;
    }

    const player: FinalUserData = JSON.parse(playerStr);
    const existingRoom = await getCache(`rm-${player.operatorId}:${player.user_id}`);

    if (existingRoom && Number(existingRoom) !== Number(roomId)) {
      // auto cashout for old room before switching
      await settleBet(io, { user_id: player.user_id, roomId: Number(existingRoom), type: 'auto' } as BetReqData);
      socket.leave(String(existingRoom));
      if (roomPlayerCount[Number(existingRoom)]) roomPlayerCount[Number(existingRoom)]--;
    }

    await setCache(`rm-${player.operatorId}:${player.user_id}`, String(roomId));
    socket.join(String(roomId));
    roomPlayerCount[Number(roomId)] = (roomPlayerCount[Number(roomId)] || 0) + 1;

    // set last activity timestamp
    await setCache(`${LAST_ACT_PREFIX}${player.user_id}`, String(Date.now()));

    // respond with joined_room containing balance and room info (balance from player object if available)
    socket.emit('joined_room', {
      roomId,
      balance: player.balance ?? 0,
      roomInfo: { /* you can include min/max/chips here using templates */ }
    });

    // broadcast player counts
    io.emit('plCnt', roomPlayerCount);
    logger.info(`User ${player.user_id} joined room ${roomId}`);
  } catch (err) {
    logger.error('joinRoomHandler error', err);
    socket.emit('betError', { message: 'Failed to join room' });
  }
};

export const exitRoomHandler = async (io: IOServer, socket: Socket, roomId: number) => {
  try {
    const playerStr = await getCache(`PL:${socket.id}`);
    if (!playerStr) {
      socket.emit('betError', { message: 'Player details not found' });
      return;
    }

    const player: FinalUserData = JSON.parse(playerStr);

    // Manual collect any active bets first
    await settleBet(io, { user_id: player.user_id, roomId, type: 'manual' } as BetReqData);

    socket.leave(String(roomId));
    await deleteCache(`rm-${player.operatorId}:${player.user_id}`);

    if (roomPlayerCount[roomId]) roomPlayerCount[roomId]--;
    io.emit('plCnt', roomPlayerCount);

    socket.emit('room_exited', { roomId });
    logger.info(`User ${player.user_id} exited room ${roomId}`);
  } catch (err) {
    logger.error('exitRoomHandler error', err);
    socket.emit('betError', { message: 'Failed to exit room' });
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
        // auto cashout if any active bets
        await settleBet(io, { user_id, roomId: Number(existingRoom), type: 'auto' } as BetReqData);
        socket.leave(existingRoom);
        if (roomPlayerCount[Number(existingRoom)]) roomPlayerCount[Number(existingRoom)]--;
      }
      await deleteCache(`PL:${socket.id}`);
      await deleteCache(playerDetails.id);
      await deleteCache(`rm-${operatorId}:${user_id}`);
      await deleteCache(`${LAST_ACT_PREFIX}${user_id}`);
      io.emit('plCnt', roomPlayerCount);
    }
    socket.disconnect(true);
  } catch (err) {
    logger.error('disconnect error', err);
    socket.emit('betError', { message: 'Unable to disconnect cleanly' });
  }
};

export const placeBet = async (io: IOServer | Server, socket: Socket, betData: BetReqData) => {
  try {
    /**
     * Expected BetReqData:
     * {
     *   user_id,
     *   operatorId,
     *   roomId,
     *   totalAmount,
     *   userBets: [{ chip, betAmount, ... }],
     *   betRefId (optional)
     * }
     */
    const playerDetailsStr = await getCache(`PL:${socket.id}`);
    if (!playerDetailsStr) {
      socket.emit('betError', { message: 'Player details not found' });
      return;
    }
    const player: FinalUserData = JSON.parse(playerDetailsStr);

    // Validate room
    const roomId = Number(betData.roomId);
    const templates = getRoomTemplates ? getRoomTemplates() : [];
    const roomTemplate = templates.find(r => r.roomId === roomId);

    // validation: room exists and bet within min/max (if template present)
    const totalBetAmount = betData.userBets.reduce((s, b) => s + Number(b.betAmount), 0);

    if (!roomTemplate) {
      // not fatal — just warn if you don't have templates
      logger.warn(`Room template not found for ${roomId} — skipping strict min/max checks`);
    } else {
      if (totalBetAmount < roomTemplate.min) {
        socket.emit('betError', { message: `Minimum bet is ${roomTemplate.min}` });
        return;
      }
      if (totalBetAmount > roomTemplate.max) {
        socket.emit('betError', { message: `Maximum bet is ${roomTemplate.max}` });
        return;
      }
    }

    // Optionally check global MAX_BET_AMOUNT env var
    if (process.env.MAX_BET_AMOUNT && totalBetAmount > Number(process.env.MAX_BET_AMOUNT)) {
      socket.emit('betError', { message: 'Bet exceeds maximum allowed amount' });
      return;
    }

    // Reserve/deduct player balance
    const reserveRes = await reservePlayerBalance(player.user_id, player.operatorId, totalBetAmount);
    if (!reserveRes || !(reserveRes as any).success) {
      socket.emit('betError', { message: 'Insufficient balance' });
      return;
    }

    // Insert bet into DB
    const betId = generateUUIDv7();
    const betRecord: BetsObject = {
      bet_id: betId,
      lobby_id: `${roomId}_${Date.now()}`,
      user_id: player.user_id,
      operator_id: player.operatorId,
      bet_amount: totalBetAmount,
      user_bets: JSON.stringify(betData.userBets),
      room_id: roomId,
      settled: 0,
      created_at: new Date()
    };

    await insertBets(betRecord);

    // update last activity
    await setCache(`${LAST_ACT_PREFIX}${player.user_id}`, String(Date.now()));

    // Broadcast to room that bet placed
    emitToRoom(io, roomId, 'bet_placed', {
      userId: player.user_id,
      betId,
      roomId,
      userBets: betData.userBets,
      totalBetAmount
    });

    // send ack to bettor
    socket.emit('bet_placed', { betId, totalBetAmount, status: true });
  } catch (err) {
    erroredLogger.error('Bet cannot be placed', err);
    socket.emit('betError', { message: 'Bet cannot be placed', status: false });
  }
};

export const settleBet = async (ioOrSocket: IOServer | Socket | Server, betData: BetReqData): Promise<void> => {
  try {
    // settle bets for a given user on a room (manual collect, auto cashout, or forced)
    const user_id = betData.user_id;
    const roomId = Number(betData.roomId);
    const settleType = betData.type ?? 'manual';

    // fetch active bets for user in that room
    // NOTE: using parameterized queries: adjust read() signature if necessary
    const activeBets: any[] = await read(`SELECT * FROM bets WHERE user_id = ? AND room_id = ? AND settled = 0`, [user_id, roomId]);
    if (!activeBets || activeBets.length === 0) {
      // nothing to settle
      if ((ioOrSocket as Socket).emit) {
        (ioOrSocket as Socket).emit('bet_collected', { message: 'No active bets', status: false });
      }
      return;
    }

    for (const bet of activeBets) {
      // parse stored user_bets which were saved as JSON
      const userBets = Array.isArray(bet.user_bets) ? bet.user_bets : JSON.parse(bet.user_bets);
      const outcome = calculateWinnings(userBets);

      const settlement: Settlement = {
        settlement_id: generateUUIDv7(),
        bet_id: bet.bet_id,
        user_id,
        room_id: roomId,
        result: JSON.stringify(outcome.winnerData),
        win_amount: outcome.totalWinAmount,
        max_mult: outcome.max_mult,
        created_at: new Date()
      };

      // Save settlement row(s)
      try {
        await addSettleBet([settlement]);
      } catch (err) {
        settlBetLogger.error('Failed to add settlement', err);
      }

      // Credit user with win amount (if any). Our earlier reserve removed bet amount; if user lost,
      // nothing to credit back. If win, credit win amount (not including original stake if gameplay requires).
      if (outcome.totalWinAmount > 0) {
        await updateBalanceFromAccount(user_id, bet.operator_id, outcome.totalWinAmount);
      }

      // Mark bet settled
      await write(`UPDATE bets SET settled = 1, settled_at = ? WHERE bet_id = ?`, [new Date(), bet.bet_id]);

      // Emit settlement result
      // If ioOrSocket is server (io), emit to room; if socket object, emit to that socket
      if ((ioOrSocket as Server).to) {
        // we assume io object
        (ioOrSocket as Server).to(String(roomId)).emit(settleType === 'auto' ? 'auto_cashout' : 'bet_collected', {
          userId: user_id,
          betId: bet.bet_id,
          result: outcome,
          settlement
        });
      } else {
        (ioOrSocket as Socket).emit(settleType === 'auto' ? 'auto_cashout' : 'bet_collected', {
          userId: user_id,
          betId: bet.bet_id,
          result: outcome,
          settlement
        });
      }
    }
  } catch (error) {
    logger.error('Error settling bets:', error);
    if ((ioOrSocket as Socket).emit) {
      (ioOrSocket as Socket).emit('betError', { message: 'Settlement failed' });
    }
  }
};

// Periodic auto-cashout checker (to be called once on app start)
export const initAutoCashoutWatcher = (io: Server) => {
  setInterval(async () => {
    try {
      // get keys from redis pattern LAST_ACT_PREFIX* - implement getKeys in your Redis util or store last active id list elsewhere
      const keys = await (async () => {
        // fallback: if you don't have a pattern list util, you can persist active users list separately.
        // Here we attempt to use a helper 'getKeys' - replace with your actual implementation.
        // @ts-ignore
        if (typeof (getCache as any).getKeys === 'function') {
          // hypothetical API
          // @ts-ignore
          return await (getCache as any).getKeys(`${LAST_ACT_PREFIX}*`);
        }
        return [];
      })();

      const now = Date.now();
      for (const key of keys) {
        const userId = key.replace(LAST_ACT_PREFIX, '');
        const last = await getCache(key);
        if (!last) continue;
        const lastTs = Number(last);
        if (now - lastTs > INACTIVITY_WINDOW_MS) {

          const roomKey = await getCache(`rm-${userId}`);
          if (!roomKey) continue;
          await settleBet(io, { user_id: userId, roomId: Number(roomKey), type: 'auto' } as BetReqData);
          await deleteCache(key);
        }
      }
    } catch (err) {
      logger.error('Auto cashout watcher error', err);
    }
  }, 60 * 1000);
};
