import { Hono } from 'hono';
import { GmailAdapter } from './adapters/gmail';
import { GraphAdapter } from './adapters/graph';
import { ImapAdapter } from './adapters/imap';
import { encrypt, decrypt } from './crypto';

type Env = {
  DB: D1Database;
  TOKEN_KV: KVNamespace;
  ADMIN_PASSWORD: string;
  COOKIE_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  MS_CLIENT_ID: string;
  MS_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unified Mail</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f0f2f5; }
    .card { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    input, select { width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 4px; width: 100%; font-size: 16px; }
    .account-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .btn-del { background: #dc2626; width: auto; padding: 4px 10px; font-size: 12px; }
  </style>
</head>
<body>
  <h2>📬 统一邮件管理</h2>
  <div class="card">
    <h3>添加通用 IMAP 邮箱</h3>
    <input id="email" placeholder="邮箱地址 (例如: 12345@qq.com)">
    <input id="imap_host" placeholder="IMAP 服务器 (例如: imap.qq.com)">
    <input id="imap_port" value="993" placeholder="IMAP 端口">
    <input id="smtp_host" placeholder="SMTP 服务器 (例如: smtp.qq.com)">
    <input id="smtp_port" value="465" placeholder="SMTP 端口">
    <input id="password" type="password" placeholder="密码或授权码">
    <button onclick="addAccount()">保存邮箱</button>
  </div>

  <div class="card">
    <h3>已连接的邮箱</h3>
    <div id="account-list">加载中...</div>
  </div>

  <script>
    async function loadAccounts() {
      const res = await fetch('/api/accounts');
      const accounts = await res.json();
      const list = document.getElementById('account-list');
      if (!accounts || accounts.length === 0) {
        list.innerHTML = '<p style="color:#888;">还没有添加任何邮箱。</p>';
        return;
      }
      list.innerHTML = accounts.map(a => \`
        <div class="account-item">
          <span>\\\${a.email} (\\\${a.provider})</span>
          <button class="btn-del" onclick="deleteAccount('\\\${a.id}')">删除</button>
        </div>
      \`).join('');
    }

    async function addAccount() {
      const body = {
        email: document.getElementById('email').value,
        imap_host: document.getElementById('imap_host').value,
        imap_port: parseInt(document.getElementById('imap_port').value),
        smtp_host: document.getElementById('smtp_host').value,
        smtp_port: parseInt(document.getElementById('smtp_port').value),
        password: document.getElementById('password').value
      };
      const res = await fetch('/api/accounts/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert('添加成功！');
        loadAccounts();
      } else {
        alert('添加失败，请检查密码或服务器配置');
      }
    }

    async function deleteAccount(id) {
      if (!confirm('确定删除吗？')) return;
      await fetch('/api/accounts/' + id, { method: 'DELETE' });
      loadAccounts();
    }

    loadAccounts();
  </script>
</body>
</html>
  `);
});

app.get('/api/accounts', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, display_name, provider, enabled FROM accounts ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

app.post('/api/accounts/imap', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const encrypted = await encrypt(body.password, c.env.COOKIE_SECRET);

  await c.env.DB.prepare(
    `INSERT INTO accounts (id, email, provider, imap_host, imap_port, smtp_host, smtp_port, auth_type, encrypted_password, created_at)
     VALUES (?, ?, 'imap', ?, ?, ?, ?, 'password', ?, ?)`
  ).bind(id, body.email, body.imap_host, body.imap_port, body.smtp_host, body.smtp_port, encrypted, Date.now()).run();

  return c.json({ id, email: body.email });
});

app.get('/api/accounts/:id/messages', async (c) => {
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?')
    .bind(c.req.param('id')).first() as any;
  if (!account) return c.json({ error: 'Account not found' }, 404);

  let messages: any[] = [];

  if (account.provider === 'gmail') {
    const adapter = new GmailAdapter(
      account.oauth_refresh_token, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET
    );
    const ids = await adapter.listMessages(20);
    for (const m of ids.slice(0, 10)) {
      messages.push(await adapter.getMessage(m.id));
    }
  } else if (account.provider === 'outlook') {
    const adapter = new GraphAdapter(
      account.oauth_refresh_token, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET
    );
    messages = await adapter.listMessages(20);
  } else {
    const adapter = new ImapAdapter(
      account.imap_host, account.imap_port,
      account.smtp_host, account.smtp_port,
      account.email,
      await decrypt(account.encrypted_password, c.env.COOKIE_SECRET)
    );
    messages = await adapter.fetchInbox(10);
  }

  return c.json(messages);
});

app.post('/api/accounts/:id/send', async (c) => {
  const account = await c.env.DB.prepare('SELECT * FROM accounts WHERE id = ?')
    .bind(c.req.param('id')).first() as any;
  const { to, subject, body } = await c.req.json();

  if (account.provider === 'gmail') {
    const adapter = new GmailAdapter(
      account.oauth_refresh_token, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET
    );
    await adapter.sendMessage(to, subject, body);
  } else if (account.provider === 'outlook') {
    const adapter = new GraphAdapter(
      account.oauth_refresh_token, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET
    );
    await adapter.sendMessage(to, subject, body);
  } else {
    const adapter = new ImapAdapter(
      account.imap_host, account.imap_port,
      account.smtp_host, account.smtp_port,
      account.email,
      await decrypt(account.encrypted_password, c.env.COOKIE_SECRET)
    );
    await adapter.sendMail(to, subject, body);
  }

  return c.json({ success: true });
});

app.get('/oauth/gmail/callback', async (c) => {
  const code = c.req.query('code');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code: code!,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${new URL(c.req.url).origin}/oauth/gmail/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json() as any;
  const profile = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profileData = await profile.json() as any;
  const email = profileData.emailAddress;

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO accounts (id, email, provider, auth_type, oauth_refresh_token, created_at)
     VALUES (?, ?, 'gmail', 'oauth', ?, ?)`
  ).bind(id, email, data.refresh_token, Date.now()).run();

  return c.redirect('/');
});

export default app;
