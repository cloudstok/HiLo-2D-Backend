import { pool } from "../db/dbConnection";

export class Bets {
    static async create({
        lobby_id,
        room_id,
        user_id,
        operator_id,
        bet_amount,
        cards_history,
    }: {
        lobby_id: string;
        room_id: string;
        user_id: string;
        operator_id: string;
        bet_amount: number;
        cards_history: string[];   // storing as JSON
    }) {
        const query = `
            INSERT INTO bets 
            (lobby_id, room_id, user_id, operator_id, bet_amount, cards_history)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            lobby_id,
            room_id,
            user_id,
            operator_id,
            bet_amount,
            JSON.stringify(cards_history ?? []),
        ];

        const [result] = await pool.execute(query, values);
        return result;
    }

    static async findById(id: number) {
        const [rows]: any = await pool.query(`SELECT * FROM bets WHERE id = ?`, [id]);
        return rows[0] || null;
    }

    static async find(user_id: string, operator_id: string, limit = 10) {
        const [rows]: any = await pool.query(
            `SELECT * FROM bets 
             WHERE user_id = ? AND operator_id = ? 
             ORDER BY created_at DESC LIMIT ?`,
            [user_id, operator_id, limit]
        );
        return rows;
    }

    static async findByLobbyRoom(user_id: string, operator_id: string, lobby_id: string, room_id: string) {
        const [rows]: any = await pool.query(
            `SELECT * FROM bets 
             WHERE user_id = ? AND operator_id = ? AND lobby_id = ? AND room_id = ?`,
            [user_id, operator_id, lobby_id, room_id]
        );
        return rows[0] || null;
    }
}
