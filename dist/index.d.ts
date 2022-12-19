/// <reference types="node" resolution-mode="require"/>
import http from 'http';
import express from 'express';
import nedb from 'nedb';
import WebSocket, { WebSocketServer } from 'ws';
import Nedb from 'nedb';
type MsgHandler = (msg: WsiotMsg) => void;
interface BasicWsiotMsg extends Object {
    message: string;
}
interface WsiotMsg extends BasicWsiotMsg {
    [key: string]: any;
}
interface AuthMsg extends BasicWsiotMsg {
    type: ConnectionType;
    deviceType?: string;
    id?: string;
}
interface MessageLiterals {
    basic: WsiotMsg;
    auth: AuthMsg;
}
type ConnectionType = 'client' | 'device' | 'uknown';
declare class Connection {
    static readonly connections: {
        [key: string]: Connection;
    };
    static readonly addConnection: (connection: Connection) => Connection;
    static readonly send: (ws: WebSocket, msg: WsiotMsg) => void;
    static readonly sendError: (ws: WebSocket, error: string) => void;
    static readonly logRawFunc: (device: string, ...params: any[]) => void;
    static readonly log: (...params: any[]) => void;
    static readonly attachMsgHandler: (ws: WebSocket, run: MsgHandler, request?: string, authenticated?: boolean) => void;
    static readonly checkFormat: <T extends WsiotMsg>(req: WsiotMsg, type: T, ws?: WebSocket) => req is T;
    ws: WebSocket;
    readonly id: string;
    readonly connectionType: ConnectionType;
    get device(): string;
    private saveData;
    data: object | undefined;
    readonly run: MsgHandler;
    log(...params: any[]): void;
    send(msg: WsiotMsg): void;
    sendError(error: string): void;
    attachMsgHandler(run: MsgHandler, request?: string): void;
    constructor(ws: WebSocket, run: (req: WsiotMsg) => void, id?: string, saveData?: boolean, connectionType?: ConnectionType, data?: object | undefined);
    static readonly msgLiterals: MessageLiterals;
}
declare class Device extends Connection {
    readonly connectionType: ConnectionType;
    get device(): string;
    static readonly DeviceKinds: {
        [key: string]: new <T extends Device>(ws: WebSocket, id?: string) => T;
    };
    static readonly addDeviceKinds: (deviceClass: new <T extends Device>(ws: WebSocket, id?: string) => T) => new <T extends Device>(ws: WebSocket, id?: string) => T;
    static readonly devices: {
        [key: string]: Device;
    };
    static readonly addDevice: (device: Device) => Device;
    readonly deviceKind: string;
    constructor(ws: WebSocket, run: (req: WsiotMsg) => void, id: string, saveData?: boolean);
}
interface ServerOption {
    port: number;
    app: express.Application;
    server: http.Server;
    wss: WebSocketServer;
    dbPath: string;
    db: nedb;
    saveDB: boolean;
    usePublic: boolean;
    publicPath: string;
    useRouter: boolean;
    routersPath: string;
}
declare class IOTServer {
    readonly port: number;
    readonly app: express.Application;
    readonly server: http.Server;
    readonly wss: WebSocketServer;
    readonly dbPath: string;
    readonly db: Nedb;
    readonly saveDB: boolean;
    readonly usePublic: boolean;
    readonly publicPath: string;
    readonly useRouter: boolean;
    readonly routersPath: string;
    constructor(option?: object | ServerOption);
}
declare function extraAuth(run: () => void): void;
export { IOTServer, Connection, Device, extraAuth };
export default IOTServer;
