export const settlement = `CREATE TABLE IF NOT EXISTS settlement (
   settlement_id INT NOT NULL AUTO_INCREMENT,
   room_id INT NOT NULL,
   user_id VARCHAR(255) NOT NULL,
   operator_id VARCHAR(255) DEFAULT NULL,
   bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
   user_bets TEXT DEFAULT NULL,        
   result VARCHAR(255) NOT NULL,
   win_amount DECIMAL(10, 2) DEFAULT 0.00,
   winning_card INT NOT NULL,
   created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
);`;
