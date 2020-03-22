'use strict';

const Compression = require('compression');
const Express = require('express');
const FileHandler = require('./file.handler');

const app = Express();

const FULL_IP_TIMES = {};
const DIFF_IP_TIMES = {};
const MAX_IP_WAIT = 60 * 60 * 1000;

app.use(Compression());

app.get('/full/:region(US)/connected/:id([0-9\\-]{1,})', (req, res) => {
    const ip = req.ip;
    
    if (!ip) {
        res.status(403).end();
        return;
    }

    if (FULL_IP_TIMES[ip]) {
        const lastTime = FULL_IP_TIMES[ip];
        if (Date.now() - lastTime < MAX_IP_WAIT) {
            res.status(403).end();
            return;
        }
    }

    try {
        const region = req.params.region;

        if (region.toUpperCase() !== 'US') {
            res.status(404).end();
            return;
        }

        const id = parseInt(req.params.id)
        if (FileHandler.exists(region, id)) {
            FULL_IP_TIMES[ip] = Date.now();
            res.status(200).send(FileHandler.get(region, id)).end();
        }
        else {
            res.status(404).end();
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
});

app.get('/full/:region(US)/connected/:id([0-9\\-]{1,})/modified', (req, res) => {
    try {
        const region = req.params.region;

        if (region.toUpperCase() !== 'US') {
            res.status(404).end();
            return;
        }

        const id = parseInt(req.params.id)
        if (FileHandler.exists(region, id)) {
            res.status(200).send(''+FileHandler.modified(region, id)).end();
        }
        else {
            res.status(404).end();
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
});


app.get('/diff/:region(US)/connected/:id([0-9\\-]{1,})/v/:version([0-9]{1,2})', (req, res) => {
    const ip = req.ip;

    if (!ip) {
        res.status(403).end();
        return;
    }

    if (DIFF_IP_TIMES[ip]) {
        const lastTime = DIFF_IP_TIMES[ip];
        if (Date.now() - lastTime < MAX_IP_WAIT) {
            res.status(403).end();
            return;
        }
    }

    try {
        const region = req.params.region;

        if (region.toUpperCase() !== 'US') {
            res.status(404).end();
            return;
        }

        const id = parseInt(req.params.id)
        const version = parseInt(req.params.version);
        if (FileHandler.exists(region, id, version)) {
            DIFF_IP_TIMES[ip] = Date.now();
            res.status(200).send(FileHandler.get(region, id, version)).end();
        }
        else {
            res.status(404).end();
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
});

app.get('/diff/:region(US)/connected/:id([0-9\\-]{1,})/v/:version([0-9]{1,2})/modified', (req, res) => {
    try {
        const region = req.params.region;

        if (region.toUpperCase() !== 'US') {
            res.status(404).end();
            return;
        }

        const id = parseInt(req.params.id)
        const version = parseInt(req.params.version);
        if (FileHandler.exists(region, id, version)) {
            res.status(200).send(''+FileHandler.modified(region, id, version)).end();
        }
        else {
            res.status(404).end();
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
});

app.listen(3000);