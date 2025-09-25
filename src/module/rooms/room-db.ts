import { Room } from '../../interfaces';
import { write } from '../../utils/db-connection';

const SQL_INSERT_ROOMS = 'INSERT INTO rooms ( room_id, room_name, min_bet, max_bet, result) VALUES (?, ?, ?, ?, ?)';


export const insertRoooms = async (data: Room): Promise<void> => {
    try {
        const { room_id, room_name, max_bet, min_bet} = data;
        await write(SQL_INSERT_ROOMS, [room_id, room_name, max_bet, min_bet]);
    } catch (err) {
        console.error(err);
    }
};