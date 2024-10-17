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
const color = args.length>2 ? args[2] : process.env.SCOLOR;
const portHttp = args.length>3 ? args[3] : process.env.PORTHTTP;
const portSSL = args.length>4 ? args[4] : process.env.PORTSSL;
// Read env variable azureStorageAccountName from args or .env
const azureStorageAccountName = args.length>5 ? args[5] : process.env.AZURE_STORAGE_ACCOUNT_NAME;
// Read env variable azureStorageContainer from args or .env
const azureStorageContainerName = args.length>6 ? args[6] : process.env.AZURE_STORAGE_CONTAINER_NAME;
// Read env variable azureStorageBlob from args or .env
const azureStorageBlobName = args.length>7 ? args[7] : process.env.AZURE_STORAGE_BLOB_NAME;

console.count(portHttp)

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

const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

// Instantiate a DefaultAzureCredential which will use the managed identity
const credential = new DefaultAzureCredential();

// Replace '<storage-account-url>' with the URL of your storage account
const blobStorageAccountUrl = 'https://'+azureStorageAccountName+'.blob.core.windows.net';
const blobServiceClient = new BlobServiceClient(blobStorageAccountUrl, credential);

async function requestDefaultHandler(req,res,cb){
    let socketDetails = {
        ladd:req.socket.localAddress,
        lport:req.socket.localPort,
        radd:req.socket.remoteAddress,
        rport:req.socket.remotePort
    };
    res.setHeader('server',color);
    // match on request path blob
    if (req.url.match(/\/blob\//)){
        // res.setHeader('Content-Type','application/json');
        const containerClient = blobServiceClient.getContainerClient(azureStorageContainerName);
        const blobClient = containerClient.getBlobClient(azureStorageBlobName);
        const downloadBlockBlobResponse = await blobClient.download(0);
        // const blobData = (await streamToBuffer(downloadBlockBlobResponse.readableStreamBody)).toString();
        const blobData = await streamToText(downloadBlockBlobResponse.readableStreamBody);
        let jsonHeaderString = downloadBlockBlobResponse._response.headers;
        let blobResponseHeaders = JSON.parse(jsonHeaderString);
        for (let [key, value] of Object.entries(blobResponseHeaders)) {
          logger.info(`BlobHeader ${key} : ${value}`)
          res.setHeader(key,value);
        }
        res.write(blobData);
    } else {
        res.write(`<body bgcolor="${color}"><pre>\n`);
        res.write(`Incoming Request URL: ${req.url}\n`)
        res.write(`reqh:${JSON.stringify(req.headers, null, '\t')}\n`);
        res.write(`resh:${JSON.stringify(res.getHeaders(), null, '\t')}\n`);
        res.write(`${JSON.stringify(socketDetails, null, '\t')}\n`);
        if (req.socket.authorized){
            res.write(`client-cert:${req.socket.getPeerCertificate().subject.CN}\n`);
        }
        res.write(`</pre></body>\n`);
    }
    cb(req,res)
}

async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", reject);
  });
}

// Convert stream to text
async function streamToText(readable) {
    readable.setEncoding('utf8');
    let data = '';
    for await (const chunk of readable) {
      data += chunk;
    }
    return data;
  }