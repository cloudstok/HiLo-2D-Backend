import { pool } from "../db/dbConnection";
import type { BetAction } from "../interfaces";

export class Settlements {
    static async create({
        lobby_id,
        room_id,
        user_id,
        operator_id,
        final_mult,
        bet_amount,
        win_amount,
        plr_action,
        picked_card,
        previous_card,
        cards_history,
        revealed_count,
        status,
    }: {
        lobby_id: string;
        room_id: string;
        user_id: string;
        operator_id: string;
        final_mult: number;
        bet_amount: number;
        win_amount: number;
        plr_action: BetAction;
        picked_card: string;
        previous_card: string;
        cards_history: string[];
        revealed_count: number;
        status: "WIN" | "LOSS";
    }) {
        const query = `
            INSERT INTO settlements 
            (lobby_id, room_id, user_id, operator_id, final_mult, bet_amount, win_amount, plr_action, picked_card, previous_card, cards_history, revealed_count, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            lobby_id,
            room_id,
            user_id,
            operator_id,
            final_mult,
            bet_amount,
            win_amount,
            plr_action,
            picked_card,
            previous_card,
            JSON.stringify(cards_history ?? []),
            revealed_count,
            status,
        ];

        const [result] = await pool.execute(query, values);
        return result;
    }

    static async fetchLastWin(user_id: string, operator_id: string) {
        const [rows]: any = await pool.query(
            `SELECT win_amount 
             FROM settlements 
             WHERE user_id = ? AND operator_id = ? AND win_amount > 0 
             ORDER BY created_at DESC LIMIT 1`,
            [user_id, operator_id]
        );
        return rows[0] || {};
    }

    static async find(user_id: string, operator_id: string, limit = 10) {
        const [rows]: any = await pool.query(
            `SELECT * FROM settlements 
             WHERE user_id = ? AND operator_id = ? 
             ORDER BY created_at DESC LIMIT ?`,
            [user_id, operator_id, limit]
        );
        return rows;
    }

    static async findByLobbyRoom(user_id: string, operator_id: string, lobby_id: string, room_id: string) {
        const [rows]: any = await pool.query(
            `SELECT * FROM settlements 
             WHERE user_id = ? AND operator_id = ? AND lobby_id = ? AND room_id = ?`,
            [user_id, operator_id, lobby_id, room_id]
        );
        return rows[0] || {};
    }
}
