export const gameSettings = `CREATE TABLE IF NOT EXISTS game_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    settings JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

export const betResult = `create table if not exists bets (
    id int auto_increment primary key,
    lobby_id varchar(100),
    room_id varchar(100),
    user_id varchar(50),
    operator_id varchar(50),
    bet_amount float,
    cards_history json, 
    created_at timestamp default current_timestamp on update current_timestamp
);`

export const settlement = `create table if not exists settlements (
    id int auto_increment primary key,
    lobby_id varchar(100),                -- from gameData.lobby_id
    room_id varchar(100),                 -- from gameData.room_id
    user_id varchar(50),
    operator_id varchar(50),
    final_mult float,                      -- running multiplier bank
    bet_amount float,
    win_amount float,
    plr_action enum ("HI","LO","RD","SM","BL","H","C","S", "D") not null,              -- HI / LO / SM / RB etc.
	picked_card varchar(4),
    previous_card varchar(4),
    cards_history json,                   -- last 8 cards
    status enum("WIN", "LOSS") not null,
    revealed_count int default 0,
    created_at timestamp default current_timestamp on update current_timestamp,
    index idx_user_operator (user_id, operator_id),
    index idx_user_operator_lobby (user_id, operator_id, lobby_id)
);`