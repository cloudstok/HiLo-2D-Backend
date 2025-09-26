import { BetsObject, Settlement } from '../../interfaces';
import { write } from '../../utils/db-connection';


// SETTLEMENT insert base
const SQL_INSERT_SETTLEMENT_BASE = `
  INSERT INTO settlement (bet_id, user_id, operator_id, bet_amount, user_bets, room_id, result, win_amount, winning_number, lobby_id)
  VALUES 
`;


export const addSettleBet = async (settlements: Settlement[]): Promise<void> => {
  try {
    if (!settlements.length) return;

    const finalData: (string | number | null)[] = [];
    const placeholders: string[] = [];

    for (const s of settlements) {
      const {
        user_id,
        operator_id,
        betAmount,
        userBets,
        roomId,
        result,
        winAmount,
        winning_card,
      } = s;

      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)');
      finalData.push(
        user_id,
        operator_id || null,
        betAmount,
        JSON.stringify(userBets),
        roomId,
        result,
        winAmount,
        winning_card
      );
    }

    const SQL_SETTLEMENT = `${SQL_INSERT_SETTLEMENT_BASE} ${placeholders.join(', ')}`;

    await write(SQL_SETTLEMENT, finalData);
    console.info('✅ Settlement Data Inserted Successfully');
  } catch (err) {
    console.error('❌ Error inserting settlement data:', err);
  }
};
