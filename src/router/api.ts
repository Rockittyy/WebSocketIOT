import express from 'express';
const api = express.Router();

api.get('/hello', (req, res) => res.send('world'));


export const router = api;