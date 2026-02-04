const http = require('http');
const fs = require('fs');
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const fileName = req.url === '/cam' ? 'cam-audit.json' : 'layout-audit.json';
      fs.writeFileSync(fileName, body);
      console.log(`Audit log saved to ${fileName}`);
      res.end('ok');
      // 不再自动退出，方便多次收集
    });
  }
});
server.listen(9999, () => console.log('Log collector running on port 9999...'));
