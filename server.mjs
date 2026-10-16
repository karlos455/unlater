import http from 'node:http';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { validateState } from './public/core.js';

const root = resolve(import.meta.dirname, 'public');
const dataDir = resolve(process.env.DATA_DIR || resolve(import.meta.dirname, 'data'));
const dataFile = resolve(dataDir, 'state.json');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.png':'image/png' };
let revision = 0;
let sharedState = null;
let writeQueue = Promise.resolve();

await mkdir(dataDir, { recursive:true });
try {
  const saved = JSON.parse(await readFile(dataFile, 'utf8'));
  revision = Number.isSafeInteger(saved.revision) && saved.revision >= 0 ? saved.revision : 0;
  sharedState = saved.state == null ? null : validateState(saved.state);
} catch (error) {
  if (error.code !== 'ENOENT') throw new Error(`Não foi possível carregar ${dataFile}: ${error.message}`);
}

function send(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers });
  res.end(JSON.stringify(value));
}

async function readBody(req, limit = 100 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('O estado excede o limite de 100 MB.'), { status:413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('JSON inválido.'), { status:400 }); }
}

function queueWrite(operation) {
  const next = writeQueue.then(operation);
  writeQueue = next.catch(() => {});
  return next;
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' });
      return res.end('ok');
    }
    if (pathname === '/api/state' && req.method === 'GET') return send(res, 200, { revision, state:sharedState });
    if (pathname === '/api/state' && req.method === 'PUT') {
      const body = await readBody(req);
      if (!Number.isSafeInteger(body.revision) || !body.state) return send(res, 400, { error:'Pedido inválido.' });
      let nextState;
      try { nextState = validateState(body.state); }
      catch (error) { return send(res, 422, { error:error.message }); }
      return await queueWrite(async () => {
        if (body.revision !== revision) return send(res, 409, { revision, state:sharedState, error:'O estado foi actualizado noutro dispositivo.' });
        const next = { revision:revision + 1, state:nextState };
        const temporaryFile = `${dataFile}.tmp`;
        await writeFile(temporaryFile, JSON.stringify(next), { encoding:'utf8', mode:0o600 });
        await rename(temporaryFile, dataFile);
        revision = next.revision;
        sharedState = next.state;
        return send(res, 200, { revision, state:sharedState });
      });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (!res.headersSent) send(res, error.status || 404, { error:error.message || 'Não encontrado.' });
    else res.destroy(error);
  }
});

server.listen(Number(process.env.PORT || 4173), '0.0.0.0', () => console.log(`Unlater: http://0.0.0.0:${server.address().port}`));
