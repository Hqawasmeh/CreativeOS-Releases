const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

let dataDir = '';
let stateFile = '';
let tokenFile = '';
let server = null;
let serverPort = 32145;

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();

function configure(dir) {
  dataDir = dir;
  stateFile = path.join(dir, 'qanteak-v021-platform.json');
  tokenFile = path.join(dir, 'qanteak-v021-api-token.txt');
  ensureState();
}

function defaultState() {
  return {
    version: 21,
    release: 'RC9 V0.21',
    schemas: [],
    objects: [],
    views: [],
    forms: [],
    dashboards: [],
    automations: [],
    approvals: [],
    contexts: [],
    skills: [],
    agents: [],
    comments: [],
    citations: [],
    webhooks: [],
    connectors: [],
    instructions: { workspace: '', user: '' },
    governance: {
      requireApprovalForWrites: true,
      externalActionsEnabled: false,
      computerUseEnabled: false,
      allowedTools: ['search','read','create_object','update_object','run_automation'],
      allowedModels: ['local-deterministic'],
      retentionDays: 365
    },
    audit: [],
    platform: { apiEnabled: false, port: 32145, mcpEnabled: false },
    migratedFromV020: false,
    createdAt: now(),
    updatedAt: now()
  };
}

function ensureState() {
  if (!dataDir) throw new Error('Platform storage is not configured.');
  if (!fs.existsSync(stateFile)) writeState(defaultState());
  if (!fs.existsSync(tokenFile)) fs.writeFileSync(tokenFile, crypto.randomBytes(24).toString('hex'), { mode: 0o600 });
}

function readState() {
  ensureState();
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return { ...defaultState(), ...parsed, platform: { ...defaultState().platform, ...(parsed.platform || {}) }, governance: { ...defaultState().governance, ...(parsed.governance || {}) }, instructions: { ...defaultState().instructions, ...(parsed.instructions || {}) } };
  } catch {
    const fallback = defaultState();
    writeState(fallback);
    return fallback;
  }
}

function writeState(next) {
  if (!dataDir) throw new Error('Platform storage is not configured.');
  const normalized = { ...defaultState(), ...clone(next || {}), version: 21, release: 'RC9 V0.21', updatedAt: now() };
  const temp = `${stateFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(normalized, null, 2), 'utf8');
  fs.renameSync(temp, stateFile);
  return clone(normalized);
}

function audit(action, detail = '', actor = 'local-user') {
  const s = readState();
  s.audit = Array.isArray(s.audit) ? s.audit : [];
  s.audit.unshift({ id: crypto.randomUUID(), action, detail: String(detail || ''), actor, at: now() });
  s.audit = s.audit.slice(0, 2000);
  return writeState(s);
}

function token() {
  ensureState();
  return fs.readFileSync(tokenFile, 'utf8').trim();
}

function safeObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const { id, type, title, name, schemaId, values, owner, createdAt, updatedAt, source, relations } = obj;
  return { id, type, title, name, schemaId, values, owner, createdAt, updatedAt, source, relations };
}

function searchObjects(query = '') {
  const s = readState();
  const q = String(query || '').trim().toLowerCase();
  const objects = [...(s.objects || [])];
  if (!q) return objects.slice(0, 100).map(safeObject);
  return objects.filter(o => JSON.stringify(o).toLowerCase().includes(q)).slice(0, 100).map(safeObject);
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store' });
  res.end(payload);
}

function authorized(req) {
  const presented = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!presented) return false;
  const expected = Buffer.from(token());
  const received = Buffer.from(presented);
  return expected.length === received.length && crypto.timingSafeEqual(received, expected);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    chunks.push(chunk);
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Request body too large.');
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function mcpTools() {
  return [
    { name: 'qanteak_search', description: 'Search permission-scoped local Qanteak objects.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    { name: 'qanteak_get_object', description: 'Read one local Qanteak object by ID.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
    { name: 'qanteak_create_object', description: 'Create a generic local Qanteak object. Writes remain audit logged.', inputSchema: { type: 'object', properties: { type: { type: 'string' }, title: { type: 'string' }, values: { type: 'object' } }, required: ['type','title'] } }
  ];
}

async function handleMcp(body) {
  const id = body?.id ?? null;
  if (body?.method === 'initialize') return { jsonrpc: '2.0', id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'qanteak-local', version: '0.21' } } };
  if (body?.method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: mcpTools() } };
  if (body?.method === 'tools/call') {
    const name = body?.params?.name;
    const args = body?.params?.arguments || {};
    if (name === 'qanteak_search') return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(searchObjects(args.query), null, 2) }] } };
    const s = readState();
    if (name === 'qanteak_get_object') {
      const obj = (s.objects || []).find(o => o.id === args.id);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(safeObject(obj), null, 2) }] } };
    }
    if (name === 'qanteak_create_object') {
      const obj = { id: crypto.randomUUID(), type: String(args.type || 'object'), title: String(args.title || 'Untitled'), values: args.values && typeof args.values === 'object' ? args.values : {}, createdAt: now(), updatedAt: now(), source: 'mcp' };
      s.objects.push(obj);
      s.audit.unshift({ id: crypto.randomUUID(), action: 'MCP object created', detail: obj.title, actor: 'mcp-client', at: now() });
      writeState(s);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(safeObject(obj), null, 2) }] } };
    }
    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Tool not found' } };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
}

function requestHandler(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${serverPort}`);
  if (url.pathname === '/health') return json(res, 200, { ok: true, product: 'Qanteak OS', release: 'RC9 V0.21', api: true });
  if (!authorized(req)) return json(res, 401, { error: 'Unauthorized' });
  if (req.method === 'GET' && url.pathname === '/v1/objects') return json(res, 200, { objects: searchObjects(url.searchParams.get('q') || '') });
  if (req.method === 'GET' && url.pathname.startsWith('/v1/objects/')) {
    const id = decodeURIComponent(url.pathname.slice('/v1/objects/'.length));
    const obj = (readState().objects || []).find(o => o.id === id);
    return obj ? json(res, 200, { object: safeObject(obj) }) : json(res, 404, { error: 'Object not found' });
  }
  if (req.method === 'GET' && url.pathname === '/v1/schemas') return json(res, 200, { schemas: readState().schemas || [] });
  if (req.method === 'GET' && url.pathname === '/v1/audit') return json(res, 200, { audit: (readState().audit || []).slice(0, 250) });
  if (req.method === 'POST' && url.pathname === '/mcp') {
    return readJson(req).then(body => handleMcp(body)).then(body => json(res, 200, body)).catch(err => json(res, 400, { error: err.message }));
  }
  return json(res, 404, { error: 'Not found' });
}

async function startApi(port = 32145) {
  if (server) return apiStatus();
  serverPort = Number(port) || 32145;
  await new Promise((resolve, reject) => {
    server = http.createServer(requestHandler);
    server.once('error', err => { server = null; reject(err); });
    server.listen(serverPort, '127.0.0.1', resolve);
  });
  const s = readState();
  s.platform = { ...(s.platform || {}), apiEnabled: true, mcpEnabled: true, port: serverPort };
  writeState(s);
  audit('Local API enabled', `127.0.0.1:${serverPort}`);
  return apiStatus();
}

async function stopApi() {
  if (server) await new Promise(resolve => server.close(resolve));
  server = null;
  const s = readState();
  s.platform = { ...(s.platform || {}), apiEnabled: false, mcpEnabled: false };
  writeState(s);
  audit('Local API disabled', 'Local API and MCP endpoint stopped');
  return apiStatus();
}

function apiStatus() {
  const s = readState();
  return { enabled: Boolean(server), configured: Boolean(s.platform?.apiEnabled), port: serverPort, host: '127.0.0.1', token: server ? token() : '', mcpPath: '/mcp', baseUrl: `http://127.0.0.1:${serverPort}` };
}

async function sendWebhook(url, payload) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Webhook URL must use HTTPS.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(parsed, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'QanteakOS/0.21' }, body: JSON.stringify(payload || {}), signal: controller.signal });
    if (!response.ok) throw new Error(`Webhook failed with HTTP ${response.status}.`);
    audit('Webhook delivered', parsed.hostname);
    return { ok: true, status: response.status };
  } finally { clearTimeout(timeout); }
}

module.exports = { configure, readState, writeState, audit, startApi, stopApi, apiStatus, sendWebhook, searchObjects };
