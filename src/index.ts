import {
    __dirname, objify, getUniqueID, stringify, jsonify, extension, fileName,
    isType,
} from './common.js';

// !TODO:
/*
!
!       MAKE CODE WORK ON ES AND COMMONJS
!
!
*/
import http from 'http'
import express from 'express';
import nedb from 'nedb';
import WebSocket, { WebSocketServer } from 'ws';
import * as fs from 'fs'
import Nedb from 'nedb';
import { resolve } from 'path';
import { rejects } from 'assert';
import { Key } from 'readline';

type msgTransmiter = (msg: WsiotMsg) => void;
type MsgHandler = (msg: WsiotMsg, connection?: Connection) => void;
interface BasicWsiotMsg extends Object { message: string; }
interface WsiotMsg extends BasicWsiotMsg { [key: string]: any; }

// authenticate
interface AuthMsg extends BasicWsiotMsg {
    message: 'authRequest';
    type: ConnectionType;
    deviceType?: string;
    id?: string;
}

interface MessageLiterals {
    basic: WsiotMsg;
    auth: AuthMsg;
}


type ConnectionType = 'client' | 'device' | 'uknown';
//* connection object
class Connection {
    // statics prop
    public static scream: msgTransmiter = (msg: WsiotMsg) => { Object.keys(this.connections).forEach((connection) => { this.connections[connection].send(msg) }) };
    public static readonly connections: { [key: string]: Connection } = {};// store the connection
    public static readonly addConnection = (connection: Connection) => Connection.connections[connection.id] = connection;// syntax sugar to add connection
    public static readonly send = (ws: WebSocket, msg: WsiotMsg) => ws.send(stringify(msg));
    public static readonly sendError = (ws: WebSocket, error: string) => ws.send(stringify({ message: "error", error }));
    public static readonly logRawFunc = (device: string, ...params: any[]) => console.dirxml(device + ':', ...params);
    public static readonly log = (...params: any[]) => this.logRawFunc('uknown', ...params);
    public static readonly attachMsgHandler = (ws: WebSocket, run: MsgHandler, request?: string, authenticated: boolean = false, connection?: Connection) => {
        //    TODO: make the "no request found msg"
        ws.on('message', (msg) => {
            const objMsg: WsiotMsg | Error = objify(msg.toString());
            if (objMsg instanceof Error) {
                this.sendError(ws, "request must be in json format!");
                return;
            }
            if (!authenticated && objMsg.message != Connection.msgLiterals.auth.message) { Connection.sendError(ws, "please authenticate this connection before preceeding"); return; }
            if (request && (objMsg.message != request)) return;
            //* in case you forgot again, the  `request` parameter is the "id" for the request handler. so if its not the correct request it will return like in below
            if (!this.checkFormat(objMsg, this.msgLiterals.basic)) return;
            run(objMsg, connection);
        })
    }
    public static readonly checkFormat = <T extends WsiotMsg>(req: WsiotMsg, type: T, ws?: WebSocket): req is T => {
        var formated = isType(req, type);
        if (!formated && ws) this.sendError(ws, 'bad format, format is ' + stringify(type));
        return formated;
    }

    // instence prop
    public ws: WebSocket;
    public readonly id: string;
    public readonly connectionType: ConnectionType = 'uknown';
    public readonly connection: Connection = this;
    public get device(): string { return this.connectionType + ":" + this.id };

    private saveData: boolean;
    public data: object | undefined;

    readonly run: MsgHandler;

    log(...params: any[]) { Connection.logRawFunc(this.device, ...params) };
    send(msg: WsiotMsg) { this.ws.send(stringify(msg)) };
    sendError(error: string) { Connection.sendError(this.ws, error) };
    attachMsgHandler(run: MsgHandler, request?: string) { Connection.attachMsgHandler(this.ws, run, request, true, this.connection) };

    constructor(ws: WebSocket, run: MsgHandler, id: string = getUniqueID(), saveData = false, connectionType?: ConnectionType, data: object | undefined = undefined) {
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
        auth: { type: 'uknown', message: 'authRequest' },
    }
}

// subClass client, for client
class Client extends Connection {
    // overrides
    public readonly connection: Connection = this;
    public readonly connectionType: ConnectionType = 'client';
    public static scream: msgTransmiter = (msg) => { Object.keys(this.clients).forEach((connection) => { this.clients[connection].send(msg) }) };
    // static prop
    public static readonly clients: { [key: string]: Client } = {};// store the connection
    public static readonly addClient = (client: Client) => Client.clients[client.id] = client;// syntax sugar to add connection
    public static clientHandler: MsgHandler = (req, connection) => { };

    constructor(ws: WebSocket, id?: string, run?: MsgHandler) {
        // client handler
        super(ws, Client.clientHandler, id);
        Client.addClient(this);
    }
}

// subClass device, for robots
abstract class Device extends Connection {
    // overrides
    public readonly connection: Connection = this;
    public readonly connectionType: ConnectionType = 'device';
    public get device(): string { return this.deviceKind + ":" + this.id };
    public static scream: msgTransmiter = (msg, deviceKind?: string) => {
        Object.keys(this.devices).filter((val) =>
            this.devices[val].deviceKind === deviceKind).forEach((device) => this.devices[device].send(msg));
    };

    // static prop
    // list of devices type
    public static readonly DeviceKinds: { [key: string]: new <T extends Device>(ws: WebSocket, id?: string) => T } = {};
    public static readonly addDeviceKinds = (deviceClass: new <T extends Device>(ws: WebSocket, id?: string) => T) =>
        Device.DeviceKinds[new deviceClass(new WebSocket(null)).deviceKind] = deviceClass;
    // list of devices connection
    public static readonly devices: { [key: string]: Device } = {};// store the connection
    public static readonly addDevice = (device: Device) => Device.devices[device.id] = device;// syntax sugar to add connection


    // abstacts
    public abstract readonly deviceKind: string; //override

    constructor(ws: WebSocket, run: MsgHandler, id: string, saveData = false) {
        super(ws, run, id, saveData);
        Device.addDevice(this);
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

class IOTServer {
    readonly port: number = 8080;
    readonly app: express.Application = express();
    readonly server: http.Server = http.createServer(this.app);
    readonly wss: WebSocketServer = new WebSocketServer({ server: this.server });;

    readonly dbPath: string = `./src/db/iot.db`;
    readonly db: Nedb = new nedb();
    readonly saveDB: boolean = false;

    readonly usePublic: boolean = false;
    readonly publicPath: string = `./src/public`;

    readonly useRouter: boolean = false;
    readonly routersPath: string = `dist/router`; //in folder
    public runExtraAuth = () => { };
    extraAuth(run: () => void) { this.runExtraAuth = run }

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
        wss.on('connection', (ws) => this.authProtocol(ws, this));

    }

    // authenticate who is connecting
    private authProtocol(ws: WebSocket, server: IOTServer) {
        Connection.log("websocketiot connection been made")
        // is the connection already authenticated or not
        var connection: Connection;
        // send the identification request just in case
        const identifyMsg: WsiotMsg = { message: "auth is requested" }
        Connection.send(ws, identifyMsg);

        Connection.attachMsgHandler(ws, (req) => {
            if (connection) {
                connection.sendError(`this device already connected as ${connection.device}. an relogin attemp is forbids`)
                return;
            };

            if (!Connection.checkFormat(req, Connection.msgLiterals.auth, ws)) return;
            // authenticate the connection
            // if its an client
            switch (req.type) {
                case 'client':
                    connection = new Client(ws, req.id);
                    break;
                case 'device':
                    if (!req.deviceType) {
                        // *badRequest
                        Connection.sendError(ws, 'device kind is not specified')
                        return;
                    }
                    // checking if the device type is legit
                    let typeFound = false
                    Object.keys(Device.DeviceKinds).forEach((key) => { if (key === req.deviceType) typeFound = true })
                    if (!typeFound) return;

                    connection = new Device.DeviceKinds[req.deviceType](ws, req.id);
                    break;
                default:
                    Connection.sendError(ws, 'device type is not valid, device type avilable is "client" or "device" only');
                    return;
            };
            connection.log("connected as ", connection.connectionType);
            server.runExtraAuth();
            connection.send({ message: `connected as ${connection.device}` });
        }, Connection.msgLiterals.auth.message,)
    }
}


export { IOTServer, Connection, Device };
export default IOTServer;
// const Server = (new IOTServer({ usePublic: true }));