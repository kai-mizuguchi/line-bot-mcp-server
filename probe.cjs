// Minimal probe: CJS, zero deps, immediate port bind
// Start Command: node probe.js
const http = require('http');
const port = parseInt(process.env.PORT || '10000');

process.stdout.write('[probe] started port=' + port + '\n');
process.stderr.write('[probe] started port=' + port + '\n');

const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end('probe OK\n');
});

server.on('error', (err) => {
  process.stdout.write('[probe] ERROR: ' + err.code + ' ' + err.message + '\n');
  process.stderr.write('[probe] ERROR: ' + err.code + ' ' + err.message + '\n');
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write('[probe] listening on 0.0.0.0:' + port + '\n');
  process.stderr.write('[probe] listening on 0.0.0.0:' + port + '\n');
});
