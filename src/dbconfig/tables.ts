export const settlement = `CREATE TABLE IF NOT EXISTS settlement (
   id int NOT NULL AUTO_INCREMENT,
   settlement_id VARCHAR(255) NOT NULL,
   room_id INT NOT NULL,
   user_id VARCHAR(255) NOT NULL,
   operator_id VARCHAR(255) DEFAULT NULL,
   bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
   user_bets TEXT DEFAULT NULL,        
   status VARCHAR(255) NOT NULL,
   win_amount DECIMAL(10, 2) DEFAULT 0.00,
   created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (id)
);`;