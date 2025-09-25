// room-events.ts
import { Server as IOServer, Socket } from 'socket.io';
import { createLogger } from '../../utils/logger';
import { settleBet } from '../bets/bets-session';
import { setCache, getCache, deleteCache } from '../../utils/redis-connection';

const logger = createLogger('Card_Hi_lo_2D', 'jsonl');

export const roomPlayerCount: { [key: number]: number } = {
  101: 0,
  102: 0,
  103: 0,
  104: 0
};


export const ensureRoomsExist = async (rooms: { room_id: number; room_name: string; min_bet: number; max_bet: number }[]) => {

  try {
    const { insertRoooms } = await import('./room-db');
    for (const r of rooms) {
      try {
        await insertRoooms({ room_id: r.room_id, room_name: r.room_name, min_bet: r.min_bet, max_bet: r.max_bet });
      } catch (error) {
        // Ignore duplicate errors
        logger.debug(`ensureRoomsExist insert failure (likely exists): ${r.room_id}`);
      }
    }
  } catch (error) {
    logger.error('ensureRoomsExist error');
  }
};


