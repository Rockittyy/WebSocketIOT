import { objify, getUniqueID, stringify, extension, fileName, isType, } from './common.js';
import http from 'http';
import express from 'express';
import nedb from 'nedb';
import WebSocket, { WebSocketServer } from 'ws';
import * as fs from 'fs';
//* connection object
export class Connection {
    // statics prop
    static connections = {}; // store the connection
    static addConnection = (connection) => Connection.connections[connection.id] = connection; // syntax sugar to add connection
    static sendAnonymus = (ws, msg) => ws.send(stringify(msg));
    static sendError = (ws, error) => ws.send(stringify({ message: "error", error }));
    static attachMsgHandler = (ws, run, request) => {
        ws.on('message', (msg) => {
            const objMsg = objify(msg.toString());
            if (objMsg instanceof Error) {
                // TODO: error: if its not json, send error
                return;
            }
            if (request && (objMsg.message != request))
                return;
            if (!Connection.checkFormat(objMsg, Connection.msgLiterals.basic))
                return;
            run(objMsg);
        });
    };
    static checkFormat = (req, type, ws) => {
        var formated = isType(req, type);
        if (!formated && ws)
            Connection.sendError(ws, 'bad format, format is ' + stringify(type));
        return formated;
    };
    // instence prop
    ws;
    id;
    connectionType = 'uknown';
    get device() { return this.connectionType + ":" + this.id; }
    ;
    saveData;
    data;
    run;
    log(...params) { console.dirxml(this.device + ':', ...arguments); }
    ;
    send(msg) { this.ws.send(stringify(msg)); }
    ;
    sendError(error) { Connection.sendError(this.ws, error); }
    ;
    attachMsgHandler(run, request) { Connection.attachMsgHandler(this.ws, run, request); }
    ;
    constructor(ws, run, id = getUniqueID(), saveData = false, connectionType, data = undefined) {
        this.ws = ws;
        this.run = run;
        this.id = id;
        this.saveData = saveData;
        this.data = data;
        if (connectionType)
            this.connectionType = connectionType;
        Connection.addConnection(this);
        this.attachMsgHandler(this.run);
        // TODO: function to save in the db
        // TODO: ws terminator
        // TODO: function to delete or add this db
    }
    // message instance literal
    static msgLiterals = {
        basic: { message: '' },
        auth: { type: 'uknown', message: '' },
    };
}
// subClass client, for client
export class Client extends Connection {
    // overrides
    connectionType = 'client';
    // TODO: Scream function
    // static prop
    static clients = {}; // store the connection
    static addClient = (client) => Client.clients[client.id] = client; // syntax sugar to add connection
    constructor(ws, id) {
        // client handler
        super(ws, (req) => {
            const {} = this;
            // TODO: client code handler //on progress
            this.log(req);
        }, id);
        Client.addClient(this);
    }
}
// subClass device, for robots
export class Device extends Connection {
    // overrides
    connectionType = 'device';
    get device() { return this.deviceKind + ":" + this.id; }
    ;
    // static prop
    // list of devices type
    static DeviceKinds = {};
    static addDeviceKinds = (deviceClass) => Device.DeviceKinds[new deviceClass(new WebSocket(null)).deviceKind] = deviceClass;
    // list of devices connection
    static devices = {}; // store the connection
    static addDevice = (device) => Device.devices[device.id] = device; // syntax sugar to add connection
    // public prop
    deviceKind = "unknown";
    constructor(ws, run, id, saveData = false) {
        super(ws, run, id, saveData);
    }
}
export class IOTServer {
    port = 8080;
    app = express();
    server = http.createServer(this.app);
    wss = new WebSocketServer({ server: this.server });
    ;
    dbPath = `./src/db/iot.db`;
    db = new nedb();
    saveDB = true;
    usePublic = false;
    publicPath = `./src/public`;
    useRouter = false;
    routersPath = `dist/router`; //in folder
    constructor(option = {}) {
        for (const [key, value] of Object.entries(option))
            if (value !== undefined)
                this[key] = value;
        const { port, app, server, wss, dbPath, db, saveDB, usePublic, publicPath, useRouter, routersPath } = this;
        if (this.saveDB) // if the saveDb is true, then save it
         {
            this.db = new nedb({ filename: dbPath, autoload: true });
            db.persistence.setAutocompactionInterval(5000);
        }
        db.loadDatabase();
        if (usePublic) //if its use public folder, then use it
            app.use(express.static(publicPath)); // listen to public folder as all express should do
        server.listen(port, () => { console.dir(`server is up on port ${port}!`); }); //start ws server
        if (useRouter) //use all the router in the routerPath
            fs.readdir(routersPath, (err, files) => {
                if (err) {
                    console.warn(err);
                    return;
                }
                files.forEach((file) => {
                    if (extension(file) !== 'js')
                        return;
                    import(`../${routersPath}/${file}`).then(module => app.use(`/${fileName(file)}`, module.router));
                });
            });
        // use auth protocol on websocket
        wss.on('connection', authProtocol);
    }
}
// authenticate who is connecting
async function authProtocol(ws) {
    // is the connection already authenticated or not
    var authenticated = false;
    // send the identification request just in case
    const identifyMsg = { message: "auth is requested" };
    Connection.sendAnonymus(ws, identifyMsg);
    Connection.attachMsgHandler(ws, (req) => {
        if (authenticated) {
            return;
        }
        ;
        if (Connection.checkFormat(req, Connection.msgLiterals.auth, ws))
            return;
        // authenticate the connection
        var connection;
        // if its an client
        switch (req.type) {
            case 'client':
                connection = new Client(ws, req.id);
                break;
            case 'device':
                if (!req.deviceType) {
                    // *badRequest
                    Connection.sendError(ws, 'device type is not valid, device type avilable is "client" or "device" only');
                    return;
                }
                connection = new Device.DeviceKinds[req.deviceType](ws, req.id);
                break;
            default:
                // TODO: error: no type found
                return;
        }
        ;
        authenticated = true;
        connection.log("connected as ", connection.connectionType);
        connection.send({ message: `connected as ${connection.device}` });
    }, "authMsg");
}
(new IOTServer({ usePublic: true, port: 8089 }));
// console.log(isType({},{hello:"world"}))
//# sourceMappingURL=index.js.map