"use strict";

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const nedb = require('nedb');

const port = 8080;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server: server });

// reeeeee