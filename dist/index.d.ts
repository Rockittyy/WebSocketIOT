/// <reference types="node" resolution-mode="require"/>
import http from 'http';
import express from 'express';
import nedb from 'nedb';
import WebSocket, { WebSocketServer } from 'ws';
import Nedb from 'nedb';
type msgTransmiter = (msg: WsiotMsg) => void;
type MsgHandler = (msg: WsiotMsg, connection?: Connection) => void;
interface BasicWsiotMsg extends Object {
    message: string;
}
interface WsiotMsg extends BasicWsiotMsg {
    [key: string]: any;
}
interface AuthMsg extends BasicWsiotMsg {
    message: 'authRequest';
    type: ConnectionType;
    deviceKind?: string;
    id?: string;
}
interface MessageLiterals {
    basic: WsiotMsg;
    auth: AuthMsg;
}
type ConnectionType = 'client' | 'device' | 'uknown';
declare class Connection {
    static scream: msgTransmiter;
    static readonly connections: {
        [key: string]: Connection;
    };
    static readonly addConnection: (connection: Connection) => Connection;
    static readonly send: (ws: WebSocket, msg: WsiotMsg) => void;
    static readonly sendError: (ws: WebSocket, error: string) => void;
    static readonly logRawFunc: (device: string, ...params: any[]) => void;
    static readonly log: (...params: any[]) => void;
    static readonly attachMsgHandler: (ws: WebSocket, run: MsgHandler, request?: string, authenticated?: () => boolean, connection?: Connection) => void;
    static readonly checkFormat: <T extends WsiotMsg>(req: WsiotMsg, type: T, ws?: WebSocket) => req is T;
    ws: WebSocket;
    readonly id: string;
    readonly connectionType: ConnectionType;
    readonly connection: Connection;
    readonly isDecoy: boolean;
    get device(): string;
    private saveData;
    data: object | undefined;
    readonly run: MsgHandler;
    log(...params: any[]): void;
    send(msg: WsiotMsg): void;
    sendError(error: string): void;
    attachMsgHandler(run: MsgHandler, request?: string): void;
    checkFormat<T extends WsiotMsg>(req: WsiotMsg, type: T, sendError?: boolean): req is T;
    constructor(ws: WebSocket, run: MsgHandler, isDecoy?: boolean, id?: string, saveData?: boolean, connectionType?: ConnectionType, data?: object | undefined);
    static readonly msgLiterals: MessageLiterals;
}
declare class Client extends Connection {
    readonly connection: Connection;
    readonly connectionType: ConnectionType;
    static scream: msgTransmiter;
    static readonly clients: {
        [key: string]: Client;
    };
    static readonly addClient: (client: Client) => Client;
    static clientHandler: MsgHandler;
    constructor(ws: WebSocket, id?: string, run?: MsgHandler);
}
declare abstract class Device extends Connection {
    readonly connection: Connection;
    readonly connectionType: ConnectionType;
    get device(): string;
    static scream: msgTransmiter;
    static readonly DeviceKinds: {
        [key: string]: new (ws: WebSocket, id?: string | undefined) => Device;
    };
    static readonly addDeviceKinds: (deviceClass: new (ws: WebSocket, id?: string | undefined) => Device) => new (ws: WebSocket, id?: string | undefined) => Device;
    static readonly devices: {
        [key: string]: Device;
    };
    static readonly addDevice: (device: Device) => Device;
    abstract readonly deviceKind: string;
    constructor(ws: WebSocket, run: MsgHandler, id?: string, saveData?: boolean);
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
    runExtraAuth: () => void;
    extraAuth(run: () => void): void;
    constructor(option?: object | ServerOption);
    private authProtocol;
}
export { IOTServer, Connection, Client, Device, msgTransmiter, MsgHandler, ConnectionType, BasicWsiotMsg, WsiotMsg, AuthMsg, MessageLiterals, ServerOption };
export default IOTServer;
