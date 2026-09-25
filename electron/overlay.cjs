const http = require('node:http');

class OverlayServer {
  constructor() { this.server = null; this.port = 17942; this.state = { title: 'Nightwave', artist: 'Nothing playing', artwork: '', playing: false }; this.clients = new Set(); }
  start(port = 17942) {
    this.stop();
    this.port = Math.min(65535, Math.max(1024, Number(port) || 17942));
    this.server = http.createServer((req, res) => {
      if (req.url === '/events') {
        res.writeHead(200, { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive', 'Access-Control-Allow-Origin':'*' });
        res.write(`data: ${JSON.stringify(this.state)}\n\n`);
        this.clients.add(res);
        req.on('close', () => this.clients.delete(res));
        return;
      }
      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache' });
      res.end(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent;color:#fff;font-family:Arial,sans-serif}.nw{display:flex;align-items:center;gap:14px;padding:12px}.art{width:72px;height:72px;object-fit:cover;filter:grayscale(1);background:#111}.t{font-weight:800;font-size:22px}.a{color:#aaa;margin-top:4px;font-size:14px}</style><div class="nw"><img class="art"><div><div class="t">Nightwave</div><div class="a">Nothing playing</div></div></div><script>const art=document.querySelector('.art'),t=document.querySelector('.t'),a=document.querySelector('.a');new EventSource('/events').onmessage=e=>{const d=JSON.parse(e.data);t.textContent=d.title||'Nightwave';a.textContent=d.artist||'';if(d.artwork){art.src=d.artwork;art.style.display='block'}else art.style.display='none'};</script>`);
    });
    this.server.listen(this.port, '127.0.0.1');
  }
  update(next = {}) {
    this.state = { ...this.state, ...next };
    const msg = `data: ${JSON.stringify(this.state)}\n\n`;
    for (const client of [...this.clients]) { try { client.write(msg); } catch { this.clients.delete(client); } }
  }
  stop() { for (const c of this.clients) { try { c.end(); } catch {} } this.clients.clear(); try { this.server?.close(); } catch {} this.server = null; }
}
module.exports = { OverlayServer };
