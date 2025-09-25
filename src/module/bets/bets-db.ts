import { BetsObject, Settlement } from '../../interfaces';
import { write } from '../../utils/db-connection';

// BETS insert
const SQL_INSERT_BETS = `
  INSERT INTO bets ( lobby_id, user_id, operator_id, bet_amount, user_bets, room_id)
  VALUES ( ?, ?, ?, ?, ?, ?)
`;

// SETTLEMENT insert base
const SQL_INSERT_SETTLEMENT_BASE = `
  INSERT INTO settlement (bet_id, user_id, operator_id, bet_amount, user_bets, room_id, result, win_amount, winning_number, lobby_id)
  VALUES 
`;

export const insertBets = async (betObj: BetsObject): Promise<void> => {
  try {
    const { bet_id, lobby_id, totalBetAmt, userBets, roomId, user_id, operatorId } = betObj;

    await write(SQL_INSERT_BETS, [
      bet_id,
      lobby_id,
      user_id,
      operatorId || null,
      totalBetAmt,
      JSON.stringify(userBets),
      roomId
    ]);

    console.info(`✅ Bet placed successfully for user`, user_id);
  } catch (err) {
    console.error('❌ Error inserting bet:', err);
  }
};

export const addSettleBet = async (settlements: Settlement[]): Promise<void> => {
  try {
    if (!settlements.length) return;

    const finalData: (string | number | null)[] = [];
    const placeholders: string[] = [];

    for (const s of settlements) {
      const {
        bet_id,
        user_id,
        operator_id,
        betAmount,
        userBets,
        roomId,
        result,
        winAmount,
        winning_number,
        lobby_id
      } = s;

      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      finalData.push(
        bet_id,
        user_id,
        operator_id || null,
        betAmount,
        JSON.stringify(userBets),
        roomId,
        result,
        winAmount,
        winning_number,
        lobby_id || null
      );
    }

    const SQL_SETTLEMENT = `${SQL_INSERT_SETTLEMENT_BASE} ${placeholders.join(', ')}`;

    await write(SQL_SETTLEMENT, finalData);
    console.info('✅ Settlement Data Inserted Successfully');
  } catch (err) {
    console.error('❌ Error inserting settlement data:', err);
  }
};
