/**
 * Verified scaffold templates. Pure functions → path → content.
 * Placeholders: {{NAME}}, {{GOAL}}, {{LANG}}, {{YEAR}}
 */
import type { AppIr, ResolvedStack } from './ir.ts';

function fill(template: string, ir: AppIr): string {
  const year = String(new Date().getFullYear());
  return template
    .replaceAll('{{NAME}}', ir.name)
    .replaceAll('{{GOAL}}', ir.goal.replace(/\n/g, ' ').slice(0, 500))
    .replaceAll('{{LANG}}', ir.language === 'ru' ? 'ru' : 'en')
    .replaceAll('{{YEAR}}', year);
}

function deployMd(ir: AppIr, stack: ResolvedStack): string {
  const isNode = stack !== 'static_site';
  return fill(
    [
      '# {{NAME}}',
      '',
      '{{GOAL}}',
      '',
      '## Local run',
      '',
      ...(isNode
        ? [
            '```bash',
            'cp .env.example .env   # if present',
            'npm install',
            'npm start',
            '```',
            '',
            'Open the URL printed in the terminal (default http://localhost:3000).',
          ]
        : [
            'Open `index.html` in a browser, or serve the folder:',
            '',
            '```bash',
            'npx --yes serve -p 3000 .',
            '```',
          ]),
      '',
      '## Manual deploy (GitHub → Render / Railway)',
      '',
      '1. Create an empty GitHub repository.',
      '2. Upload these files (`git init && git add . && git commit && git push`).',
      '3. **Render:** New → Web Service → connect repo.',
      ...(isNode
        ? [
            '   - Build: `npm install`',
            '   - Start: `npm start`',
            '   - Add env vars from `.env.example`.',
          ]
        : [
            '   - Or use static hosting / Render Static Site.',
            '   - Publish directory: `.`',
          ]),
      '4. **Railway:** New Project → Deploy from GitHub → set variables → deploy.',
      '',
      'BiForge does not push or deploy for you. You stay in control of accounts and merges.',
      '',
      '## Notes',
      '',
      `- Stack: ${stack}`,
      '- Auth / DB flags are encoded in IR; this scaffold is intentionally small and reviewable.',
      '',
    ].join('\n'),
    ir,
  );
}

export function materializeScaffold(stack: ResolvedStack, ir: AppIr): Record<string, string> {
  switch (stack) {
    case 'static_site':
      return staticSite(ir);
    case 'node_api':
      return nodeApi(ir);
    case 'node_express_static':
      return nodeExpressStatic(ir);
    default:
      return staticSite(ir);
  }
}

function staticSite(ir: AppIr): Record<string, string> {
  const title = ir.language === 'ru' ? ir.name : ir.name;
  return {
    'README.md': deployMd(ir, 'static_site'),
    'index.html': fill(
      `<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{NAME}}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="wrap">
    <h1>{{NAME}}</h1>
    <p class="lead">{{GOAL}}</p>
    <section id="app" aria-live="polite"></section>
  </main>
  <script src="app.js"></script>
</body>
</html>
`,
      ir,
    ),
    'styles.css': `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#e8eef7}
.wrap{max-width:40rem;margin:0 auto;padding:2rem 1.25rem}.lead{color:#9fb0c7;line-height:1.5}
button,input,textarea{font:inherit;border-radius:8px;border:1px solid #3d5a80;background:#132033;color:#e8eef7;padding:.6rem .8rem}
button{cursor:pointer;background:#1b3a5f}button:hover{background:#244a75}
.list{list-style:none;padding:0;margin:1rem 0}.list li{padding:.6rem 0;border-bottom:1px solid #243247}
`,
    'app.js': fill(
      `(() => {
  const root = document.getElementById('app');
  if (!root) return;
  const key = 'bf_{{NAME}}_notes';
  const state = { items: [] };
  try { state.items = JSON.parse(localStorage.getItem(key) || '[]'); } catch { state.items = []; }

  function save() { localStorage.setItem(key, JSON.stringify(state.items)); }

  function render() {
    root.innerHTML = '';
    const form = document.createElement('form');
    form.innerHTML = '<label style="display:grid;gap:6px">Note<textarea name="t" rows="3" required maxlength="500"></textarea></label><p style="margin-top:8px"><button type="submit">Add</button></p>';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const t = String(fd.get('t') || '').trim();
      if (!t) return;
      state.items.unshift({ id: Date.now(), t });
      save();
      form.reset();
      render();
    });
    const ul = document.createElement('ul');
    ul.className = 'list';
    for (const item of state.items) {
      const li = document.createElement('li');
      li.textContent = item.t;
      ul.appendChild(li);
    }
    root.appendChild(form);
    root.appendChild(ul);
  }
  render();
})();
`,
      ir,
    ),
  };
}

function nodeApi(ir: AppIr): Record<string, string> {
  return {
    'README.md': deployMd(ir, 'node_api'),
    '.env.example': 'PORT=3000\n# DATABASE_URL=\n',
    'package.json': JSON.stringify(
      {
        name: ir.name,
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: { start: 'node server.js', dev: 'node server.js' },
        engines: { node: '>=18' },
      },
      null,
      2,
    ) + '\n',
    'server.js': fill(
      `import http from 'node:http';

const port = Number(process.env.PORT) || 3000;
const notes = [];

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(data);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, service: '{{NAME}}' });
  }
  if (req.method === 'GET' && url.pathname === '/api/notes') {
    return json(res, 200, { items: notes });
  }
  if (req.method === 'POST' && url.pathname === '/api/notes') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { return json(res, 400, { error: 'invalid_json' }); }
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return json(res, 400, { error: 'text_required' });
    const item = { id: Date.now(), text };
    notes.unshift(item);
    return json(res, 201, item);
  }
  json(res, 404, { error: 'not_found' });
});

server.listen(port, () => {
  console.log('{{NAME}} API on http://localhost:' + port);
});
`,
      ir,
    ),
  };
}

function nodeExpressStatic(ir: AppIr): Record<string, string> {
  return {
    'README.md': deployMd(ir, 'node_express_static'),
    '.env.example': 'PORT=3000\n# SESSION_SECRET=change-me\n# DATABASE_URL=\n',
    'package.json': JSON.stringify(
      {
        name: ir.name,
        version: '1.0.0',
        private: true,
        type: 'module',
        scripts: { start: 'node server.js', dev: 'node server.js' },
        engines: { node: '>=18' },
        dependencies: {},
      },
      null,
      2,
    ) + '\n',
    'server.js': fill(
      `import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT) || 3000;
const notes = [];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  let rel = (req.url || '/').split('?')[0];
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: '{{NAME}}' });
  }
  if (req.method === 'GET' && url.pathname === '/api/notes') {
    return sendJson(res, 200, { items: notes });
  }
  if (req.method === 'POST' && url.pathname === '/api/notes') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { return sendJson(res, 400, { error: 'invalid_json' }); }
    const text = String(body.text || '').trim().slice(0, 500);
    if (!text) return sendJson(res, 400, { error: 'text_required' });
    const item = { id: Date.now(), text };
    notes.unshift(item);
    return sendJson(res, 201, item);
  }
  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'not_found' });
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log('{{NAME}} on http://localhost:' + port);
});
`,
      ir,
    ),
    'public/index.html': fill(
      `<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{NAME}}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <main class="wrap">
    <h1>{{NAME}}</h1>
    <p class="lead">{{GOAL}}</p>
    <section id="app"></section>
  </main>
  <script src="/app.js"></script>
</body>
</html>
`,
      ir,
    ),
    'public/styles.css': `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#e8eef7}
.wrap{max-width:40rem;margin:0 auto;padding:2rem 1.25rem}.lead{color:#9fb0c7;line-height:1.5}
button,input,textarea{font:inherit;border-radius:8px;border:1px solid #3d5a80;background:#132033;color:#e8eef7;padding:.6rem .8rem}
button{cursor:pointer;background:#1b3a5f}
.list{list-style:none;padding:0}.list li{padding:.55rem 0;border-bottom:1px solid #243247}
`,
    'public/app.js': `async function api(path, opts) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
(() => {
  const root = document.getElementById('app');
  if (!root) return;
  async function render() {
    const data = await api('/api/notes');
    root.innerHTML = '';
    const form = document.createElement('form');
    form.innerHTML = '<label style="display:grid;gap:6px">Note<textarea name="t" rows="3" required maxlength="500"></textarea></label><p><button type="submit">Add</button></p>';
    form.onsubmit = async (e) => {
      e.preventDefault();
      const t = new FormData(form).get('t');
      await api('/api/notes', { method: 'POST', body: JSON.stringify({ text: t }) });
      form.reset();
      render();
    };
    const ul = document.createElement('ul');
    ul.className = 'list';
    for (const item of data.items || []) {
      const li = document.createElement('li');
      li.textContent = item.text;
      ul.appendChild(li);
    }
    root.appendChild(form);
    root.appendChild(ul);
  }
  render().catch((err) => { root.textContent = String(err.message || err); });
})();
`,
  };
}
