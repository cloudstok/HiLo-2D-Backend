
export type BetResult = {
    card: number;
    cardType: string;
    betAmount: number;
    winAmount: number;
    mult: number;
    status: 'win' | 'loss';
};

export interface RawUserData {
    user_id: string;
    operatorId: string;
    balance: number;
    [key: string]: any;
};

export interface BetObject {
    roundId: string;
    token: string;
    socket_id: string;
    game_id: string;
    bet_amount?: number;
    debit_txn_id?: string;
    ip?: string
};

export interface FinalUserData extends RawUserData {
    user_id: string;
    id: string;
    game_id: string;
    token: string;
    card: number;
};

export interface BetReqData {
    roomId: number;
    btAmt: number;
    category: string;
};

export interface cashOutReqData {
    roomId: number;
    userId: string;
};

export interface UserBet {
    betAmount: number;
    category: string;
}

export interface PlayerDetails {
    game_id: string;
    operatorId: string;
    token: string;
};

export interface Settlement {
    Settlement_id: string;
    user_id: string;
    operator_id: string;
    betAmount: number;
    userBets: UserBet;
    roomId: number;
    status: string;
    winAmount: number;
    txn_id?: string;
}

export interface BetsObject {
    user_id: string;
    operatorId: string;
    roomId: number;
    totalBetAmt: number;
    userBets: UserBet[];
    token: string;
    socket_id: string;
    game_id: string;
    card: number; // high low...
    ip?: string;
    txn_id?: string;
}


export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    time: number;
    level: LogLevel;
    name: string;
    msg: string;
};

interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: string;
    retries: string;
    interval: string;
};

interface RedisConfig {
    host: string;
    port: number;
    retry: number;
    interval: number;
};

export interface AppConfig {
    minBetAmount: number;
    maxBetAmount: number;
    maxCashoutAmount: number;
    dbConfig: DBConfig;
    redis: RedisConfig;
};

export type WebhookKey = 'CREDIT' | 'DEBIT';
export type BetEvent = 'bet' | 'jnRm' | 'exRm';

export interface PlayerDetails {
    operatorId: string;
    token: string;
    game_id: string;
};

export interface BetsData {
    id: number | string;
    bet_amount?: number | string;
    winning_amount?: number | string;
    game_id?: string;
    user_id: string;
    bet_id?: string;
    room_id?: number;
    txn_id?: string;
    ip?: string;
};

export interface AccountsResult {
    txn_id?: string;
    status: boolean;
    type: WebhookKey
};

export interface WebhookData {
    txn_id: string;
    ip?: string;
    game_id: string | undefined;
    user_id: string;
    amount?: string | number;
    description?: string;
    bet_id?: string;
    txn_type?: number;
    txn_ref_id?: string;
};

export interface Room {
    room_id: number;
    room_name: string;
    min_bet: number;
    max_bet: number;
    created_at?: Date;
}

export interface GameResult {
    1: string[];
    2: string[];
    winner: 1 | 2;
};