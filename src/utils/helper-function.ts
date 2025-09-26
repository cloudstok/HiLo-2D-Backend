import { BetResult } from '../interfaces';
import { appConfig } from './app-config';
import { multiplierMap } from './common-function';
import { createLogger } from './logger';
import { Socket } from 'socket.io';
import { roomPlayerCount } from '../module/rooms/room-events';

const failedBetLogger = createLogger('failedBets', 'jsonl');
const failedJoinLogger = createLogger('failedJoinRoom', 'jsonl');
const failedExitLogger = createLogger('failedExitRoom', 'jsonl');

export const logEventAndEmitResponse = (
    socket: Socket,
    req: any,
    res: string,
    event: string
): void => {
    const logData = JSON.stringify({ req, res });
    if (event === 'jnRm') {
        failedJoinLogger.error(logData);
    };
    if (event == 'exRm') {
        failedExitLogger.error(logData);
    };
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

export const getRooms = () => {
    return ;
};
