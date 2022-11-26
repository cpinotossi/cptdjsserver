#!/usr/bin/env nodejs
const logger = require('./logger');
const loggerHttp = require('pino-http')()

const https = require('https');
const http = require('http');
const fs = require('fs');
const url = require('url');
require('dotenv').config();

const domain = process.env.DOMAIN;
let args=process.argv;
const portHttp = args.length>2 ? args[2] : process.env.PORTHTTP;
const portSSL = args.length>3 ? args[3] : process.env.PORTSSL;
const color = args.length>4 ? args[4] : process.env.SCOLOR;

// Option of the SSL server
const optionsSSL = {
  key: fs.readFileSync(`./openssl/${domain}.srv.key`),
  cert: fs.readFileSync(`./openssl/${domain}.srv.crt`),
  requestCert: true,
  rejectUnauthorized: false, // so we can do own error handling
  ca: [
    fs.readFileSync(`./openssl/${domain}.ca.crt`)
  ]
};

// Create https server
var serverSSL = https.createServer(optionsSSL);

serverSSL.on('request',(req,res)=>{
    requestDefaultHandler(req,res,(req,res)=>{
        res.end();
        loggerHttp(req,res);
    });
});

serverSSL.listen(portSSL,'0.0.0.0',()=>{
    logger.info(`Server ${color} HTTPS port ${portSSL}`)
})

// Create http server
var server = http.createServer();

server.on('request',(req,res)=>{
    requestDefaultHandler(req,res,(req,res)=>{
        res.end();
        loggerHttp(req,res);
    });
});

server.listen(portHttp,'0.0.0.0',()=>{
    logger.info(`Server ${color} HTTP port ${portHttp}`)
})

function requestDefaultHandler(req,res,cb){
    let socketDetails = {
        ladd:req.socket.localAddress,
        lport:req.socket.localPort,
        radd:req.socket.remoteAddress,
        rport:req.socket.remotePort
    };
    res.setHeader('server',color);
    res.write(`<body bgcolor="${color}">\n`);
    res.write(`Incoming Request URL: ${req.url}\n`)
    res.write(`reqh:${JSON.stringify(req.headers, null, '\t')}\n`);
    res.write(`resh:${JSON.stringify(res.getHeaders(), null, '\t')}\n`);
    res.write(`${JSON.stringify(socketDetails, null, '\t')}\n`);    
    if (req.socket.authorized){
        res.write(`client-cert:${req.socket.getPeerCertificate().subject.CN}\n`);
    }
    res.write(`</body>\n`);
    cb(req,res)
}