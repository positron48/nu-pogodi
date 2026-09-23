const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', process.env.SERVE_DIST ? 'dist' : '.');
const types = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.md':'text/plain; charset=utf-8'};
const port = Number(process.env.PORT || 4173);
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  // Serve the project under a subdirectory too, as GitHub Pages does.
  pathname = pathname.replace(/^\/nu-pogodi\//, '/');
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'});
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}`));
