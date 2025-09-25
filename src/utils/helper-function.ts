import { BetResult } from '../interfaces';
import { appConfig } from './app-config';
import { multiplierMap } from './common-function';
import { createLogger } from './logger';
import { Socket } from 'socket.io';

const failedBetLogger = createLogger('failedBets', 'jsonl');
const failedExitLogger = createLogger('failedExitRoom', 'jsonl');

export const logEventAndEmitResponse = (
    socket: Socket,
    req: any,
    res: string,
    event: string
): void => {
    const logData = JSON.stringify({ req, res });
    if (event === 'bet') {
        failedBetLogger.error(logData);
    }
    socket.emit('betError', { message: res, status: false });
};


export const getUserIP = (socket: any): string => {
    const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        if (ip) return ip;
    }
    return socket.handshake.address || '';
};


function getResult(): number[] {
    const result: number[] = [];
    for (let i = 0; i < 2; i++) {
        result.push(Math.floor(Math.random() * 6) + 1);
    }
    return result;
}

export function calculateWinnings(betStructure: { betAmount: number; card: number }[]) {
    const winnerData: number[] = getResult();
    const sum = winnerData[0] + winnerData[1];
    const betTypeMap: Record<number, string> = {
        1: "7 Down",
        2: "7 Up",
        3: "7 Exact"
    };

    const betResults: BetResult[] = betStructure.map((bet) => {
        const { betAmount, card } = bet;

        const betResult: BetResult = {
            card,
            cardType: betTypeMap[card] ?? "Unknown",
            betAmount,
            winAmount: 0,
            mult: 0,
            status: "loss"
        };

        if (card === 1 && sum < 7) {
            betResult.status = "win";
            betResult.mult = multiplierMap.cat1;
        } else if (card === 2 && sum > 7) {
            betResult.status = "win";
            betResult.mult = multiplierMap.cat1;
        } else if (card === 3 && sum === 7) {
            betResult.status = "win";
            betResult.mult = multiplierMap.cat2;
        }

        if (betResult.status === "win") {
            betResult.winAmount = betAmount * betResult.mult;
        }

        return betResult;
    });


    const totalWinAmount = betResults.reduce((sum, bet) => sum + bet.winAmount, 0);
    const uniqueWinnerChips = new Set(winnerData);
    let max_mult = 0;
    if (sum === 7) {
        max_mult = 5;
    } else if (sum < 7 || sum > 7) {
        max_mult = 2;
    } 
    return {
        winnerData,
        betResults,
        totalWinAmount,
        max_mult
    };
}
