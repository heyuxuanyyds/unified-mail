import { Hono } from 'hono';
import { GmailAdapter } from './adapters/gmail';
import { GraphAdapter } from './adapters/graph';
import { ImapAdapter } from './adapters/imap';
import { encrypt, decrypt } from './crypto';
import { getCookie, setCookie } from 'hono/cookie';

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

  <!-- 登录卡片 -->
  <div id="login-card" class="card">
    <h3>管理员登录</h3>
    <input id="admin-pwd" type="password" placeholder="请输入管理密码 (ADMIN_PASSWORD)">
    <button id="btn-login">登录</button>
  </div>

  <!-- 主内容区（默认隐藏） -->
  <div id="main-content" style="display:none;">
    <div class="card">
      <h3>添加通用 IMAP 邮箱</h3>
      <input id="email" placeholder="邮箱地址 (例如: 12345@qq.com)">
      <input id="imap_host" placeholder="IMAP 服务器 (例如: imap.qq.com)">
      <input id="imap_port" value="993" placeholder="IMAP 端口">
      <input id="smtp_host" placeholder="SMTP 服务器 (例如: smtp.qq.com)">
      <input id="smtp_port" value="465" placeholder="SMTP 端口">
      <input id="password" type="password" placeholder="密码或授权码">
      <button id="btn-save">保存邮箱</button>
    </div>

    <div class="card">
      <h3>已连接的邮箱</h3>
      <div id="account-list">加载中...</div>
    </div>
  </div>

  <script>
    // 绑定登录按钮
    document.getElementById('btn-login').addEventListener('click', function() {
      var pwd = document.getElementById('admin-pwd').value;
      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      }).then(function(res) {
        if (res.ok) {
          document.getElementById('login-card').style.display = 'none';
          document.getElementById('main-content').style.display = 'block';
          loadAccounts();
        } else {
          alert('密码错误');
        }
      });
    });

    // 绑定保存邮箱按钮
    document.getElementById('btn-save').addEventListener('click', function() {
      var body = {
        email: document.getElementById('email').value,
        imap_host: document.getElementById('imap_host').value,
        imap_port: parseInt(document.getElementById('imap_port').value),
        smtp_host: document.getElementById('smtp_host').value,
        smtp_port: parseInt(document.getElementById('smtp_port').value),
        password: document.getElementById('password').value
      };
      fetch('/api/accounts/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function(res) {
        if (res.ok) {
          alert('添加成功！');
          loadAccounts();
        } else {
          if (res.status === 401) { alert('登录已失效，请刷新页面重新登录'); }
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
    .account-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; align-items: center; }
    .btn-del { background: #dc2626; width: auto; padding: 4px 10px; font-size: 12px; }
    .btn-view { background: #16a34a; width: auto; padding: 4px 10px; font-size: 12px; }
    .btn-gmail { background: #ea4335; margin-bottom: 10px; }
    .btn-ms { background: #00a4ef; margin-bottom: 10px; }
    .msg-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .msg-subject { font-weight: bold; }
    .msg-meta { font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <h2>📬 统一邮件管理</h2>

  <div id="login-card" class="card">
    <h3>管理员登录</h3>
    <input id="admin-pwd" type="password" placeholder="请输入管理密码">
    <button id="btn-login">登录</button>
  </div>

  <div id="main-content" style="display:none;">
    <div class="card">
      <h3>添加通用 IMAP 邮箱</h3>
      <input id="email" placeholder="邮箱地址">
      <input id="imap_host" placeholder="IMAP 服务器">
      <input id="imap_port" value="993" placeholder="IMAP 端口">
      <input id="smtp_host" placeholder="SMTP 服务器">
      <input id="smtp_port" value="465" placeholder="SMTP 端口">
      <input id="password" type="password" placeholder="密码或授权码">
      <button id="btn-save">保存邮箱</button>
    </div>

    <div class="card">
      <h3>添加 Gmail 账户</h3>
      <button class="btn-gmail" id="btn-gmail-auth">使用 Google 账号授权</button>
    </div>

    <div class="card">
      <h3>添加 Outlook 账户</h3>
      <button class="btn-ms" id="btn-ms-auth">使用 Microsoft 账号授权</button>
    </div>

    <div class="card">
      <h3>已连接的邮箱</h3>
      <div id="account-list">加载中...</div>
    </div>

    <div class="card" id="mail-list-card" style="display:none;">
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <h3 id="mail-list-title">邮件列表</h3>
        <button class="btn-del" id="btn-close-mail" style="width:auto;">关闭</button>
      </div>
      <div id="mail-list">加载中...</div>
    </div>
  </div>

  <script>
    var G_ID = '${c.env.GOOGLE_CLIENT_ID}';
    var M_ID = '${c.env.MS_CLIENT_ID}';

    document.getElementById('btn-login').addEventListener('click', function() {
      var pwd = document.getElementById('admin-pwd').value;
      fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) })
      .then(function(res) {
        if (res.ok) { document.getElementById('login-card').style.display = 'none'; document.getElementById('main-content').style.display = 'block'; loadAccounts(); }
        else { alert('密码错误'); }
      });
    });

    document.getElementById('btn-gmail-auth').addEventListener('click', function() {
      var redirectUri = window.location.origin + '/oauth/gmail/callback';
      var scope = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';
      var url = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + encodeURIComponent(G_ID) + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code&scope=' + encodeURIComponent(scope) + '&access_type=offline&prompt=consent';
      window.location.href = url;
    });

    document.getElementById('btn-ms-auth').addEventListener('click', function() {
      var redirectUri = window.location.origin + '/oauth/ms/callback';
      var scope = 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access User.Read';
      var url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=' + encodeURIComponent(M_ID) + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&response_type=code&scope=' + encodeURIComponent(scope);
      window.location.href = url;
    });

    document.getElementById('btn-save').addEventListener('click', function() {
      var body = { email: document.getElementById('email').value, imap_host: document.getElementById('imap_host').value, imap_port: parseInt(document.getElementById('imap_port').value), smtp_host: document.getElementById('smtp_host').value, smtp_port: parseInt(document.getElementById('smtp_port').value), password: document.getElementById('password').value };
      fetch('/api/accounts/imap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function(res) {
        if (res.ok) { alert('添加成功！'); loadAccounts(); }
        else { res.json().then(function(d) { alert('失败: ' + d.error); }); }
      });
    });

    document.getElementById('btn-close-mail').addEventListener('click', function() { document.getElementById('mail-list-card').style.display = 'none'; });

    document.getElementById('account-list').addEventListener('click', function(e) {
      var id = e.target.getAttribute('data-id');
      if (e.target.classList.contains('btn-del')) {
        if (confirm('确定删除吗？')) { fetch('/api/accounts/' + id, { method: 'DELETE' }).then(function() { loadAccounts(); }); }
      }
      if (e.target.classList.contains('btn-view')) {
        document.getElementById('mail-list-card').style.display = 'block';
        document.getElementById('mail-list-title').innerText = e.target.getAttribute('data-email') + ' 的收件箱';
        document.getElementById('mail-list').innerHTML = '正在拉取...';
        fetch('/api/accounts/' + id + '/messages').then(function(res) { return res.json(); }).then(function(data) {
            var list = document.getElementById('mail-list');
            if (data.error) { list.innerHTML = '<p style="color:red;">失败: ' + data.error + '</p>'; return; }
            if (!data || data.length === 0) { list.innerHTML = '<p style="color:#888;">没有邮件。</p>'; return; }
            var h = '';
            for (var i = 0; i < data.length; i++) { h += '<div class="msg-item"><div class="msg-subject">' + (data[i].subject || '(无主题)') + '</div><div class="msg-meta">' + (data[i].from || data[i].from_addr || '') + '</div></div>'; }
            list.innerHTML = h;
        });
      }
    });

    function loadAccounts() {
      fetch('/api/accounts').then(function(res) {
        if (res.status === 401) { document.getElementById('login-card').style.display = 'block'; document.getElementById('main-content').style.display = 'none'; return; }
        return res.json().then(function(accounts) {
          var list = document.getElementById('account-list');
          if (!accounts || accounts.length === 0) { list.innerHTML = '<p style="color:#888;">还没有添加任何邮箱。</p>'; return; }
          var h = '';
          for (var i = 0; i < accounts.length; i++) {
            h += '<div class="account-item"><span>' + accounts[i].email + ' (' + accounts[i].provider + ')</span><div>';
            h += '<button class="btn-view" data-id="' + accounts[i].id + '" data-email="' + accounts[i].email + '">查看</button> ';
            h += '<button class="btn-del" data-id="' + accounts[i].id + '">删除</button></div></div>';
          }
          list.innerHTML = h;
        });
      });
    }
  </script>
</body>
</html>
  `);
});

app.post('/api/login', async (c) => {
  const body = await c.req.json();
  if (body.password === c.env.ADMIN_PASSWORD) {
    const sessionId = crypto.randomUUID();
    await c.env.TOKEN_KV.put('session:' + sessionId, 'admin', { expirationTtl: 604800 });
    setCookie(c, 'session_id', sessionId, { path: '/', httpOnly: true, secure: true, maxAge: 604800, sameSite: 'Strict' });
    return c.json({ success: true });
  }
  return c.json({ success: false, error: '密码错误' }, 401);
});

app.post('/api/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id');
  if (sessionId) await c.env.TOKEN_KV.delete('session:' + sessionId);
  setCookie(c, 'session_id', '', { path: '/', maxAge: 0 });
  return c.json({ success: true });
});

app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/login' || c.req.path === '/api/logout') return await next();
  const sessionId = getCookie(c, 'session_id');
  if (!sessionId) return c.json({ error: '未登录' }, 401);
  const isValid = await c.env.TOKEN_KV.get('session:' + sessionId);
  if (isValid !== 'admin') return c.json({ error: '登录已过期，请重新登录' }, 401);
  await next();
});

app.delete('/api/accounts/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

app.get('/api/accounts', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, display_name, provider, enabled FROM accounts ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

app.post('/api/accounts/imap', async (c) => {
  const body = await c.req.json();
  
  // 1. 真实验证连接（核心修复！）
  try {
    const adapter = new ImapAdapter(body.imap_host, body.imap_port, body.smtp_host, body.smtp_port, body.email, body.password);
    await adapter.fetchInbox(1); // 尝试拉取1封邮件
  } catch (err: any) {
    return c.json({ error: '连接邮箱失败，请检查服务器地址、端口或授权码。原因: ' + err.message }, 400);
  }

  // 2. 验证通过才存库
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

app.get('/oauth/ms/callback', async (c) => {
  const code = c.req.query('code');
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    body: new URLSearchParams({
      code: code!, client_id: c.env.MS_CLIENT_ID, client_secret: c.env.MS_CLIENT_SECRET,
      redirect_uri: `${new URL(c.req.url).origin}/oauth/ms/callback`,
      grant_type: 'authorization_code',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access User.Read'
    }),
  });
  const data = await res.json() as any;
  const profile = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
  const profileData = await profile.json() as any;
  const email = profileData.mail || profileData.userPrincipalName;

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO accounts (id, email, provider, auth_type, oauth_refresh_token, created_at) VALUES (?, ?, 'outlook', 'oauth', ?, ?)`
  ).bind(id, email, data.refresh_token, Date.now()).run();
  return c.redirect('/');
});

export default app;
