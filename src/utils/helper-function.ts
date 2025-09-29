import { BetResult , BetEvent } from '../interfaces';
import { appConfig } from './app-config';
import { multiplierMap } from './common-function';
import { createLogger } from './logger';
import { Socket } from 'socket.io';
import { roomPlayerCount, ROOMS } from '../module/rooms/room-events';

const failedBetLogger = createLogger('failedBets', 'jsonl');
const failedJoinLogger = createLogger('failedJoinRoom', 'jsonl');
const failedExitLogger = createLogger('failedExitRoom', 'jsonl');

export const logEventAndEmitResponse = (
    req: unknown,
    res: string,
    event: BetEvent   
): void => {
    const logData = JSON.stringify({ req, res });
    if (event === 'jnRm') {
        failedJoinLogger.error(logData);
    };
    if (event == 'exRm') {
        failedExitLogger.error(logData);
    };
};

export const eventEmitter = (
    socket: Socket | undefined,
    eventName: string,
    data: any
): void => {
    if (socket) socket.emit('message', { eventName, data });
}


export const getUserIP = (socket: any): string => {
    const forwardedFor = socket.handshake.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        if (ip) return ip;
    }
    return socket.handshake.address || '';
};


export const getRooms = () => {
     const roomData = ROOMS;
    roomData.map(room => {
        return room;
    });
};
