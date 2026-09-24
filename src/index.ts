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
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Unified Mail</title>
</head>
<body>
  <h1>Unified Mail 管理后台</h1>
  <p>部署成功！请访问 <a href="/api/accounts">/api/accounts</a> 查看账户列表。</p>
  <p>或者把完整的 index.html 内容替换到这里。</p>
</body>
</html>`);
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
