import { BetsObject, Settlement } from '../../interfaces';
import { write } from '../../utils/db-connection';


// SETTLEMENT insert base
const SQL_SETTLEMENT = `
  INSERT INTO settlement (Settlement_id, user_id, operator_id, bet_amount, user_bets, room_id, status, win_amount)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

export const addSettleBet = async (settlement: Settlement): Promise<void> => {
  try {
    console.log("Inserting settlement data:", settlement);
    const { Settlement_id, user_id, operator_id, betAmount, userBets, roomId, status, winAmount } = settlement;

    const data = [
       Settlement_id,
        decodeURIComponent(user_id),
        operator_id,
        betAmount,
        JSON.stringify(userBets),
        roomId,
        status,
        winAmount
    ];
    await write(SQL_SETTLEMENT, data);
    console.info('Settlement Data Inserted Successfully');
  } catch (err) {
    console.error(err);
  }
};