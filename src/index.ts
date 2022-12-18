import {
    __dirname, objify, getUniqueID, stringify, jsonify, extension, fileName,
    isType,
} from './common.js';

import http from 'http'
import express from 'express';
import nedb from 'nedb';
import WebSocket, { WebSocketServer } from 'ws';
import * as fs from 'fs'
import Nedb from 'nedb';
import { resolve } from 'path';
import { rejects } from 'assert';
import { Key } from 'readline';

interface BasicWsiotMsg extends Object {
    message: string;
}
interface WsiotMsg extends BasicWsiotMsg {
    [key: string]: any;
}
// authenticate
interface AuthMsg extends BasicWsiotMsg {
    type: ConnectionType,
    deviceType?: string;
    id?: string;
}

interface MessageLiterals {
    basic: WsiotMsg;
    auth: AuthMsg;
}


type ConnectionType = 'client' | 'device' | 'uknown';
//* connection object
export class Connection {
    // statics prop
    public static readonly connections: { [key: string]: Connection } = {};// store the connection
    public static readonly addConnection = (connection: Connection) => Connection.connections[connection.id] = connection;// syntax sugar to add connection
    public static readonly sendAnonymus = (ws: WebSocket, msg: WsiotMsg) => ws.send(stringify(msg));
    public static readonly sendError = (ws: WebSocket, error: string) => ws.send(stringify({ message: "error", error }));
    public static readonly attachMsgHandler = (ws: WebSocket, run: (msg: WsiotMsg) => void, request?: string,) => {
        ws.on('message', (msg) => {
            const objMsg: WsiotMsg | Error = objify(msg.toString());
            if (objMsg instanceof Error) {
                // TODO: error: if its not json, send error
                return;
            }
            if (request && (objMsg.message != request)) return;
            if (!Connection.checkFormat(objMsg, Connection.msgLiterals.basic)) return;
            run(objMsg);
        })
    }
    public static readonly checkFormat = <T extends WsiotMsg>(req: WsiotMsg, type: T, ws?: WebSocket): req is T => {
        var formated = isType(req, type);
        if (!formated && ws) Connection.sendError(ws, 'bad format, format is ' + stringify(type));
        return formated;
    }

    // instence prop
    public ws: WebSocket;
    public readonly id: string;
    public readonly connectionType: ConnectionType = 'uknown';
    public get device(): string { return this.connectionType + ":" + this.id };

    private saveData: boolean;
    public data: object | undefined;

    readonly run: (msg: WsiotMsg) => void;

    log(...params: any[]) { console.dirxml(this.device + ':', ...arguments) };
    send(msg: WsiotMsg) { this.ws.send(stringify(msg)) };
    sendError(error: string) { Connection.sendError(this.ws, error) };
    attachMsgHandler(run: (msg: WsiotMsg) => void, request?: string) { Connection.attachMsgHandler(this.ws, run, request) };

    constructor(ws: WebSocket, run: (req: WsiotMsg) => void, id: string = getUniqueID(), saveData = false, connectionType?: ConnectionType, data: object | undefined = undefined) {
        this.ws = ws; this.run = run; this.id = id; this.saveData = saveData; this.data = data;
        if (connectionType) this.connectionType = connectionType;
        Connection.addConnection(this);
        this.attachMsgHandler(this.run);
        // TODO: function to save in the db
        // TODO: ws terminator
        // TODO: function to delete or add this db
    }


    // message instance literal
    static readonly msgLiterals: MessageLiterals = {
        basic: { message: '' },
        auth: { type: 'uknown', message: '' },
    }
}

// subClass client, for client
export class Client extends Connection {
    // overrides
    public readonly connectionType: ConnectionType = 'client';
    // TODO: Scream function
    // static prop
    public static readonly clients: { [key: string]: Client } = {};// store the connection
    public static readonly addClient = (client: Client) => Client.clients[client.id] = client;// syntax sugar to add connection
    constructor(ws: WebSocket, id?: string) {
        // client handler
        super(ws, (req) => {
            const { } = this;
            // TODO: client code handler //on progress
            this.log(req);
        }, id);
        Client.addClient(this);
    }
}

// subClass device, for robots
export class Device extends Connection {
    // overrides
    public readonly connectionType: ConnectionType = 'device';
    public get device(): string { return this.deviceKind + ":" + this.id };
    // static prop
    // list of devices type
    public static readonly DeviceKinds: { [key: string]: new <T extends Device>(ws: WebSocket, id?: string) => T } = {};
    public static readonly addDeviceKinds = (deviceClass: new <T extends Device>(ws: WebSocket, id?: string) => T) =>
        Device.DeviceKinds[new deviceClass(new WebSocket(null)).deviceKind] = deviceClass;
    // list of devices connection
    public static readonly devices: { [key: string]: Device } = {};// store the connection
    public static readonly addDevice = (device: Device) => Device.devices[device.id] = device;// syntax sugar to add connection


    // public prop
    public readonly deviceKind: string = "unknown";

    constructor(ws: WebSocket, run: (req: WsiotMsg) => void, id: string, saveData = false) {
        super(ws, run, id, saveData);
    }

    // TODO: ws setter for reconnecting
    // TODO: ws updater(terminator)
}

//* server option
interface ServerOption {
    port: number,
    app: express.Application,
    server: http.Server,
    wss: WebSocketServer,

    dbPath: string,
    db: nedb,
    saveDB: boolean,

    usePublic: boolean,
    publicPath: string,

    useRouter: boolean,
    routersPath: string,
}

export class IOTServer {
    readonly port: number = 8080;
    readonly app: express.Application = express();
    readonly server: http.Server = http.createServer(this.app);
    readonly wss: WebSocketServer = new WebSocketServer({ server: this.server });;

    readonly dbPath: string = `./src/db/iot.db`;
    readonly db: Nedb = new nedb();
    readonly saveDB: boolean = true;

    readonly usePublic: boolean = false;
    readonly publicPath: string = `./src/public`;

    readonly useRouter: boolean = false;
    readonly routersPath: string = `dist/router`; //in folder

    constructor(option: object | ServerOption = {}) {
        for (const [key, value] of Object.entries(option))
            if (value !== undefined)
                this[key as keyof typeof this] = value;
        const { port, app, server, wss, dbPath, db, saveDB, usePublic, publicPath, useRouter, routersPath } = this;
        if (this.saveDB)// if the saveDb is true, then save it
        {
            this.db = new nedb({ filename: dbPath, autoload: true });
            db.persistence.setAutocompactionInterval(5000);
        }
        db.loadDatabase();


        if (usePublic) //if its use public folder, then use it
            app.use(express.static(publicPath)); // listen to public folder as all express should do
        server.listen(port, () => { console.dir(`server is up on port ${port}!`); }) //start ws server


        if (useRouter)//use all the router in the routerPath
            fs.readdir(routersPath, (err, files) => {
                if (err) { console.warn(err); return; }
                files.forEach((file) => {
                    if (extension(file) !== 'js')
                        return;
                    import(`../${routersPath}/${file}`).then(module => app.use(`/${fileName(file)}`, module.router));
                }
                )
            })


        // use auth protocol on websocket
        wss.on('connection', authProtocol);

    }
}

// authenticate who is connecting
async function authProtocol(ws: WebSocket) {
    // is the connection already authenticated or not
    var authenticated = false;

    // send the identification request just in case
    const identifyMsg: WsiotMsg = { message: "auth is requested" }
    Connection.sendAnonymus(ws, identifyMsg);

    Connection.attachMsgHandler(ws, (req) => {
        if (authenticated) {
            return;
        };

        if (Connection.checkFormat(req, Connection.msgLiterals.auth, ws)) return;
        // authenticate the connection
        var connection: Connection;
        // if its an client
        switch (req.type) {
            case 'client':
                connection = new Client(ws, req.id);
                break;
            case 'device':
                if (!req.deviceType) {
                    // *badRequest
                    Connection.sendError(ws, 'device type is not valid, device type avilable is "client" or "device" only')
                    return;
                }
                connection = new Device.DeviceKinds[req.deviceType](ws, req.id);
                break;
            default:
                // TODO: error: no type found
                return;
        };
        authenticated = true;
        connection.log("connected as ", connection.connectionType)
        connection.send({ message: `connected as ${connection.device}` })
    }, "authMsg",)


}

(new IOTServer({ usePublic: true, port: 8089 }));
// console.log(isType({},{hello:"world"}))