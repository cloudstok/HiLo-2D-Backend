import { Server as IOServer, Socket } from 'socket.io';
import { createLogger } from '../../utils/logger';
import { setCache, getCache, deleteCache } from '../../utils/redis-connection';

const logger = createLogger('Card_Hi_lo_2D', 'jsonl');

export const roomPlayerCount: { [key: number]: number } = {
  101: 0,
  102: 0,
  103: 0,
  104: 0,
};

export const ROOMS: { room_id: number; room_name: string; min_bet: number; max_bet: number }[] = [
  { room_id: 101, room_name: 'Regular', min_bet: 10, max_bet: 100 },
  { room_id: 102, room_name: 'Friendly', min_bet: 50, max_bet: 500 },
  { room_id: 103, room_name: 'Expert', min_bet: 100, max_bet: 1000 },
  { room_id: 104, room_name: 'High Roller', min_bet: 500, max_bet: 5000 },
];

export const initRooms = () => {
  for (const room of ROOMS) {
    roomPlayerCount[room.room_id] = 0;
  }
  logger.info('Rooms initialized with constant configuration');
};
