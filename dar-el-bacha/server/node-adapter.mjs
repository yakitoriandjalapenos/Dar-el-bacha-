/*
  Adaptateur pour un serveur Node.js (http) : utilisé par npm run dev et npm run serve.
  Sur un hébergement « serverless » (Cloudflare Pages Functions, Netlify Functions…), un adaptateur
  équivalent de quelques lignes appellera le même handler (voir server/README.md).
*/
export function toNodeHandler(handle, { maxBodyBytes = 10 * 1024, trustProxy = false } = {}) {
  return (req, res) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Requête trop volumineuse');
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on('end', async () => {
      if (res.writableEnded) return;
      const forwarded = trustProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
      const r = await handle({ method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString('utf8'), ip: forwarded || req.socket.remoteAddress });
      res.writeHead(r.status, r.headers);
      res.end(r.body || '');
    });
  };
}
