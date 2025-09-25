// ROOMS
export const rooms = `CREATE TABLE IF NOT EXISTS rooms (
    room_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    min_bet DECIMAL(12,2) NOT NULL,
    max_bet DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

// BETS
export const bets = `CREATE TABLE IF NOT EXISTS bets (
   bet_id INT PRIMARY KEY AUTO_INCREMENT,
   lobby_id VARCHAR(255) NOT NULL,
   user_id VARCHAR(255) NOT NULL,
   operator_id VARCHAR(255) DEFAULT NULL,
   bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
   user_bets TEXT NOT NULL,     
   room_id INT NOT NULL,
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);`;

// SETTLEMENT
export const settlement = `CREATE TABLE IF NOT EXISTS settlement (
   settlement_id INT NOT NULL AUTO_INCREMENT,
   lobby_id VARCHAR(255) NOT NULL,
   bet_id INT NOT NULL,
   room_id INT NOT NULL,
   user_id VARCHAR(255) NOT NULL,
   operator_id VARCHAR(255) DEFAULT NULL,
   bet_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
   user_bets TEXT DEFAULT NULL,        
   max_mult DECIMAL(10, 2) DEFAULT 0.00,
   result VARCHAR(255) NOT NULL,
   win_amount DECIMAL(10, 2) DEFAULT 0.00,
   winning_number INT NOT NULL,
   created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (bet_id) REFERENCES bets(bet_id),
   FOREIGN KEY (room_id) REFERENCES rooms(room_id),
   PRIMARY KEY (settlement_id)
);`;
