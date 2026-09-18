const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const files = {
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/manifest.json': ['manifest.json', 'application/json'],
  '/sw.js': ['sw.js', 'application/javascript'],
  '/icons/spesa-192.png': ['icons/spesa-192.png', 'image/png'],
  '/icons/spesa-512.png': ['icons/spesa-512.png', 'image/png'],
  '/icons/spesa-maskable-192.png': ['icons/spesa-maskable-192.png', 'image/png'],
  '/icons/spesa-maskable-512.png': ['icons/spesa-maskable-512.png', 'image/png']
};

http.createServer((request, response) => {
  const file = files[new URL(request.url, 'http://localhost').pathname];
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
  response.end(fs.readFileSync(path.join(__dirname, '..', file[0])));
}).listen(4173, '127.0.0.1');
