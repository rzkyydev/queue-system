const http = require('http');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class OverlayServer extends EventEmitter {
    constructor(port = 3333) {
        super();
        this.port = port;
        this.clients = [];
        this.latestData = null; // Cache to send immediately upon connection

        this.server = http.createServer((req, res) => {
            // Handle CORS for local dev
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            if (req.url === '/events') {
                this._handleSSE(req, res);
            } else if (req.url === '/overlay') {
                this._serveFile(res, 'overlay.html', 'text/html');
            } else if (req.url === '/overlay.css') {
                this._serveFile(res, 'overlay.css', 'text/css');
            } else if (req.url === '/overlay.js') {
                this._serveFile(res, 'overlay.js', 'text/javascript');
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });
    }

    start() {
        this.server.listen(this.port, '127.0.0.1', () => {
            console.log(`Overlay Server running at http://127.0.0.1:${this.port}/overlay`);
        });
    }

    stop() {
        this.server.close();
    }

    _serveFile(res, filename, contentType) {
        const filePath = path.join(__dirname, '../../overlay', filename);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end(`Error: ${err.code}`);
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }

    _handleSSE(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        const clientId = Date.now();
        const client = { id: clientId, res };
        this.clients.push(client);

        // Send latest data immediately on connect
        if (this.latestData) {
            res.write(`data: ${JSON.stringify(this.latestData)}\n\n`);
        } else {
            res.write(`data: {}\n\n`);
        }

        req.on('close', () => {
            this.clients = this.clients.filter(c => c.id !== clientId);
        });
    }

    broadcast(data) {
        this.latestData = data;
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        this.clients.forEach(client => client.res.write(payload));
    }
}

module.exports = OverlayServer;
